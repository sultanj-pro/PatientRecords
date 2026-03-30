-- PatientRecords PostgreSQL Schema
-- Migration: 001_initial_schema
-- Run once during first startup or via apply_migrations

CREATE TABLE IF NOT EXISTS patients (
  id          SERIAL PRIMARY KEY,
  patientid   INTEGER UNIQUE NOT NULL,
  firstname   TEXT,
  lastname    TEXT,
  demographics JSONB,
  allergies    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_patientid ON patients(patientid);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(lower(firstname), lower(lastname));

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS vitals (
  id                  SERIAL PRIMARY KEY,
  patient_id          INTEGER NOT NULL,
  vital_description   TEXT,
  data                JSONB NOT NULL,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_vitals_patient FOREIGN KEY (patient_id) REFERENCES patients(patientid)
);

CREATE INDEX IF NOT EXISTS idx_vitals_patient ON vitals(patient_id);

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS labs (
  id          SERIAL PRIMARY KEY,
  patient_id  INTEGER NOT NULL,
  data        JSONB NOT NULL,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_labs_patient FOREIGN KEY (patient_id) REFERENCES patients(patientid)
);

CREATE INDEX IF NOT EXISTS idx_labs_patient ON labs(patient_id);

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS medications (
  id          SERIAL PRIMARY KEY,
  patient_id  INTEGER NOT NULL,
  data        JSONB NOT NULL,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_medications_patient FOREIGN KEY (patient_id) REFERENCES patients(patientid)
);

CREATE INDEX IF NOT EXISTS idx_medications_patient ON medications(patient_id);

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS visits (
  id          SERIAL PRIMARY KEY,
  patient_id  INTEGER NOT NULL,
  data        JSONB NOT NULL,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_visits_patient FOREIGN KEY (patient_id) REFERENCES patients(patientid)
);

CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id);

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS care_team_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    INTEGER NOT NULL,
  name          TEXT,
  role          TEXT,
  specialty     TEXT,
  phone         TEXT,
  email         TEXT,
  organization  TEXT,
  start_date    TEXT,
  end_date      TEXT,
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_care_team_patient FOREIGN KEY (patient_id) REFERENCES patients(patientid)
);

CREATE INDEX IF NOT EXISTS idx_care_team_patient ON care_team_members(patient_id);

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS clinical_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    INTEGER NOT NULL,
  type          VARCHAR(20) NOT NULL DEFAULT 'general',
  content       TEXT NOT NULL,
  provider_id   TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  provider_role TEXT NOT NULL DEFAULT '',
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient ON clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_type ON clinical_notes(type);

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS registry (
  id       SERIAL PRIMARY KEY,
  modules  JSONB NOT NULL DEFAULT '[]'
);

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_recommendations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  TEXT NOT NULL,
  context     JSONB NOT NULL DEFAULT '{}',
  findings    JSONB NOT NULL DEFAULT '[]',
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dismissed')),
  llm_summary TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_patient ON ai_recommendations(patient_id);

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  TEXT NOT NULL,
  type        TEXT NOT NULL,
  severity    TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged')),
  event_type  TEXT,
  rule_id     TEXT,
  event_data  JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_patient ON notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_patient_rule ON notifications(patient_id, rule_id, created_at DESC);

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_audit_log (
  id             SERIAL PRIMARY KEY,
  stream_msg_id  TEXT UNIQUE NOT NULL,
  event_type     TEXT NOT NULL,
  patient_id     TEXT,
  payload        JSONB,
  processed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON ai_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_patient ON ai_audit_log(patient_id);
