const Joi = require('joi');

const createServiceSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .required(),

  description: Joi.string()
    .trim()
    .min(5)
    .max(500)
    .required(),

  category: Joi.string()
    .valid('ac', 'water_tank')
    .required(),

  price: Joi.number()
    .min(0)
    .required(),

  duration: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .required(),

  isCustom: Joi.boolean().optional(),

  isActive: Joi.boolean().optional(),
});

const updateServiceSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .optional(),

  description: Joi.string()
    .trim()
    .min(5)
    .max(500)
    .optional(),

  category: Joi.string()
    .valid('ac', 'water_tank')
    .optional(),

  price: Joi.number()
    .min(0)
    .optional(),

  duration: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .optional(),

  isCustom: Joi.boolean().optional(),

  isActive: Joi.boolean().optional(),
});

module.exports = {
  createServiceSchema,
  updateServiceSchema,
};