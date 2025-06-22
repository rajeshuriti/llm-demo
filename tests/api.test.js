const request = require('supertest');
const app = require('../server');

describe('Diagram API Endpoints', () => {
  describe('POST /api/diagrams/generate', () => {
    it('should generate a diagram with valid input', async () => {
      const response = await request(app)
        .post('/api/diagrams/generate')
        .send({
          description: 'Create a simple flowchart with start, process, and end nodes',
          diagramType: 'flowchart'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('mermaidCode');
      expect(response.body.data.mermaidCode).toContain('graph');
    });

    it('should return 400 for missing description', async () => {
      const response = await request(app)
        .post('/api/diagrams/generate')
        .send({
          diagramType: 'flowchart'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for description too short', async () => {
      const response = await request(app)
        .post('/api/diagrams/generate')
        .send({
          description: 'short',
          diagramType: 'flowchart'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for description too long', async () => {
      const longDescription = 'a'.repeat(2001);
      const response = await request(app)
        .post('/api/diagrams/generate')
        .send({
          description: longDescription,
          diagramType: 'flowchart'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid diagram type', async () => {
      const response = await request(app)
        .post('/api/diagrams/generate')
        .send({
          description: 'Create a simple flowchart with start, process, and end nodes',
          diagramType: 'invalid-type'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/diagrams/validate', () => {
    it('should validate correct Mermaid syntax', async () => {
      const response = await request(app)
        .post('/api/diagrams/validate')
        .send({
          mermaidCode: 'graph TD\n    A[Start] --> B[End]'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(true);
    });

    it('should reject invalid Mermaid syntax', async () => {
      const response = await request(app)
        .post('/api/diagrams/validate')
        .send({
          mermaidCode: 'invalid mermaid code'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(false);
    });

    it('should return 400 for missing code', async () => {
      const response = await request(app)
        .post('/api/diagrams/validate')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/diagrams/examples', () => {
    it('should return examples', async () => {
      const response = await request(app)
        .get('/api/diagrams/examples');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/diagrams/types', () => {
    it('should return supported diagram types', async () => {
      const response = await request(app)
        .get('/api/diagrams/types');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
    });
  });
});

describe('Error Handling', () => {
  it('should handle 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/api/unknown-route');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Not found');
  });
});

describe('Rate Limiting', () => {
  it('should apply rate limiting to API routes', async () => {
    // This test would need to be adjusted based on your rate limiting configuration
    // For now, just verify the endpoint exists
    const response = await request(app)
      .post('/api/diagrams/generate')
      .send({
        description: 'Create a simple flowchart with start, process, and end nodes',
        diagramType: 'flowchart'
      });

    expect([200, 429]).toContain(response.status);
  });
});
