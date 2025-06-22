const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const { validateBody, sanitizeInput, checkDescriptionContent } = require('../utils/validation');

/**
 * POST /api/diagrams/generate
 * Generate Mermaid diagram from natural language description
 */
router.post('/generate', validateBody('generateDiagram'), async (req, res) => {
  try {
    const { description, diagramType, options } = req.body;
    
    // Sanitize input
    const sanitizedDescription = sanitizeInput(description);
    
    // Check description content for potential issues
    const contentCheck = checkDescriptionContent(sanitizedDescription);
    
    // Generate diagram using Gemini API
    const startTime = Date.now();
    const mermaidCode = await geminiService.generateMermaidDiagram(
      sanitizedDescription, 
      diagramType
    );
    const generationTime = Date.now() - startTime;
    
    // Validate generated Mermaid syntax
    const isValid = geminiService.validateMermaidSyntax(mermaidCode);
    
    if (!isValid) {
      return res.status(500).json({
        success: false,
        error: 'Generated diagram code is invalid',
        details: 'The AI generated invalid Mermaid syntax. Please try rephrasing your description.'
      });
    }
    
    // Return successful response
    res.json({
      success: true,
      data: {
        mermaidCode,
        diagramType: diagramType === 'auto' ? 'auto-detected' : diagramType,
        generationTime: `${generationTime}ms`,
        warnings: contentCheck.warnings
      },
      metadata: {
        inputLength: sanitizedDescription.length,
        outputLength: mermaidCode.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error in diagram generation:', error);
    
    // Handle specific error types
    if (error.message.includes('API key')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        details: 'Invalid or missing API key'
      });
    }
    
    if (error.message.includes('quota') || error.message.includes('limit')) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        details: 'API quota exceeded. Please try again later.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: 'Failed to generate diagram. Please try again.'
    });
  }
});

/**
 * POST /api/diagrams/validate
 * Validate Mermaid diagram syntax
 */
router.post('/validate', (req, res) => {
  try {
    const { mermaidCode } = req.body;
    
    if (!mermaidCode || typeof mermaidCode !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: 'Mermaid code is required and must be a string'
      });
    }
    
    const isValid = geminiService.validateMermaidSyntax(mermaidCode);
    
    res.json({
      success: true,
      data: {
        isValid,
        codeLength: mermaidCode.length,
        lineCount: mermaidCode.split('\n').length
      }
    });
    
  } catch (error) {
    console.error('Error in diagram validation:', error);
    res.status(500).json({
      success: false,
      error: 'Validation failed',
      details: error.message
    });
  }
});

/**
 * GET /api/diagrams/examples
 * Get example descriptions and their expected diagram types
 */
router.get('/examples', (req, res) => {
  const examples = [
    {
      id: 1,
      title: 'Simple Process Flow',
      description: 'Create a flowchart showing the process of making coffee: start, boil water, grind beans, brew coffee, serve',
      expectedType: 'flowchart',
      category: 'process'
    },
    {
      id: 2,
      title: 'User Authentication System',
      description: 'Show the sequence of user login: user enters credentials, system validates, checks database, returns success or error',
      expectedType: 'sequence',
      category: 'system'
    },
    {
      id: 3,
      title: 'E-commerce Database',
      description: 'Design an entity relationship diagram for an online store with customers, orders, products, and categories',
      expectedType: 'er',
      category: 'database'
    },
    {
      id: 4,
      title: 'Vehicle Class Hierarchy',
      description: 'Create a class diagram showing Vehicle as parent class with Car and Motorcycle as children, including properties and methods',
      expectedType: 'class',
      category: 'object-oriented'
    },
    {
      id: 5,
      title: 'Order Processing States',
      description: 'Show the states of an order: pending, confirmed, processing, shipped, delivered, with transitions between them',
      expectedType: 'state',
      category: 'workflow'
    }
  ];
  
  res.json({
    success: true,
    data: examples,
    metadata: {
      count: examples.length,
      categories: [...new Set(examples.map(ex => ex.category))]
    }
  });
});

/**
 * GET /api/diagrams/types
 * Get supported diagram types and their descriptions
 */
router.get('/types', (req, res) => {
  const diagramTypes = [
    {
      type: 'flowchart',
      name: 'Flowchart',
      description: 'Process flows, decision trees, workflows',
      syntax: 'graph TD or graph LR',
      useCase: 'Business processes, algorithms, decision making'
    },
    {
      type: 'class',
      name: 'Class Diagram',
      description: 'Object-oriented design, class relationships',
      syntax: 'classDiagram',
      useCase: 'Software architecture, inheritance, associations'
    },
    {
      type: 'sequence',
      name: 'Sequence Diagram',
      description: 'Time-ordered interactions between actors',
      syntax: 'sequenceDiagram',
      useCase: 'API calls, user interactions, system communications'
    },
    {
      type: 'er',
      name: 'Entity Relationship',
      description: 'Database schemas, entity relationships',
      syntax: 'erDiagram',
      useCase: 'Database design, data modeling'
    },
    {
      type: 'state',
      name: 'State Diagram',
      description: 'State machines, transitions',
      syntax: 'stateDiagram-v2',
      useCase: 'Workflow states, system states, lifecycle'
    },
    {
      type: 'gantt',
      name: 'Gantt Chart',
      description: 'Project timelines, task scheduling',
      syntax: 'gantt',
      useCase: 'Project management, timeline planning'
    }
  ];
  
  res.json({
    success: true,
    data: diagramTypes
  });
});

module.exports = router;
