const Order = require('../models/Order');
const Service = require('../models/Service');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { ORDER_STATUS, TERMINAL_STATES } = require('../domain/orderStatusPolicy');

/**
 * @desc    Create a new service request (Order)
 * @route   POST /api/orders
 * @access  Private (User)
 */
const createOrder = async (req, res, next) => {
  try {
    const isProfileIncomplete = !req.user?.firstName || !String(req.user.firstName).trim();
    if (isProfileIncomplete) {
      return errorResponse(
        res,
        'Complete your profile before creating a booking',
        'FORBIDDEN',
        403
      );
    }

    const { services, serviceDate, address, timeSlot, note } = req.body;

    if (!services || services.length === 0) {
      return errorResponse(res, 'No services selected', 'BAD_REQUEST', 400);
    }

    if (!serviceDate) {
      return errorResponse(res, 'Service date is required', 'BAD_REQUEST', 400);
    }

    if (!address) {
      return errorResponse(
        res,
        'Address is required',
        'BAD_REQUEST',
        400
      );
    }

    if (!timeSlot) {
      return errorResponse(
        res,
        'Preferred time slot is required',
        'BAD_REQUEST',
        400
      );
    }

    const nowUtc = new Date();
    const nowIst = new Date(nowUtc.getTime() + (5.5 * 60 * 60 * 1000));
    const todayIstString = nowIst.toISOString().split('T')[0];

    if (serviceDate <= todayIstString) {
      return errorResponse(
        res,
        'Service date must be at least tomorrow',
        'INVALID_DATE',
        400
      );
    }

    // Secure Pricing Engine: Fetch active services from DB
    const serviceIds = services.map(item => item.serviceId);
    const dbServices = await Service.find({ _id: { $in: serviceIds }, isActive: true });

    if (dbServices.length !== services.length) {
      return errorResponse(res, 'One or more services are invalid or inactive', 'BAD_REQUEST', 400);
    }

    let computedTotalAmount = 0;
    const orderItems = services.map((item) => {
      const dbService = dbServices.find(s => s._id.toString() === item.serviceId);
      const quantity = item.quantity || 1;
      const unitPrice = dbService.price;
      const lineTotal = unitPrice * quantity;

      computedTotalAmount += lineTotal;

      return {
        serviceId: dbService._id,
        name: dbService.name, // Trust DB name, not client name
        quantity: quantity,
        unitPrice: unitPrice,
        lineTotal: lineTotal,
      };
    });

    const order = new Order({
      user: req.user._id,
      services: orderItems,
      serviceDate: new Date(serviceDate),
      address,
      timeSlot,
      note: note || '',
      totalAmount: computedTotalAmount,
    });

    const createdOrder = await order.save();

    return successResponse(
      res,
      createdOrder,
      'Order request created successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get logged-in user's orders
 * @route   GET /api/orders/myorders
 * @access  Private (User)
 */
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('user', 'firstName lastName phone')
      .sort({ createdAt: -1 });

    return successResponse(res, orders, 'User orders retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single order by ID (ensuring user owns it)
 * @route   GET /api/orders/:id
 * @access  Private (User)
 */
const getOrderById = async (req, res, next) => {
  try {
    // Fetches order ONLY if the logged-in user owns it
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
      .populate('user', 'firstName lastName phone');

    if (!order) {
      return errorResponse(res, 'Order not found or unauthorized', 'NOT_FOUND', 404);
    }
    return successResponse(res, order, 'Order retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel an order (only if pending review)
 * @route   PUT /api/orders/:id/cancel
 * @access  Private (User)
 */
const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return errorResponse(res, 'Order not found', 'NOT_FOUND', 404);
    }

    // Terminal state protection
    if (TERMINAL_STATES.includes(order.status)) {
      return errorResponse(res, 'Order in terminal state cannot be modified', 'INVALID_OPERATION', 400);
    }

    // specific user check
    if (order.user.toString() !== req.user._id.toString()) {
      return errorResponse(
        res,
        'Not authorized to cancel this order',
        'FORBIDDEN',
        403
      );
    }

    if (order.status !== ORDER_STATUS.PENDING_REVIEW) {
      return errorResponse(
        res,
        'Only orders pending review can be cancelled',
        'BAD_REQUEST',
        400
      );
    }

    order.status = ORDER_STATUS.CANCELLED;
    order.status = order.status.toLowerCase(); // defensive normalization
    const updatedOrder = await order.save();

    return successResponse(res, updatedOrder, 'Order cancelled successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
};
