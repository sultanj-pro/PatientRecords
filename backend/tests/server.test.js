const request = require('supertest');

jest.mock('mongoose');
jest.mock('fs');
const fs = require('fs');
const samplePatients = [
  {
    patientid: 31323,
    firstname: 'sephFirst',
    lastname: 'rrellLast',
    vitals: [
      { dateofobservation: '2014-05-17', vital_description: 'WEIGHT', value: '54.1250' }
    ]
  }
];
fs.readFileSync.mockImplementation((p, enc) => JSON.stringify(samplePatients));

// Mock mongoose and Patient model
const mongoose = require('mongoose');
const mockPatientModel = {
  find: jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue(samplePatients.map(p => ({ patientid: p.patientid, firstname: p.firstname, lastname: p.lastname })))
  }),
  findOne: jest.fn().mockImplementation(query => Promise.resolve(samplePatients.find(p => p.patientid === query.patientid))),
  countDocuments: jest.fn().mockResolvedValue(samplePatients.length),
  deleteMany: jest.fn().mockResolvedValue({}),
  insertMany: jest.fn().mockResolvedValue(samplePatients)
};

mongoose.model.mockReturnValue(mockPatientModel);
mongoose.connect.mockResolvedValue(undefined);

const app = require('../server');

describe('backend stub', () => {
  let token;
  test('health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('login returns token and role', async () => {
    const res = await request(app).post('/auth/login').send({ username: 'doc1' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.role).toBe('physician');
    token = res.body.accessToken;
  });

  test('list patients requires auth', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });

  test('list patients returns data', async () => {
    const res = await request(app).get('/api/patients').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('patientid');
  });

  test('get patient by id', async () => {
    const res = await request(app).get('/api/patients/31323').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('firstname', 'sephFirst');
  });

  test('get vitals', async () => {
    const res = await request(app).get('/api/patients/31323/vitals').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('vital_description', 'WEIGHT');
  });

  test('get visits (alias)', async () => {
    const res = await request(app).get('/api/patients/31323/visits').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('get meds (alias)', async () => {
    const res = await request(app).get('/api/patients/31323/meds').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('provider-options proxies to spark-service', async () => {
    // mock global.fetch
    const fake = { json: async () => ({ provider: 'delta-minio' }) };
    global.fetch = jest.fn().mockResolvedValue(fake);
    const res = await request(app).get('/api/provider-options').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('provider', 'delta-minio');
  });

  test('returns 404 for missing patient', async () => {
    mockPatientModel.findOne.mockResolvedValueOnce(null);
    const res = await request(app).get('/api/patients/99999').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  // POST endpoint tests
  test('create vital record', async () => {
    const mockPatient = {
      patientid: 31323,
      vitals: [],
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue({ vitals: [{ dateofobservation: '2024-01-22', vital_description: 'Blood Pressure' }] })
    };
    mockPatientModel.findOne.mockResolvedValueOnce(mockPatient);
    
    const res = await request(app)
      .post('/api/patients/31323/vitals')
      .set('Authorization', `Bearer ${token}`)
      .send({ dateofobservation: '2024-01-22', vital_description: 'Blood Pressure', value: '120/80', unit: 'mmHg' });
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('dateofobservation', '2024-01-22');
    expect(res.body).toHaveProperty('vital_description', 'Blood Pressure');
  });

  test('create vital record requires dateofobservation', async () => {
    const mockPatient = { patientid: 31323, vitals: [] };
    mockPatientModel.findOne.mockResolvedValueOnce(mockPatient);
    
    const res = await request(app)
      .post('/api/patients/31323/vitals')
      .set('Authorization', `Bearer ${token}`)
      .send({ vital_description: 'Blood Pressure' });
    
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('create vital record retires previous reading with same vital_description', async () => {
    const mockPatient = {
      patientid: 31323,
      vitals: [
        { dateofobservation: '2024-01-20', vital_description: 'Blood Pressure', value: '120/80', deletedAt: null },
        { dateofobservation: '2024-01-20', vital_description: 'Heart Rate', value: '72', deletedAt: null }
      ],
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue({})
    };
    mockPatientModel.findOne.mockResolvedValueOnce(mockPatient);
    
    const res = await request(app)
      .post('/api/patients/31323/vitals')
      .set('Authorization', `Bearer ${token}`)
      .send({ dateofobservation: '2024-01-22', vital_description: 'Blood Pressure', value: '130/85' });
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('value', '130/85');
    expect(mockPatient.vitals[0].deletedAt).toBeDefined();
    expect(mockPatient.vitals[1].deletedAt).toBeNull();
    expect(mockPatient.markModified).toHaveBeenCalledWith('vitals');
  });

  test('create vital record does not retire already-deleted readings', async () => {
    const mockPatient = {
      patientid: 31323,
      vitals: [
        { dateofobservation: '2024-01-19', vital_description: 'Blood Pressure', value: '110/70', deletedAt: new Date('2024-01-21') },
        { dateofobservation: '2024-01-20', vital_description: 'Blood Pressure', value: '120/80', deletedAt: null }
      ],
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue({})
    };
    mockPatientModel.findOne.mockResolvedValueOnce(mockPatient);
    
    const res = await request(app)
      .post('/api/patients/31323/vitals')
      .set('Authorization', `Bearer ${token}`)
      .send({ dateofobservation: '2024-01-22', vital_description: 'Blood Pressure', value: '130/85' });
    
    expect(res.status).toBe(201);
    expect(mockPatient.vitals[0].deletedAt).toEqual(new Date('2024-01-21'));
    expect(mockPatient.vitals[1].deletedAt).toBeDefined();
  });

  test('create lab record', async () => {
    const mockPatient = {
      patientid: 31323,
      labs: [],
      save: jest.fn().mockResolvedValue({ labs: [{ date: '2024-01-22', test_name: 'CBC' }] })
    };
    mockPatientModel.findOne.mockResolvedValueOnce(mockPatient);
    
    const res = await request(app)
      .post('/api/patients/31323/labs')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2024-01-22', test_name: 'CBC', result: 'Normal', unit: 'cells/µL' });
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('test_name', 'CBC');
  });

  test('create lab record requires test_name', async () => {
    const mockPatient = { patientid: 31323, labs: [] };
    mockPatientModel.findOne.mockResolvedValueOnce(mockPatient);
    
    const res = await request(app)
      .post('/api/patients/31323/labs')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2024-01-22' });
    
    expect(res.status).toBe(400);
  });

  test('create medication record', async () => {
    const mockPatient = {
      patientid: 31323,
      medications: [],
      save: jest.fn().mockResolvedValue({ medications: [{ name: 'Aspirin' }] })
    };
    mockPatientModel.findOne.mockResolvedValueOnce(mockPatient);
    
    const res = await request(app)
      .post('/api/patients/31323/medications')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Aspirin', dose: '100mg', frequency: 'daily' });
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('name', 'Aspirin');
  });

  test('create medication record requires name', async () => {
    const mockPatient = { patientid: 31323, medications: [] };
    mockPatientModel.findOne.mockResolvedValueOnce(mockPatient);
    
    const res = await request(app)
      .post('/api/patients/31323/medications')
      .set('Authorization', `Bearer ${token}`)
      .send({ dose: '100mg' });
    
    expect(res.status).toBe(400);
  });

  test('create visit record (clinic type)', async () => {
    const mockPatient = {
      patientid: 31323,
      visits: [],
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue({ visits: [{ date: '2024-01-22', visitType: 'clinic', reason: 'Checkup', provider_name: 'Dr. Smith' }] })
    };
    mockPatientModel.findOne.mockResolvedValueOnce(mockPatient);
    
    const res = await request(app)
      .post('/api/patients/31323/visits')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2024-01-22', visitType: 'clinic', reason: 'Checkup', provider_name: 'Dr. Smith' });
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('visitType', 'clinic');
  });

  test('create visit requires visitType', async () => {
    const mockPatient = { patientid: 31323, visits: [] };
    mockPatientModel.findOne.mockResolvedValueOnce(mockPatient);
    
    const res = await request(app)
      .post('/api/patients/31323/visits')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2024-01-22' });
    
    expect(res.status).toBe(400);
  });

  test('create visit record (hospital type)', async () => {
    const mockPatient = {
      patientid: 31323,
      visits: [],
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue({ visits: [{ date: '2024-01-22', visitType: 'hospital', reason: 'Procedure', facility_name: 'General Hospital' }] })
    };
    mockPatientModel.findOne.mockResolvedValueOnce(mockPatient);
    
    const res = await request(app)
      .post('/api/patients/31323/visits')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2024-01-22', visitType: 'hospital', reason: 'Procedure', facility_name: 'General Hospital' });
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('visitType', 'hospital');
  });

  test('create visit rejects invalid visitType', async () => {
    const mockPatient = { patientid: 31323, visits: [] };
    mockPatientModel.findOne.mockResolvedValueOnce(mockPatient);
    
    const res = await request(app)
      .post('/api/patients/31323/visits')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2024-01-22', visitType: 'invalid' });
    
    expect(res.status).toBe(400);
  });

  test('create vital for missing patient returns 404', async () => {
    mockPatientModel.findOne.mockResolvedValueOnce(null);
    
    const res = await request(app)
      .post('/api/patients/99999/vitals')
      .set('Authorization', `Bearer ${token}`)
      .send({ dateofobservation: '2024-01-22', vital_description: 'Blood Pressure' });
    
    expect(res.status).toBe(404);
  });

  test('get vitals filters out soft-deleted records', async () => {
    const mockPatient = {
      patientid: 31323,
      vitals: [
        { dateofobservation: '2024-01-20', vital_description: 'Blood Pressure', value: '120/80', deletedAt: null },
        { dateofobservation: '2024-01-21', vital_description: 'Temperature', value: '98.6', deletedAt: new Date('2024-01-22') },
        { dateofobservation: '2024-01-22', vital_description: 'Heart Rate', value: '72', deletedAt: null }
      ]
    };
    mockPatientModel.findOne.mockResolvedValueOnce(mockPatient);
    
    const res = await request(app)
      .get('/api/patients/31323/vitals')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.every(v => !v.deletedAt)).toBe(true);
  });

  test('get labs filters out soft-deleted records', async () => {
    const mockPatient = {
      patientid: 31323,
      labs: [
        { date: '2024-01-20', test_name: 'Blood Work', result: 'Normal', deletedAt: null },
        { date: '2024-01-21', test_name: 'Urinalysis', result: 'Normal', deletedAt: new Date('2024-01-22') }
      ]
    };
    mockPatientModel.findOne.mockResolvedValueOnce(mockPatient);
    
    const res = await request(app)
      .get('/api/patients/31323/labs')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].test_name).toBe('Blood Work');
  });

  test('get medications filters out soft-deleted records', async () => {
    const mockPatient = {
      patientid: 31323,
      medications: [
        { name: 'Aspirin', dose: '100mg', deletedAt: null },
        { name: 'Ibuprofen', dose: '200mg', deletedAt: new Date('2024-01-22') }
      ]
    };
    mockPatientModel.findOne.mockResolvedValueOnce(mockPatient);
    
    const res = await request(app)
      .get('/api/patients/31323/medications')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Aspirin');
  });

  test('get visits filters out soft-deleted records', async () => {
    const mockPatient = {
      patientid: 31323,
      visits: [
        { date: '2024-01-20', visitType: 'clinic', provider_name: 'Dr. Smith', deletedAt: null },
        { date: '2024-01-21', visitType: 'office', provider_name: 'Dr. Jones', deletedAt: new Date('2024-01-22') },
        { date: '2024-01-22', visitType: 'hospital', facility_name: 'General Hospital', deletedAt: null }
      ]
    };
    mockPatientModel.findOne.mockResolvedValueOnce(mockPatient);
    
    const res = await request(app)
      .get('/api/patients/31323/visits')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.every(v => !v.deletedAt)).toBe(true);
  });
});
