db.patients.updateOne(
  { patientid: 99999 },
  {
    $set: {
      vitals: [
        {
          date: new Date('2026-02-20T14:30:00Z'),
          temperature: 37.2,
          bpSystolic: 128,
          bpDiastolic: 82,
          heartRate: 72,
          respiratoryRate: 16,
          o2Saturation: 98,
          recordedAt: new Date('2026-02-20T14:30:00Z'),
          recordedBy: 'Nurse Johnson'
        },
        {
          date: new Date('2026-02-20T10:15:00Z'),
          temperature: 36.9,
          bpSystolic: 125,
          bpDiastolic: 80,
          heartRate: 68,
          respiratoryRate: 15,
          o2Saturation: 99,
          recordedAt: new Date('2026-02-20T10:15:00Z'),
          recordedBy: 'Nurse Smith'
        },
        {
          date: new Date('2026-02-19T15:45:00Z'),
          temperature: 37.0,
          bpSystolic: 130,
          bpDiastolic: 85,
          heartRate: 75,
          respiratoryRate: 17,
          o2Saturation: 98,
          recordedAt: new Date('2026-02-19T15:45:00Z'),
          recordedBy: 'Nurse Davis'
        },
        {
          date: new Date('2026-02-19T09:30:00Z'),
          temperature: 36.8,
          bpSystolic: 122,
          bpDiastolic: 78,
          heartRate: 70,
          respiratoryRate: 16,
          o2Saturation: 99,
          recordedAt: new Date('2026-02-19T09:30:00Z'),
          recordedBy: 'Nurse Brown'
        }
      ]
    }
  }
);
print('Vitals updated successfully');
