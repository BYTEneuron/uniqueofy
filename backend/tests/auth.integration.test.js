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
    const otp = '123456';

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

    await createOtpRecord(phone, '123456');

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
});
