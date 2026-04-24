/**
 * Central Order Status Policy
 * Single source of truth for all order status values, terminal states,
 * and allowed transitions.
 */

const ORDER_STATUS = {
  PENDING_REVIEW: 'pending_review',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const TERMINAL_STATES = [
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.CANCELLED,
];

const ALLOWED_TRANSITIONS = {
  [ORDER_STATUS.PENDING_REVIEW]: [
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.CONFIRMED]: [
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.COMPLETED]: [],
  [ORDER_STATUS.CANCELLED]: [],
};

module.exports = {
  ORDER_STATUS,
  TERMINAL_STATES,
  ALLOWED_TRANSITIONS,
};
