const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DB_HOST = process.env.DB_HOST || process.env.POSTGRES_HOST || process.env.PGHOST || 'postgres';
const DB_PORT = process.env.DB_PORT || process.env.POSTGRES_PORT || process.env.PGPORT || 5432;
const DB_NAME = process.env.DB_NAME || process.env.POSTGRES_DB || process.env.PGDATABASE || process.env.JDBC_DB || 'patientrecords';
const DB_USER = process.env.DB_USER || process.env.POSTGRES_USER || process.env.PGUSER || process.env.JDBC_USER || 'pr_user';
const DB_PASSWORD = process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD || process.env.JDBC_PASSWORD || 'pr_pass';

async function applySql(client, sql) {
  // run a multi-statement SQL
  await client.query(sql);
}

async function runMigrations(client) {
  // Look for migrations in mounted /migrations or bundled ./migrations
  const candidates = ['/migrations', path.resolve(__dirname, '..', 'migrations')];
  let found = null;
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.lstatSync(c).isDirectory()) { found = c; break; }
  }
  if (!found) {
    console.log('No migrations directory found; skipping migrations');
    return;
  }

  const files = fs.readdirSync(found).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    const fp = path.join(found, f);
    console.log('Applying migration', fp);
    const sql = fs.readFileSync(fp, 'utf8');
    await applySql(client, sql);
  }
}

async function seedFromJson(client) {
  // Expect data at /data/patient-vitals-hierarchical.json
  const candidate = '/data/patient-vitals-hierarchical.json';
  if (!fs.existsSync(candidate)) { console.log('No sample data file found at', candidate); return; }
  const raw = fs.readFileSync(candidate, 'utf8');
  let patients = [];
  try { patients = JSON.parse(raw); } catch (err) { console.error('invalid sample json', err); return; }

  for (const p of patients) {
    // insert patient
    const externalId = p.patientid || p.id || null;
    const firstname = p.firstname || p.given_name || null;
    const lastname = p.lastname || p.family_name || null;
    const dob = p.dateofbirth || p.dob || null;
    const gender = p.sex || p.gender || null;

    const res = await client.query(
      'INSERT INTO patients(external_id, given_name, family_name, dob, gender, metadata) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
      [String(externalId || ''), firstname, lastname, dob || null, gender, p]
    );
    const pid = res.rows[0].id;

    // vitals
    const vitals = p.vitals || [];
    for (const v of vitals) {
      const recorded = v.dateofobservation || v.recorded_at || v.recorded || null;
      const vitalType = v.vital_description || v.vital_type || v.observationcode || null;
      const value = v.observationvalue || v.value || null;
      const unit = v.observationunits || v.units || null;
      await client.query(
        'INSERT INTO vitals(patient_id, vital_type, value, unit, recorded_at, metadata) VALUES($1,$2,$3,$4,$5,$6)',
        [pid, vitalType, value, unit, recorded || null, v]
      );
    }

    // medications
    const meds = p.medications || p.meds || [];
    for (const m of meds) {
      await client.query(
        'INSERT INTO medications(patient_id, med_name, dose, route, started_at, stopped_at, metadata) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [pid, m.medication || m.med_name || m.name || null, m.dose || null, m.route || null, m.startdate || m.started_at || null, m.stopped || m.stopped_at || null, m]
      );
    }

    // visits
    const phys = p.physician_visits || [];
    const hosp = p.hospital_visits || [];
    for (const v of phys.concat(hosp)) {
      await client.query(
        'INSERT INTO visits(patient_id, visit_type, start_time, end_time, location, provider, metadata) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [pid, v.type || v.visit_type || null, v.start_time || v.admissiondate || null, v.end_time || v.discharge || null, v.location || null, v.provider || null, v]
      );
    }

    // labs
    const labs = p.labs || [];
    for (const l of labs) {
      await client.query(
        'INSERT INTO labs(patient_id, test_name, result, units, collected_at, metadata) VALUES($1,$2,$3,$4,$5,$6)',
        [pid, l.test_name || l.name || null, l.result || null, l.units || null, l.collected_at || null, l]
      );
    }
  }
}

async function main() {
  console.log('DB init using', { DB_HOST, DB_PORT, DB_NAME, DB_USER });
  const client = new Client({ host: DB_HOST, port: DB_PORT, database: DB_NAME, user: DB_USER, password: DB_PASSWORD });
  try {
    await client.connect();
  } catch (err) {
    console.error('Failed to connect to DB:', err.message);
    process.exit(1);
  }

  try {
    // check for patients table
    const chk = await client.query("SELECT to_regclass('public.patients') as tbl");
    if (!chk.rows[0].tbl) {
      console.log('No patients table found; running migrations');
      await runMigrations(client);
      console.log('Migrations applied');
      try { await seedFromJson(client); console.log('Seeding complete'); } catch (e) { console.error('Seed error', e); }
    } else {
      console.log('patients table exists; skipping migrations');
    }
  } catch (err) {
    console.error('Error during migration/seed:', err);
  } finally {
    await client.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
