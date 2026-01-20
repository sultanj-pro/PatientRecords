-- Initial schema for PatientRecords (minimal tables)
-- Run against the `patientrecords` database.

-- Patients
CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  external_id TEXT UNIQUE,
  given_name TEXT,
  family_name TEXT,
  dob DATE,
  gender TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Vitals
CREATE TABLE IF NOT EXISTS vitals (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  vital_type TEXT NOT NULL,
  value TEXT NOT NULL,
  unit TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB
);

-- Medications
CREATE TABLE IF NOT EXISTS medications (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  med_name TEXT NOT NULL,
  dose TEXT,
  route TEXT,
  started_at DATE,
  stopped_at DATE,
  metadata JSONB
);

-- Visits (physician/hospital)
CREATE TABLE IF NOT EXISTS visits (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_type TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  location TEXT,
  provider TEXT,
  metadata JSONB
);

-- Labs
CREATE TABLE IF NOT EXISTS labs (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  result TEXT,
  units TEXT,
  collected_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_patients_external_id ON patients(external_id);
CREATE INDEX IF NOT EXISTS idx_vitals_patient_recorded ON vitals(patient_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_visits_patient_start ON visits(patient_id, start_time);
