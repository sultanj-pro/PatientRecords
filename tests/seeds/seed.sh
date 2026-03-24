#!/bin/bash
# PatientRecords Database Seeding Script
# This script seeds the MongoDB database with sample patient data
# Usage: ./seed.sh
# Requirements: docker-compose must be running (run 'docker-compose up -d' first)

echo ""
echo "========================================"
echo "PatientRecords Database Seeding"
echo "========================================"
echo ""

# Check if MongoDB is running
echo "Checking if MongoDB is running..."
docker inspect patientrecord-mongo >/dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "ERROR: MongoDB container is not running!"
    echo "Please start services first with: docker-compose up -d"
    exit 1
fi

echo "✓ MongoDB is running"
echo ""

# Run seeding using mongosh
echo "Seeding database with sample patient data..."
echo ""

docker exec -T patientrecord-mongo mongosh
// Sample patient data with labs, vitals, medications, and visits
db.patients.insertOne({
  patientid: 1,
  firstname: 'John',
  lastname: 'Smith',
  demographics: [
    { description: 'Date of Birth', value: '1965-03-15' },
    { description: 'Gender', value: 'Male' },
    { description: 'Blood Type', value: 'O+' }
  ],
  vitals: [
    { dateofobservation: '2026-02-20', observationcode: 'BP', vital_description: 'Blood Pressure', unit: 'mmHg', value: '120/80' },
    { dateofobservation: '2026-02-20', observationcode: 'HR', vital_description: 'Heart Rate', unit: 'bpm', value: '72' },
    { dateofobservation: '2026-02-20', observationcode: 'TEMP', vital_description: 'Temperature', unit: '°F', value: '98.6' }
  ],
  labs: [
    { date: '2026-02-15', test_name: 'Complete Blood Count', test_code: 'CBC', result: '4.5', unit: 'million cells/mcL', reference_range: '4.5-5.5' },
    { date: '2026-02-15', test_name: 'Hemoglobin', test_code: 'HGB', result: '14.2', unit: 'g/dL', reference_range: '13.5-17.5' },
    { date: '2026-02-10', test_name: 'Glucose', test_code: 'GLU', result: '95', unit: 'mg/dL', reference_range: '70-100' },
    { date: '2026-02-10', test_name: 'Total Cholesterol', test_code: 'CHOL', result: '185', unit: 'mg/dL', reference_range: '<200' }
  ],
  medications: [
    { startDate: '2026-01-01', name: 'Lisinopril', dose: '10mg', frequency: 'Once daily', indication: 'Hypertension' },
    { startDate: '2026-01-15', name: 'Atorvastatin', dose: '20mg', frequency: 'Once daily', indication: 'High cholesterol' }
  ],
  visits: [
    { date: '2026-02-20', visitType: 'clinic', reason: 'Annual checkup', notes: 'Patient in good health', provider_name: 'Dr. Johnson', facility_name: 'City Medical Center' },
    { date: '2026-01-10', visitType: 'office', reason: 'Follow-up', notes: 'BP monitoring', provider_name: 'Dr. Johnson', facility_name: 'Office' }
  ]
})

db.patients.insertOne({
  patientid: 2,
  firstname: 'Mary',
  lastname: 'Johnson',
  demographics: [
    { description: 'Date of Birth', value: '1972-07-22' },
    { description: 'Gender', value: 'Female' },
    { description: 'Blood Type', value: 'A+' }
  ],
  vitals: [
    { dateofobservation: '2026-02-18', observationcode: 'BP', vital_description: 'Blood Pressure', unit: 'mmHg', value: '118/76' },
    { dateofobservation: '2026-02-18', observationcode: 'HR', vital_description: 'Heart Rate', unit: 'bpm', value: '68' }
  ],
  labs: [
    { date: '2026-02-12', test_name: 'Thyroid Panel', test_code: 'TSH', result: '2.4', unit: 'mIU/L', reference_range: '0.4-4.0' }
  ],
  medications: [
    { startDate: '2025-06-01', name: 'Metformin', dose: '500mg', frequency: 'Twice daily', indication: 'Type 2 Diabetes' }
  ],
  visits: [
    { date: '2026-02-18', visitType: 'clinic', reason: 'Diabetes management', notes: 'A1c check needed', provider_name: 'Dr. Smith', facility_name: 'City Medical Center' }
  ]
})

db.patients.insertOne({
  patientid: 3,
  firstname: 'Robert',
  lastname: 'Williams',
  demographics: [
    { description: 'Date of Birth', value: '1958-11-05' },
    { description: 'Gender', value: 'Male' },
    { description: 'Blood Type', value: 'B+' }
  ],
  vitals: [
    { dateofobservation: '2026-02-16', observationcode: 'BP', vital_description: 'Blood Pressure', unit: 'mmHg', value: '135/85' },
    { dateofobservation: '2026-02-16', observationcode: 'HR', vital_description: 'Heart Rate', unit: 'bpm', value: '76' }
  ],
  labs: [
    { date: '2026-02-08', test_name: 'Lipid Panel', test_code: 'LIPID', result: 'Total: 240', unit: 'mg/dL', reference_range: '<200' }
  ],
  medications: [
    { startDate: '2024-03-01', name: 'Amlodipine', dose: '5mg', frequency: 'Once daily', indication: 'Hypertension' },
    { startDate: '2024-03-01', name: 'Aspirin', dose: '81mg', frequency: 'Once daily', indication: 'Cardiovascular protection' }
  ],
  visits: [
    { date: '2026-02-16', visitType: 'clinic', reason: 'Blood pressure check', notes: 'Slightly elevated, increase monitoring', provider_name: 'Dr. Green', facility_name: 'City Medical Center' },
    { date: '2025-12-10', visitType: 'hospital', reason: 'Routine hospitalization', notes: 'Planned procedure', provider_name: 'Dr. Green', facility_name: 'City Hospital' }
  ]
})

console.log('✓ Seeding complete! 3 sample patients with data inserted.')
"

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "✓ Seeding successful!"
    echo "========================================"
    echo ""
    echo "You can now access the application:"
    echo "  Shell App:    http://localhost:4200"
    echo "  API:          http://localhost:8001/api-docs"
    echo ""
else
    echo ""
    echo "ERROR: Seeding failed!"
    echo "Please check that MongoDB is running with: docker-compose ps"
    exit 1
fi
