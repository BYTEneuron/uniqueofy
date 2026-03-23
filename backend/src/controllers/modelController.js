const { successResponse } = require('../utils/responseFormatter');

/**
 * Get current model information
 * @route GET /api/model/current
 * @access Public
 */
const getCurrentModel = (req, res) => {
  const modelInfo = {
    name: 'Claude Sonnet 4.5',
    modelId: 'claude-sonnet-4-5-20250929',
    provider: 'Anthropic',
    latestModel: 'Claude Opus 4.5',
    latestModelId: 'claude-opus-4-5-20251101',
    knowledgeCutoff: 'January 2025',
    timestamp: new Date().toISOString()
  };

  successResponse(res, modelInfo, 'Model information retrieved successfully');
};

module.exports = {
  getCurrentModel
};
