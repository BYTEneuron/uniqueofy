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
    lastName: 'User',
  });

  return {
    user,
    token: generateAccessToken(user),
  };
};

const createOrder = async ({ userId, status = 'pending_review' }) => {
  return Order.create({
    user: userId,
    services: [
      {
        serviceId: new mongoose.Types.ObjectId(),
        name: 'AC Service',
        quantity: 1,
      },
    ],
    serviceDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    timeSlot: '10:00-12:00',
    address: '221B Baker Street',
    status,
  });
};

describe('Order Cancel Route', () => {
  it('user can cancel own pending_review order', async () => {
    const { user, token } = await createUserWithToken('user');
    const order = await createOrder({ userId: user._id, status: ORDER_STATUS.PENDING_REVIEW });

    const res = await request(app)
      .put(`/api/orders/${order._id}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(ORDER_STATUS.CANCELLED);
  });

  it('user cannot cancel completed order', async () => {
    const { user, token } = await createUserWithToken('user');
    const order = await createOrder({ userId: user._id, status: ORDER_STATUS.COMPLETED });

    const res = await request(app)
      .put(`/api/orders/${order._id}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_OPERATION');
  });

  it('user cannot cancel already cancelled order', async () => {
    const { user, token } = await createUserWithToken('user');
    const order = await createOrder({ userId: user._id, status: ORDER_STATUS.CANCELLED });

    const res = await request(app)
      .put(`/api/orders/${order._id}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_OPERATION');
  });

  it('user cannot cancel another user\u2019s order', async () => {
    const { user: owner } = await createUserWithToken('user');
    const { token: otherUserToken } = await createUserWithToken('user');
    const order = await createOrder({ userId: owner._id, status: ORDER_STATUS.PENDING_REVIEW });

    const res = await request(app)
      .put(`/api/orders/${order._id}/cancel`)
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('FORBIDDEN');
  });
});
