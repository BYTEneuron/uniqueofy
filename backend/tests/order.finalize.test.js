const mongoose = require('mongoose');
const request = require('supertest');

const app = require('../src/app');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const { generateAccessToken } = require('../src/utils/token');
const { ORDER_STATUS } = require('../src/domain/orderStatusPolicy');

const randomPhone = () => String(Math.floor(1000000000 + Math.random() * 9000000000));

const createUserWithToken = async (role = 'user') => {
  const user = await User.create({
    phone: randomPhone(),
    role,
    firstName: 'Test',
    lastName: role,
  });

  return {
    user,
    token: generateAccessToken(user),
  };
};

const createOrder = async ({ userId, status = ORDER_STATUS.PENDING_REVIEW, isAmountFinalized = false, finalAmount = null }) => {
  return Order.create({
    user: userId,
    services: [
      {
        serviceId: new mongoose.Types.ObjectId(),
        name: 'Water Tank Cleaning',
        quantity: 1,
      },
    ],
    serviceDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
    timeSlot: '14:00-16:00',
    address: 'Baker Street',
    status,
    isAmountFinalized,
    finalAmount,
  });
};

describe('Finalize Quote Route', () => {
  it('admin can finalize quote', async () => {
    const { user } = await createUserWithToken('user');
    const { token: adminToken } = await createUserWithToken('admin');
    const order = await createOrder({ userId: user._id, status: ORDER_STATUS.PENDING_REVIEW });

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/finalize`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ finalAmount: 1500 });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.finalAmount).toBe(1500);
    expect(res.body.data.isAmountFinalized).toBe(true);
    expect(res.body.data.status).toBe(ORDER_STATUS.QUOTE_FINALIZED);
  });

  it('cannot finalize cancelled order', async () => {
    const { user } = await createUserWithToken('user');
    const { token: adminToken } = await createUserWithToken('admin');
    const order = await createOrder({ userId: user._id, status: ORDER_STATUS.CANCELLED });

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/finalize`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ finalAmount: 900 });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('cannot finalize already finalized order', async () => {
    const { user } = await createUserWithToken('user');
    const { token: adminToken } = await createUserWithToken('admin');
    const order = await createOrder({
      userId: user._id,
      status: ORDER_STATUS.QUOTE_FINALIZED,
      isAmountFinalized: true,
      finalAmount: 1200,
    });

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/finalize`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ finalAmount: 1300 });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('cannot finalize with negative amount', async () => {
    const { user } = await createUserWithToken('user');
    const { token: adminToken } = await createUserWithToken('admin');
    const order = await createOrder({ userId: user._id, status: ORDER_STATUS.PENDING_REVIEW });

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/finalize`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ finalAmount: -100 });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('BAD_REQUEST');
  });
});
