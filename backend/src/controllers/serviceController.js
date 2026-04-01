const Service = require('../models/Service');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

// @desc    Get all services
// @route   GET /api/services
// @access  Public
const getServices = async (req, res, next) => {
  try {
    const filter = { isActive: true };
    const allowedCategories = ['ac', 'water_tank'];
    
    if (req.query.category) {
      const category = req.query.category.trim().toLowerCase();
      if (allowedCategories.includes(category)) {
        filter.category = category;
      }
    }

    const services = await Service
      .find(filter)
      .sort({ category: 1, createdAt: 1 });
      
    successResponse(res, services, 'Services retrieved');
  } catch (error) {
    next(error);
  }
};

// @desc    Get service by ID
// @route   GET /api/services/:id
// @access  Public
const getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return errorResponse(res, 'Service not found', 'NOT_FOUND', 404);
    }

    successResponse(res, service, 'Service retrieved');
  } catch (error) {
    next(error);
  }
};

// @desc    Create a service
// @route   POST /api/services
// @access  Private/Admin
const createService = async (req, res, next) => {
  try {
    const { name, description, category, duration, isCustom, isActive } = req.body;

    // Check for duplicate service name
    const serviceExists = await Service.findOne({ name });
    if (serviceExists) {
      return errorResponse(res, 'Service with this name already exists', 'DUPLICATE_SERVICE', 400);
    }

    const service = new Service({
      name,
      description,
      category,
      duration,
      isCustom: isCustom || false,
      isActive: isActive ?? true,
    });

    const createdService = await service.save();
    successResponse(res, createdService, 'Service created', 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a service
// @route   PUT /api/services/:id
// @access  Private/Admin
const updateService = async (req, res, next) => {
  try {
    const { name, description, category, duration, isCustom, isActive } = req.body;
    const service = await Service.findById(req.params.id);

    if (!service) {
      return errorResponse(res, 'Service not found', 'NOT_FOUND', 404);
    }

    // Check for duplicate name if name is being updated
    if (name && name !== service.name) {
      const serviceExists = await Service.findOne({ name });
      if (serviceExists) {
        return errorResponse(res, 'Service with this name already exists', 'DUPLICATE_SERVICE', 400);
      }
    }

    service.name = name || service.name;
    service.description = description || service.description;
    service.category = category || service.category;
    service.duration = duration || service.duration;

    if (isCustom !== undefined) service.isCustom = isCustom;
    if (isActive !== undefined) service.isActive = isActive;

    const updatedService = await service.save();
    successResponse(res, updatedService, 'Service updated');
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a service
// @route   DELETE /api/services/:id
// @access  Private/Admin
const deleteService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return errorResponse(res, 'Service not found', 'NOT_FOUND', 404);
    }

    await service.deleteOne();
    successResponse(res, null, 'Service removed');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};
