/**
 * Central Order Status Policy
 * Single source of truth for all order status values, terminal states,
 * and allowed transitions.
 */

const ORDER_STATUS = {
  PENDING_REVIEW: 'pending_review',
  QUOTE_IN_PROGRESS: 'quote_in_progress',
  QUOTE_FINALIZED: 'quote_finalized',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const TERMINAL_STATES = [
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.CANCELLED,
];

const ALLOWED_TRANSITIONS = {
  [ORDER_STATUS.PENDING_REVIEW]: [
    ORDER_STATUS.QUOTE_IN_PROGRESS,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.QUOTE_IN_PROGRESS]: [
    ORDER_STATUS.QUOTE_FINALIZED,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.QUOTE_FINALIZED]: [
    ORDER_STATUS.COMPLETED,
  ],
  [ORDER_STATUS.COMPLETED]: [],
  [ORDER_STATUS.CANCELLED]: [],
};

module.exports = {
  ORDER_STATUS,
  TERMINAL_STATES,
  ALLOWED_TRANSITIONS,
};
