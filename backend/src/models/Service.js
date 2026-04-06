const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true, // Prevent duplicate services
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: ['ac', 'water_tank'],
      required: true,
      index: true, // Faster category filtering
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    duration: {
      type: String,
      required: true,
      trim: true,
    },

    isCustom: {
      type: Boolean,
      default: false, // Custom request cards
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true, // Allows soft delete & fast filtering
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Service', serviceSchema);