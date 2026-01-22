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

  test('create physician visit record', async () => {
    const mockPatient = {
      patientid: 31323,
      physician_visits: [],
      save: jest.fn().mockResolvedValue({ physician_visits: [{ date: '2024-01-22', clinic: 'General' }] })
    };
    mockPatientModel.findOne.mockResolvedValueOnce(mockPatient);
    
    const res = await request(app)
      .post('/api/patients/31323/physician-visits')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2024-01-22', clinic: 'General', reason: 'Checkup' });
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('clinic', 'General');
  });

  test('create physician visit requires clinic', async () => {
    const mockPatient = { patientid: 31323, physician_visits: [] };
    mockPatientModel.findOne.mockResolvedValueOnce(mockPatient);
    
    const res = await request(app)
      .post('/api/patients/31323/physician-visits')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2024-01-22' });
    
    expect(res.status).toBe(400);
  });

  test('create hospital visit record', async () => {
    const mockPatient = {
      patientid: 31323,
      hospital_visits: [],
      save: jest.fn().mockResolvedValue({ hospital_visits: [{ date: '2024-01-22', facility: 'General Hospital' }] })
    };
    mockPatientModel.findOne.mockResolvedValueOnce(mockPatient);
    
    const res = await request(app)
      .post('/api/patients/31323/hospital-visits')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2024-01-22', facility: 'General Hospital', reason: 'Procedure' });
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('facility', 'General Hospital');
  });

  test('create hospital visit requires facility', async () => {
    const mockPatient = { patientid: 31323, hospital_visits: [] };
    mockPatientModel.findOne.mockResolvedValueOnce(mockPatient);
    
    const res = await request(app)
      .post('/api/patients/31323/hospital-visits')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2024-01-22' });
    
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
});
