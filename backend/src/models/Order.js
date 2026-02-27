const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    // 🔐 Owner of the order
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // 📦 Services selected
    services: [
      {
        serviceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Service',
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
      },
    ],

    // 📅 Preferred service date
    serviceDate: {
      type: Date,
      required: true,
    },

    timeSlot: {
      type: String,
      required: true,
    },    

    // 📍 Service location details (optional but recommended)
    address: {
      type: String,
      required: true,
    },

    note: {
      type: String,
    },    

    // 📊 Order lifecycle
    status: {
      type: String,
      enum: [
        'pending_review',      // user placed booking
        'quote_in_progress',   // admin reviewing
        'quote_finalized',     // amount decided
        'completed',
        'cancelled',
      ],
      default: 'pending_review',
      index: true,
    },

    // 💰 Final amount decided by admin
    finalAmount: {
      type: Number,
      default: null,
    },

    // 🔒 Whether admin finalized the amount
    isAmountFinalized: {
      type: Boolean,
      default: false,
    },

    // 💳 Payment tracking
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid'],
      default: 'unpaid',
    },

    paidAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Order', orderSchema);
