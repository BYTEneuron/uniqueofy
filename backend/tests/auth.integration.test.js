const request = require('supertest');
const bcrypt = require('bcryptjs');

const app = require('../src/app');
const Otp = require('../src/models/Otp');

const createOtpRecord = async (phone, otp) => {
  const otpHash = await bcrypt.hash(otp, 10);

  await Otp.create({
    phone,
    otpHash,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    attempts: 0,
    otpRequestCount: 1,
    firstRequestAt: new Date(),
    lastRequestAt: new Date(),
  });
};

describe('Auth Integration', () => {
  it('verify OTP login returns accessToken and user object', async () => {
    const phone = '9876543210';
    const otp = '654987';

    await createOtpRecord(phone, otp);

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone, otp });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data.user.phone).toBe(phone);
    expect(res.body.data.user.role).toBe('user');
  });

  it('invalid OTP returns 400', async () => {
    const phone = '9876543211';

    await createOtpRecord(phone, '654987');

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone, otp: '654321' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_OTP');
  });

  it('access protected route without token returns 401', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  describe('updateProfile validation', () => {
    let token;

    beforeEach(async () => {
      // Create user and get token
      const phone = '9998887770';
      await createOtpRecord(phone, '654987');
      const loginRes = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone, otp: '654987' });
      token = loginRes.body.data.accessToken;
    });

    it('valid firstName and lastName passes and updates successfully', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'John Doe', lastName: 'Smith' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe('John Doe'); // Formatted to match trim rules if any
      expect(res.body.data.lastName).toBe('Smith');
    });

    it('firstName with numbers is rejected with 400', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'John123', lastName: 'Smith' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('firstName with special characters is rejected with 400', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'John@!#', lastName: 'Smith' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('firstName that is empty is rejected with 400', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: '', lastName: 'Smith' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(res.body.message).toBe('First name is required');
    });

    it('lastName with leading spaces is handled (trimmed) or rejected', async () => {
      // Joi .trim() removes leading spaces automatically, 
      // but let's test a strictly invalid scenario like just spaces
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'John', lastName: '    ' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('both fields missing is rejected with 400', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });
  });
});
