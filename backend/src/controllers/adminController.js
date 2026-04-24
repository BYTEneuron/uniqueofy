const Order = require('../models/Order');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { ORDER_STATUS, TERMINAL_STATES, ALLOWED_TRANSITIONS } = require('../domain/orderStatusPolicy');
const { parseOrdersQuery } = require('../utils/adminQueryValidator');

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private/Admin
const getOrders = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      status,
      paymentStatus,
      serviceDateFrom,
      serviceDateTo,
      search,
      sortBy,
      sortOrder,
    } = parseOrdersQuery(req.query);

    const match = {};

    if (status) match.status = status;
    if (paymentStatus) match.paymentStatus = paymentStatus;
    if (serviceDateFrom || serviceDateTo) {
      match.serviceDate = {};
      if (serviceDateFrom) match.serviceDate.$gte = serviceDateFrom;
      if (serviceDateTo) match.serviceDate.$lte = serviceDateTo;
    }

    const escapedSearch = search ? escapeRegex(search) : null;
    const skip = (page - 1) * limit;
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortStage = { [sortBy]: sortDirection };
    const noQueryParams = Object.keys(req.query || {}).length === 0;

    const basePipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'users',
          let: { userId: '$user' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
            { $project: { _id: 1, phone: 1, firstName: 1, lastName: 1 } },
          ],
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ];

    if (escapedSearch) {
      basePipeline.push({
        $match: {
          $or: [
            { 'user.phone': { $regex: escapedSearch, $options: 'i' } },
            { 'user.firstName': { $regex: escapedSearch, $options: 'i' } },
            { 'user.lastName': { $regex: escapedSearch, $options: 'i' } },
            {
              $expr: {
                $regexMatch: {
                  input: { $toString: '$_id' },
                  regex: escapedSearch,
                  options: 'i',
                },
              },
            },
          ],
        },
      });
    }

    const totalResult = await Order.aggregate([...basePipeline, { $count: 'total' }]);
    const total = totalResult[0]?.total || 0;

    const ordersPipeline = [...basePipeline, { $sort: sortStage }];
    if (!noQueryParams) {
      ordersPipeline.push({ $skip: skip }, { $limit: limit });
    }

    const orders = await Order.aggregate(ordersPipeline);

    const effectiveLimit = noQueryParams ? (total || 0) : limit;
    const totalPages = noQueryParams ? (total > 0 ? 1 : 0) : Math.ceil(total / limit);

    return successResponse(
      res,
      {
        orders,
        pagination: {
          total,
          page: noQueryParams ? 1 : page,
          limit: effectiveLimit,
          totalPages,
          hasNextPage: !noQueryParams && page < totalPages,
          hasPrevPage: !noQueryParams && page > 1,
        },
      },
      'Orders fetched successfully'
    );
  } catch (error) {
    if (error.isValidationError) {
      return errorResponse(res, error.message, error.errorCode || 'BAD_REQUEST', 400);
    }
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

    if (order.status !== 'confirmed') {
      return errorResponse(res, 'Only confirmed orders can be marked as paid', 'INVALID_OPERATION', 400);
    }

    if (order.totalAmount <= 0) {
      return errorResponse(res, 'Order total is zero or invalid', 'INVALID_OPERATION', 400);
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

    if (order.status !== 'confirmed') {
      return errorResponse(res, 'Only confirmed orders can be marked as completed', 'INVALID_OPERATION', 400);
    }
    if (order.paymentStatus !== 'paid') {
      return errorResponse(res, 'Order must be paid before it can be completed', 'INVALID_OPERATION', 400);
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
