const mongoose = require('mongoose');
const request = require('supertest');

const app = require('../src/app');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const { generateAccessToken } = require('../src/utils/token');
const { ORDER_STATUS } = require('../src/domain/orderStatusPolicy');

const randomPhone = () => String(Math.floor(1000000000 + Math.random() * 9000000000));

const createAdminToken = async () => {
  const admin = await User.create({
    phone: randomPhone(),
    role: 'admin',
    firstName: 'Status',
    lastName: 'Admin',
  });

  return generateAccessToken(admin);
};

const createUser = async () => {
  return User.create({
    phone: randomPhone(),
    role: 'user',
    firstName: 'Status',
    lastName: 'User',
  });
};

const createOrderWithStatus = async (userId, status) => {
  return Order.create({
    user: userId,
    services: [
      {
        serviceId: new mongoose.Types.ObjectId(),
        name: 'Transition Service',
        quantity: 1,
      },
    ],
    serviceDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    timeSlot: '13:00-15:00',
    address: 'Transition Avenue',
    status,
  });
};

describe('Strict Order Status Transitions', () => {
  it('pending_review → quote_in_progress allowed', async () => {
    const adminToken = await createAdminToken();
    const user = await createUser();
    const order = await createOrderWithStatus(user._id, ORDER_STATUS.PENDING_REVIEW);

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: ORDER_STATUS.QUOTE_IN_PROGRESS });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(ORDER_STATUS.QUOTE_IN_PROGRESS);
  });

  it('quote_in_progress → quote_finalized allowed', async () => {
    const adminToken = await createAdminToken();
    const user = await createUser();
    const order = await createOrderWithStatus(user._id, ORDER_STATUS.QUOTE_IN_PROGRESS);

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: ORDER_STATUS.QUOTE_FINALIZED });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(ORDER_STATUS.QUOTE_FINALIZED);
  });

  it('completed → any forbidden (terminal)', async () => {
    const adminToken = await createAdminToken();
    const user = await createUser();
    const order = await createOrderWithStatus(user._id, ORDER_STATUS.COMPLETED);

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: ORDER_STATUS.QUOTE_IN_PROGRESS });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_OPERATION');
  });

  it('cancelled → any forbidden (terminal)', async () => {
    const adminToken = await createAdminToken();
    const user = await createUser();
    const order = await createOrderWithStatus(user._id, ORDER_STATUS.CANCELLED);

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: ORDER_STATUS.QUOTE_IN_PROGRESS });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_OPERATION');
  });
});
