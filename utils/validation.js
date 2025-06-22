const Joi = require('joi');

/**
 * Validation schemas for API requests
 */
const schemas = {
  generateDiagram: Joi.object({
    description: Joi.string()
      .min(10)
      .max(2000)
      .required()
      .messages({
        'string.min': 'Description must be at least 10 characters long',
        'string.max': 'Description must not exceed 2000 characters',
        'any.required': 'Description is required'
      }),
    
    diagramType: Joi.string()
      .valid('auto', 'flowchart', 'class', 'sequence', 'er', 'state', 'gantt')
      .default('auto')
      .messages({
        'any.only': 'Diagram type must be one of: auto, flowchart, class, sequence, er, state, gantt'
      }),
    
    options: Joi.object({
      temperature: Joi.number().min(0).max(1).default(0.1),
      maxTokens: Joi.number().min(100).max(4000).default(2048)
    }).default({})
  })
};

/**
 * Validate request data against schema
 * @param {Object} data - Data to validate
 * @param {string} schemaName - Name of the schema to use
 * @returns {Object} - Validation result with error or value
 */
function validateRequest(data, schemaName) {
  const schema = schemas[schemaName];
  
  if (!schema) {
    return {
      error: new Error(`Unknown validation schema: ${schemaName}`),
      value: null
    };
  }
  
  return schema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  });
}

/**
 * Middleware for validating request body
 * @param {string} schemaName - Name of the schema to use
 * @returns {Function} - Express middleware function
 */
function validateBody(schemaName) {
  return (req, res, next) => {
    const { error, value } = validateRequest(req.body, schemaName);
    
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errorMessages
      });
    }
    
    req.body = value;
    next();
  };
}

/**
 * Sanitize user input to prevent injection attacks
 * @param {string} input - Input string to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous characters and patterns
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate Mermaid diagram type
 * @param {string} diagramType - Diagram type to validate
 * @returns {boolean} - Whether the diagram type is valid
 */
function isValidDiagramType(diagramType) {
  const validTypes = ['auto', 'flowchart', 'class', 'sequence', 'er', 'state', 'gantt'];
  return validTypes.includes(diagramType);
}

/**
 * Check if description contains potentially problematic content
 * @param {string} description - Description to check
 * @returns {Object} - Check result with warnings
 */
function checkDescriptionContent(description) {
  const warnings = [];
  
  // Check for extremely long descriptions
  if (description.length > 1500) {
    warnings.push('Very long descriptions may result in incomplete diagrams');
  }
  
  // Check for potentially confusing terms
  const confusingTerms = ['and/or', 'maybe', 'possibly', 'sometimes'];
  const hasConfusingTerms = confusingTerms.some(term => 
    description.toLowerCase().includes(term)
  );
  
  if (hasConfusingTerms) {
    warnings.push('Ambiguous terms detected - consider being more specific for better results');
  }
  
  // Check for multiple diagram types mentioned
  const diagramKeywords = ['flowchart', 'class diagram', 'sequence', 'entity relationship', 'state machine'];
  const mentionedTypes = diagramKeywords.filter(keyword => 
    description.toLowerCase().includes(keyword)
  );
  
  if (mentionedTypes.length > 1) {
    warnings.push('Multiple diagram types detected - consider creating separate diagrams');
  }
  
  return {
    isValid: true,
    warnings
  };
}

module.exports = {
  schemas,
  validateRequest,
  validateBody,
  sanitizeInput,
  isValidDiagramType,
  checkDescriptionContent
};
