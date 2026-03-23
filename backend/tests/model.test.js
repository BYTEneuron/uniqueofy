const request = require('supertest');
const app = require('../src/app');

describe('Model API Endpoints', () => {
  describe('GET /api/model/current', () => {
    it('should return current model information', async () => {
      const response = await request(app)
        .get('/api/model/current')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('modelId');
      expect(response.body.data).toHaveProperty('provider');
      expect(response.body.data).toHaveProperty('latestModel');
      expect(response.body.data).toHaveProperty('latestModelId');
      expect(response.body.data).toHaveProperty('knowledgeCutoff');
      expect(response.body.data).toHaveProperty('timestamp');
    });

    it('should return model with correct provider', async () => {
      const response = await request(app)
        .get('/api/model/current')
        .expect(200);

      expect(response.body.data.provider).toBe('Anthropic');
    });

    it('should return valid model information', async () => {
      const response = await request(app)
        .get('/api/model/current')
        .expect(200);

      const { data } = response.body;
      expect(data.name).toBe('Claude Sonnet 4.5');
      expect(data.modelId).toBe('claude-sonnet-4-5-20250929');
      expect(data.latestModel).toBe('Claude Opus 4.5');
      expect(data.latestModelId).toBe('claude-opus-4-5-20251101');
      expect(data.knowledgeCutoff).toBe('January 2025');
    });
  });
});
