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
        unitPrice: {
          type: Number,
          required: true,
        },
        lineTotal: {
          type: Number,
          required: true,
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
        'confirmed',
        'completed',
        'cancelled',
      ],
      default: 'pending_review',
      index: true,
    },

    totalAmount: {
      type: Number,
      required: true,
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

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
