const Order = require('../models/Order');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { ORDER_STATUS, TERMINAL_STATES, ALLOWED_TRANSITIONS } = require('../domain/orderStatusPolicy');

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private/Admin
const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({}).populate('user', 'id phone firstName lastName').sort({ createdAt: -1 });
    successResponse(res, orders, 'All orders retrieved');
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return errorResponse(res, 'Order not found', 'NOT_FOUND', 404);
    }

    // Terminal state protection
    if (TERMINAL_STATES.includes(order.status)) {
      return errorResponse(res, 'Order in terminal state cannot be modified', 'INVALID_OPERATION', 400);
    }

    const validStatuses = Object.values(ORDER_STATUS);
    if (!validStatuses.includes(status)) {
        return errorResponse(res, 'Invalid status', 'BAD_REQUEST', 400);
    }

    // Strict Status Transitions
    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (!allowed || !allowed.includes(status)) {
        return errorResponse(
            res,
            `Cannot change status from ${order.status} to ${status}`,
            'INVALID_STATUS_TRANSITION',
            400
        );
    }

    order.status = status;
    order.status = order.status.toLowerCase(); // defensive normalization
    const updatedOrder = await order.save();

    successResponse(res, updatedOrder, 'Order status updated');
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = async (req, res, next) => {
    try {
        const users = await User.find({}).select('-refreshToken');
        successResponse(res, users, 'All users retrieved');
    } catch (error) {
        next(error);
    }
};

// @desc    Mark order as paid
// @route   PUT /api/admin/orders/:id/mark-paid
// @access  Private/Admin
const markOrderAsPaid = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);

    if (!order) {
      return errorResponse(res, 'Order not found', 'NOT_FOUND', 404);
    }

    // Terminal state protection
    if (TERMINAL_STATES.includes(order.status)) {
      return errorResponse(res, 'Order in terminal state cannot be modified', 'INVALID_OPERATION', 400);
    }

    if (order.isAmountFinalized !== true) {
      return errorResponse(
        res,
        'Quote not finalized yet',
        'INVALID_OPERATION',
        400
      );
    }

    if (!order.finalAmount || order.finalAmount <= 0) {
      return errorResponse(
        res,
        'Final amount not set',
        'INVALID_OPERATION',
        400
      );
    }

    if (order.paymentStatus === 'paid') {
      return errorResponse(res, 'Order already paid', 'BAD_REQUEST', 400);
    }

    order.paymentStatus = 'paid';
    order.paidAt = new Date();

    const updatedOrder = await order.save();
    successResponse(res, updatedOrder, 'Order marked as paid');
  } catch (error) {
    next(error);
  }
};

// @desc    Mark order as completed
// @route   PUT /api/admin/orders/:id/complete
// @access  Private/Admin
const markOrderAsCompleted = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);

    if (!order) {
      return errorResponse(res, 'Order not found', 'NOT_FOUND', 404);
    }

    if (order.status === ORDER_STATUS.CANCELLED) {
      return errorResponse(
        res,
        'Cannot complete cancelled order',
        'INVALID_OPERATION',
        400
      );
    }

    if (order.status === ORDER_STATUS.COMPLETED) {
      return errorResponse(
        res,
        'Order already completed',
        'INVALID_OPERATION',
        400
      );
    }

    if (order.isAmountFinalized !== true) {
      return errorResponse(
        res,
        'Quote not finalized',
        'INVALID_OPERATION',
        400
      );
    }

    if (order.paymentStatus !== 'paid') {
      return errorResponse(
        res,
        'Payment not completed',
        'INVALID_OPERATION',
        400
      );
    }

    order.status = ORDER_STATUS.COMPLETED;
    order.status = order.status.toLowerCase(); // defensive normalization
    order.completedAt = new Date();

    const updatedOrder = await order.save();
    successResponse(res, updatedOrder, 'Order marked as completed');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrders,
  updateOrderStatus,
  getUsers,
  markOrderAsPaid,
  markOrderAsCompleted,
};
