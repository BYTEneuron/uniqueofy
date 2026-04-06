const express = require('express');
const {
  getOrders,
  updateOrderStatus,
  getUsers,
  markOrderAsPaid,
  markOrderAsCompleted,
} = require('../controllers/adminController');
const {
  getAdminServices,
  updateServicePrice,
  toggleServiceActivation,
} = require('../controllers/serviceController');

const { protect } = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

const router = express.Router();

// ======================================================
// All admin routes require authentication + admin role
// ======================================================
router.use(protect);
router.use(authorize('admin'));

// ======================================================
// Admin Order Management
// ======================================================
router.get('/orders', getOrders);

// Admin updates generic order status (existing logic)
router.put('/orders/:id/status', updateOrderStatus);


router.put('/orders/:id/mark-paid', markOrderAsPaid);

// Admin marks order as completed (new)
router.put('/orders/:id/complete', markOrderAsCompleted);

// ======================================================
// Admin User Management
// ======================================================
router.get('/services', getAdminServices);
router.patch('/services/:id/price', updateServicePrice);
router.patch('/services/:id/activate', toggleServiceActivation);

router.get('/users', getUsers);

module.exports = router;
