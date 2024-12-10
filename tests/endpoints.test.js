import request from 'supertest';
import app from '../server';

describe('Basic Endpoints', () => {
  it('GET /status should return status 200 and alive message', async () => {
    const res = await request(app).get('/status');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ redis: true, db: true });
  });

  it('GET /stats should return database stats', async () => {
    const res = await request(app).get('/stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('users');
    expect(res.body).toHaveProperty('files');
  });
});

describe('User Endpoints', () => {
  let token;

  it('POST /users should create a new user', async () => {
    const res = await request(app).post('/users').send({
      email: 'test@test.com',
      password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('email', 'test@test.com');
  });

  it('GET /connect should authenticate a user', async () => {
    const res = await request(app)
      .get('/connect')
      .set('Authorization', 'Basic ' + Buffer.from('test@test.com:password123').toString('base64'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
  });

  it('GET /users/me should return user details', async () => {
    const res = await request(app).get('/users/me').set('X-Token', token);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('email', 'test@test.com');
  });
});

describe('File Endpoints', () => {
  let token;
  let fileId;

  beforeAll(async () => {
    const res = await request(app)
      .get('/connect')
      .set('Authorization', 'Basic ' + Buffer.from('test@test.com:password123').toString('base64'));
    token = res.body.token;
  });

  it('POST /files should create a file', async () => {
    const res = await request(app)
      .post('/files')
      .set('X-Token', token)
      .send({
        name: 'testFile.txt',
        type: 'file',
        isPublic: true,
        data: 'Hello, World!',
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    fileId = res.body.id;
  });

  it('GET /files/:id should retrieve file details', async () => {
    const res = await request(app).get(`/files/${fileId}`).set('X-Token', token);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'testFile.txt');
  });

  it('PUT /files/:id/publish should publish a file', async () => {
    const res = await request(app).put(`/files/${fileId}/publish`).set('X-Token', token);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('isPublic', true);
  });

  it('GET /files/:id/data should retrieve file data', async () => {
    const res = await request(app).get(`/files/${fileId}/data`);
    expect(res.status).toBe(200);
    expect(res.text).toBe('Hello, World!');
  });
});

it('GET /files should return paginated files', async () => {
  const res = await request(app).get('/files?page=0').set('X-Token', token);
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('files');
  expect(Array.isArray(res.body.files)).toBe(true);
});
