'use strict';

const { MongoClient } = require('mongodb');
const { Client } = require('pg');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://admin:admin@patientrecord-mongo:27017/patientrecords?authSource=admin';
const PG_URL    = process.env.DATABASE_URL  || 'postgresql://admin:admin@patientrecord-postgres:5432/patientrecords';

async function main() {
  const mongo = new MongoClient(MONGO_URI);
  const pg    = new Client({ connectionString: PG_URL });

  await mongo.connect();
  await pg.connect();
  console.log('Connected to both databases.');

  const db = mongo.db('patientrecords');

  // ── Patients + embedded arrays ──────────────────────────────────────────────
  const patients = await db.collection('patients').find({}).toArray();
  console.log(`Migrating ${patients.length} patients...`);

  for (const p of patients) {
    const pid = p.patientid;

    await pg.query(
      `INSERT INTO patients (patientid, firstname, lastname, demographics, allergies)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (patientid) DO UPDATE
         SET firstname=EXCLUDED.firstname, lastname=EXCLUDED.lastname,
             demographics=EXCLUDED.demographics, allergies=EXCLUDED.allergies`,
      [pid, p.firstname||'', p.lastname||'',
       JSON.stringify(p.demographics||{}), JSON.stringify(p.allergies||[])]
    );

    // vitals
    for (const v of (p.vitals||[])) {
      await pg.query(
        `INSERT INTO vitals (patient_id, vital_description, data, deleted_at)
         VALUES ($1,$2,$3,$4)`,
        [pid, v.vital_description||null, JSON.stringify(v), v.deletedAt||null]
      );
    }

    // labs
    for (const l of (p.labs||[])) {
      await pg.query(
        `INSERT INTO labs (patient_id, data, deleted_at) VALUES ($1,$2,$3)`,
        [pid, JSON.stringify(l), l.deletedAt||null]
      );
    }

    // medications
    for (const m of (p.medications||[])) {
      await pg.query(
        `INSERT INTO medications (patient_id, data, deleted_at) VALUES ($1,$2,$3)`,
        [pid, JSON.stringify(m), m.deletedAt||null]
      );
    }

    // visits
    for (const v of (p.visits||[])) {
      await pg.query(
        `INSERT INTO visits (patient_id, data, deleted_at) VALUES ($1,$2,$3)`,
        [pid, JSON.stringify(v), v.deletedAt||null]
      );
    }

    // care team
    for (const m of (p.careTeam||[])) {
      await pg.query(
        `INSERT INTO care_team_members
           (patient_id, name, role, specialty, phone, email, organization,
            start_date, end_date, is_primary, deleted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [pid, m.name||null, m.role||null, m.specialty||null,
         m.phone||null, m.email||null, m.organization||null,
         m.startDate||null, m.endDate||null,
         m.isPrimary ? true : false,
         m.deletedAt||null]
      );
    }

    console.log(`  patient ${pid} (${p.firstname} ${p.lastname}): ` +
      `${(p.vitals||[]).length} vitals, ${(p.labs||[]).length} labs, ` +
      `${(p.medications||[]).length} meds, ${(p.visits||[]).length} visits, ` +
      `${(p.careTeam||[]).length} care team`);
  }

  // ── Clinical notes (separate collection) ────────────────────────────────────
  const notes = await db.collection('clinical_notes').find({}).toArray();
  console.log(`Migrating ${notes.length} clinical notes...`);

  for (const n of notes) {
    await pg.query(
      `INSERT INTO clinical_notes
         (patient_id, type, content, provider_id, provider_name, provider_role,
          deleted_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT DO NOTHING`,
      [n.patientId, n.type||'general', n.content,
       n.providerId, n.providerName, n.providerRole||'',
       n.deletedAt||null,
       n.createdAt||new Date(), n.updatedAt||n.createdAt||new Date()]
    );
  }

  console.log('Migration complete!');
  await mongo.close();
  await pg.end();
}

main().catch(err => { console.error(err.message); process.exit(1); });
