/**
 * seed-clinical-notes.js
 * Seeds realistic clinical notes for testing via the clinical-notes-service API.
 * Usage: node scripts/seed-clinical-notes.js
 */

const http = require('http');

const API_BASE = 'http://localhost:5000';

// ── Helpers ──────────────────────────────────────────────────────────────────

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function login(username, password) {
  const r = await request('POST', '/api/auth/login', { username, password });
  if (!r.body.accessToken) throw new Error(`Login failed for ${username}: ${JSON.stringify(r.body)}`);
  return r.body.accessToken;
}

async function postNote(token, patientId, type, content) {
  const r = await request('POST', `/api/patients/${patientId}/notes`, { type, content }, token);
  if (r.status !== 201) throw new Error(`Failed to post note (${r.status}): ${JSON.stringify(r.body)}`);
  return r.body;
}

// ── Clinical note data ───────────────────────────────────────────────────────

// Provider 1: physician (Dr. Patel)
// Provider 2: nurse (Marcus Webb)
// Provider 3: admin / pharmacist (admin) — acts as attending physician

const NOTES = [
  // ── Sarah Mitchell (20001) — Hypertension + Diabetes management ──────────
  {
    patientId: 20001,
    provider: 'physician',
    type: 'observation',
    content: `Patient Sarah Mitchell presents for routine follow-up. BP today 148/94 mmHg — elevated vs. last visit (138/88). Heart rate 78 bpm, regular rhythm. Weight 84.2 kg (+1.4 kg over 3 months). No peripheral oedema. Complains of occasional morning headaches over the past 2 weeks which she attributes to stress. Adherence to amlodipine reported as good; lisinopril occasionally missed on weekends. Fundoscopic exam deferred — due for annual ophthalmology referral.`,
  },
  {
    patientId: 20001,
    provider: 'physician',
    type: 'diagnostic',
    content: `HbA1c result received: 8.2% (up from 7.6% six months ago). Fasting glucose 9.4 mmol/L. Lipid panel: LDL 3.1 mmol/L, HDL 1.0 mmol/L, Triglycerides 2.3 mmol/L. eGFR 61 mL/min/1.73m² — mild reduction, CKD Stage G2. Urine ACR 38 mg/g — microalbuminuria confirmed. Assessment: Poorly controlled T2DM with early diabetic nephropathy; uncontrolled hypertension likely contributing to renal decline.`,
  },
  {
    patientId: 20001,
    provider: 'physician',
    type: 'plan',
    content: `1. Increase lisinopril from 10 mg to 20 mg OD — counsel patient on importance of daily adherence for renal protection.\n2. Intensify diabetes management: add empagliflozin 10 mg OD (SGLT2i — also provides renal + cardiovascular benefit). Educate on genital hygiene and signs of DKA.\n3. Repeat HbA1c and renal function panel in 3 months.\n4. Dietary referral: low-sodium, low-GI diet. Target sodium <2g/day.\n5. Schedule ophthalmology referral for diabetic retinopathy screening.\n6. Patient counselled on self-monitoring of BP at home — target <130/80 mmHg.`,
  },
  {
    patientId: 20001,
    provider: 'nurse',
    type: 'observation',
    content: `Pre-consultation vitals recorded: BP 148/94 mmHg (right arm, seated, after 5 min rest), SpO₂ 98% on room air, HR 78 bpm, Temp 36.7°C, RR 16. Patient reports compliance with metformin 1g BD but admits to dietary indiscretions over the holiday period. Education provided on blood glucose impact of refined carbohydrates. Patient expressed concern about new medication costs — flagged for social worker referral re: medication assistance programme.`,
  },
  {
    patientId: 20001,
    provider: 'physician',
    type: 'prognosis',
    content: `With optimised antihypertensive therapy and addition of SGLT2 inhibitor, prognosis for slowing CKD progression is reasonably good provided patient achieves HbA1c <7% and BP <130/80. Current trajectory without intervention would estimate CKD progression to Stage G3 within 3–5 years. Cardiovascular risk at 10 years (Framingham) estimated at 18% — moderate-high. Statin initiation to be reconsidered at next visit if LDL remains >2.6 mmol/L.`,
  },

  // ── John Anderson (20002) — Post-MI recovery ─────────────────────────────
  {
    patientId: 20002,
    provider: 'physician',
    type: 'observation',
    content: `John Anderson, 6-week post-STEMI follow-up (anterior MI, PCI to LAD with DES, 03 Feb 2026). Patient denies chest pain, dyspnoea at rest, or palpitations. Tolerating bisoprolol 5 mg and atorvastatin 80 mg without side effects. Mild fatigue on exertion (2 flights of stairs) — improving compared to 2-week visit. Bilateral lung fields clear. No raised JVP. Heart sounds: normal S1/S2, no murmurs. BP 118/72 mmHg. HR 58 bpm (rate-controlled). Wound at radial cath site fully healed.`,
  },
  {
    patientId: 20002,
    provider: 'physician',
    type: 'diagnostic',
    content: `Echo report (2 weeks post-MI): EF 42% (reduced from estimated normal). Regional wall motion abnormality anterior wall consistent with LAD territory infarct. Mild MR. LV not significantly dilated. No pericardial effusion.\n\nLipids post-statin (4 weeks): LDL 1.4 mmol/L — at target. CK normal — no statin myopathy. BNP 310 pg/mL — mildly elevated, monitoring for HFrEF.\n\nECG: Sinus bradycardia 58 bpm. Evolved Q-waves V1-V4. No acute ischaemic changes.`,
  },
  {
    patientId: 20002,
    provider: 'physician',
    type: 'plan',
    content: `1. Continue dual antiplatelet therapy: aspirin 75 mg + ticagrelor 90 mg BD — DO NOT stop — stent thrombosis risk. Duration: 12 months minimum (review at 12-month mark).\n2. Continue bisoprolol 5 mg OD — uptitrate to 10 mg at next visit if HR and BP permit.\n3. Add ramipril 2.5 mg OD for LV remodelling (EF 42%) — uptitrate as tolerated.\n4. Cardiac rehabilitation referral confirmed — patient enrolled in Phase 2 programme starting 31 Mar 2026.\n5. Repeat echo in 3 months to reassess EF.\n6. Driving restriction: may not drive for 4 weeks post-discharge (already served). Cleared to resume.\n7. Return to light work (desk job) discussed — cleared from next Monday.`,
  },
  {
    patientId: 20002,
    provider: 'nurse',
    type: 'observation',
    content: `Patient attended cardiac nurse follow-up. Completed Edinburgh Cardiac Rehabilitation Readiness questionnaire — low anxiety score. BP 118/72, HR 58. Weight 91 kg (stable). Patient reports wife has been monitoring BP at home daily — readings consistently 110-120/70-75. Medication compliance excellent — pill organiser in use. Patient asked about return to sexual activity — counselled per post-MI guidelines (equivalent to climbing 2 flights of stairs; when comfortable). Written information sheet provided.`,
  },
  {
    patientId: 20002,
    provider: 'physician',
    type: 'prognosis',
    content: `Prognosis post-anterior STEMI with EF 42% is guarded but improving. With full GDMT (beta-blocker, ACEi, statin, DAPT) and cardiac rehab, EF recovery to 50%+ is achievable in 30-40% of patients at 3 months. Mortality risk at 1 year estimated 4-6% given current treatment adherence. Main risks: stent thrombosis if DAPT discontinued prematurely, progressive HFrEF if EF does not recover, and ventricular arrhythmia in the periinfarct period — patient counselled on warning symptoms (palpitations, pre-syncope).`,
  },

  // ── Emily Rodriguez (20003) — Asthma + Anxiety ───────────────────────────
  {
    patientId: 20003,
    provider: 'physician',
    type: 'observation',
    content: `Emily Rodriguez, 28F, presenting with worsening asthma control. Reports using reliever inhaler (salbutamol) 4-5 times per week over the past month — up from 1-2 times. Nocturnal symptoms 2 nights/week. No acute wheeze today. Peak flow 78% predicted. Chest auscultation: mild end-expiratory wheeze bilateral bases. Triggers identified: cold air and cats (new pet at home). No recent URTI. ACT score: 15 (not well controlled). Currently on Clenil 100 mcg BD — technique reviewed and corrected (was not exhaling fully before inhalation). No oral steroid courses in past 6 months.`,
  },
  {
    patientId: 20003,
    provider: 'physician',
    type: 'diagnostic',
    content: `Spirometry performed today: FEV1/FVC 0.68 (mildly obstructed). Post-bronchodilator FEV1 improved by 14% — consistent with reversible airflow obstruction. FeNO: 38 ppb — elevated, suggesting eosinophilic airway inflammation. Total IgE 240 IU/mL, elevated. Skin prick test positive for cat dander (++), dust mite (++), grass pollen (+). CXR clear — no consolidation or hyperinflation. Diagnosis: Partly controlled persistent asthma with allergic (atopic) phenotype.`,
  },
  {
    patientId: 20003,
    provider: 'physician',
    type: 'plan',
    content: `1. Step up inhaled therapy: switch from Clenil 100 mcg BD to Symbicort MART 200/6 mcg (budesonide/formoterol) — use as both maintenance and reliever. Educate on MART regimen.\n2. Add montelukast 10 mg nocte for allergic component.\n3. Allergen avoidance counselling: HEPA filter for bedroom, wash bedding at 60°C weekly. Regarding cat — cannot recommend removal but advise keeping out of bedroom.\n4. Issue written Asthma Action Plan.\n5. Refer to respiratory nurse for education and inhaler technique reassessment in 4 weeks.\n6. Discuss anxiety component at next visit — GAD-7 score 11 at last review; consider CBT referral if not improving.`,
  },
  {
    patientId: 20003,
    provider: 'nurse',
    type: 'observation',
    content: `Pre-clinic observations: SpO2 97% RA, RR 18, HR 94 bpm, BP 108/68, Temp 36.5°C. PHQ-9 completed in waiting room: score 8 (mild depression). GAD-7: 12 (moderate anxiety). Patient disclosed increased work stress and difficulty sleeping — waking around 3 AM with "racing thoughts." Sleep hygiene advice provided. Inhaler technique assessed: spacer use demonstrated and patient able to demonstrate correct technique by end of session. Peak flow diary given — instructed to record morning and evening for 2 weeks.`,
  },
  {
    patientId: 20003,
    provider: 'physician',
    type: 'general',
    content: `Telephone consultation 15 Mar 2026: Patient called re: Symbicort — concerned about "shaky hands" after first morning dose. Advised this is a known formoterol effect (beta-2 agonist tremor), usually resolves within 1-2 weeks. Reminded to use lowest effective number of actuations. If side effect persists or worsens, to call back and we will reassess. No other concerns raised. Documented for record.`,
  },

  // ── Michael Thompson (20004) — COPD exacerbation ─────────────────────────
  {
    patientId: 20004,
    provider: 'physician',
    type: 'observation',
    content: `Michael Thompson, 67M, admitted via ED with acute exacerbation of COPD. 3-day history of increasing dyspnoea, productive cough with yellow-green sputum, and reduced exercise tolerance. On admission: RR 26, SpO₂ 84% on room air (improved to 92% on 2L O₂ via nasal cannula). Mild accessory muscle use. Bilateral coarse crackles, prolonged expiratory phase. Alert and orientated. Previous COPD: GOLD Grade 3 (FEV1 38% predicted). On tiotropium 18 mcg OD, Symbicort 400/12 mcg BD. 20 pack-year smoking history — quit 4 years ago.`,
  },
  {
    patientId: 20004,
    provider: 'physician',
    type: 'diagnostic',
    content: `ABGs on 2L O₂: pH 7.32, PaCO₂ 6.8 kPa, PaO₂ 8.6 kPa, HCO₃ 26 — Type 2 respiratory failure with partial compensation. CXR: hyperinflation, no consolidation, no pneumothorax. WCC 14.2 × 10⁹/L (neutrophilia). CRP 87 mg/L. Sputum MCS sent — pending. ECG: sinus tachycardia 112 bpm, P-pulmonale, no acute ischaemia. Chest CT not indicated at this stage. Assessment: Infective exacerbation of COPD (likely bacterial given purulent sputum and raised inflammatory markers).`,
  },
  {
    patientId: 20004,
    provider: 'physician',
    type: 'plan',
    content: `Acute management:\n1. Controlled O₂ therapy — titrate to SpO₂ 88-92% (CO₂ retainer).\n2. Nebulised salbutamol 2.5 mg Q4H + ipratropium 500 mcg Q6H.\n3. Prednisolone 30 mg OD for 5 days.\n4. Co-amoxiclav 625 mg TDS for 5 days (empirical — pending sputum).\n5. Chest physio referral — active cycle of breathing technique.\n6. DVT prophylaxis: enoxaparin 40 mg SC OD (immobile patient).\n7. Consider NIV (BiPAP) if pH drops below 7.28 or clinical deterioration.\n8. Smoking cessation reinforcement — Quitline leaflet given despite current non-smoker status (family members smoke at home).`,
  },
  {
    patientId: 20004,
    provider: 'nurse',
    type: 'observation',
    content: `Day 2 inpatient nursing note: Patient more comfortable overnight. SpO₂ 91% on 1.5L O₂. RR down to 20. Able to speak in full sentences. Productive cough — thick yellow sputum. Oral intake improved — full breakfast consumed. Nebulisers administered as charted, no adverse reactions. Patient using incentive spirometer hourly as instructed. Mild ankle swelling noted bilaterally — documented, team informed. Enoxaparin administered SC right abdomen at 0800. Patient reports improved sleep compared to ED.`,
  },
  {
    patientId: 20004,
    provider: 'physician',
    type: 'prognosis',
    content: `Prognosis for this admission is cautiously optimistic — patient responding to treatment at 24 hours. However, GOLD Grade 3 COPD with type 2 respiratory failure carries significant long-term morbidity. 1-year re-admission risk post-exacerbation approximately 50%. Roflumilast should be considered at discharge (FEV1 <50%, chronic bronchitis phenotype, ≥2 exacerbations/year). Pulmonary rehabilitation referral essential post-discharge. Advance care planning discussion deferred to outpatient appointment given acute setting — flagged on problem list.`,
  },
];

// ── Provider credentials ─────────────────────────────────────────────────────

const PROVIDERS = {
  physician: { username: 'physician1', password: 'physician123' },
  nurse:     { username: 'nurse1',     password: 'nurse123'     },
  admin:     { username: 'admin',      password: 'admin123'     },
};

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔐 Logging in with provider credentials…');

  // Try each provider; fall back to admin if dedicated account doesn't exist
  const tokens = {};
  for (const [role, creds] of Object.entries(PROVIDERS)) {
    try {
      tokens[role] = await login(creds.username, creds.password);
      console.log(`   ✓ ${role} (${creds.username})`);
    } catch {
      console.log(`   ⚠  ${creds.username} not found — will use admin token for ${role}`);
    }
  }

  // Ensure admin token exists
  if (!tokens.admin) {
    throw new Error('Cannot login as admin — aborting.');
  }
  if (!tokens.physician) tokens.physician = tokens.admin;
  if (!tokens.nurse)     tokens.nurse     = tokens.admin;

  console.log('\n📝 Seeding clinical notes…\n');
  let ok = 0;
  let fail = 0;

  for (const note of NOTES) {
    const token = tokens[note.provider];
    const label = `Patient ${note.patientId} [${note.type}]`;
    try {
      await postNote(token, note.patientId, note.type, note.content);
      console.log(`   ✓ ${label}`);
      ok++;
    } catch (err) {
      console.error(`   ✗ ${label}: ${err.message}`);
      fail++;
    }
    // Small delay to avoid hammering the service
    await new Promise(r => setTimeout(r, 120));
  }

  console.log(`\n✅ Done — ${ok} notes created, ${fail} failed.`);
}

main().catch(err => { console.error(err); process.exit(1); });
