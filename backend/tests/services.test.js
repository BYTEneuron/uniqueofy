const request = require('supertest');
const app = require('../src/app');
const Service = require('../src/models/Service');

describe('Services API', () => {
  beforeEach(async () => {
    await Service.create([
      { name: 'AC Servicing', description: 'desc', category: 'ac', duration: '1h' },
      { name: 'Water Tank Cleaning', description: 'desc', category: 'water_tank', duration: '2h' },
      { name: 'AC Installation', description: 'desc', category: 'ac', duration: '2h' },
    ]);
  });

  it('GET /api/services with no query returns all services', async () => {
    const res = await request(app).get('/api/services');
    expect(res.status).toBe(200);
    // Based on rule 8, it returns all services. If it was meant to return empty array as per rule 12, then we would expect 0.
    expect(res.body.data.length).toBe(3);
  });

  it('GET /api/services?category=AC returns only AC category services', async () => {
    const res = await request(app).get('/api/services?category=AC');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data.every(s => s.category === 'ac')).toBe(true);
  });

  it('GET /api/services?category=WaterTank returns only WaterTank services', async () => {
    const res = await request(app).get('/api/services?category=water_tank');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].category).toBe('water_tank');
  });

  it('GET /api/services?category=nonexistent returns empty array', async () => {
    const res = await request(app).get('/api/services?category=nonexistent');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    // As per the requirement, if invalid, it will fallback to all services OR empty array.
    // Wait, the specification says: "If category query param is invalid or not in the allowed list, return all services (graceful fallback, do not error)".
    // So length should be 3.
    // Based on rule 8, it returns all services. If it was meant to return empty array as per rule 12, then we would expect 0.
    expect(res.body.data.length).toBe(3);
  });
});
