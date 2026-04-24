const express = require('express');
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
} = require('../controllers/orderController');

const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { createOrderSchema } = require('../validators/orderSchemas');

const router = express.Router();

/**
 * @route   POST /api/orders
 * @desc    Create new order (User)
 * @access  Private
 */
router.post(
  '/',
  protect,
  validate(createOrderSchema),
  createOrder
);

/**
 * @route   GET /api/orders/myorders
 * @desc    Get logged in user's orders
 * @access  Private
 */
router.get('/myorders', protect, getMyOrders);

router.get('/:id', protect, getOrderById);

/**
 * @route   PUT /api/orders/:id/cancel
 * @desc    Cancel order (only if pending_review)
 * @access  Private
 */
router.put('/:id/cancel', protect, cancelOrder);

module.exports = router;