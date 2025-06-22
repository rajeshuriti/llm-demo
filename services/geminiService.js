const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/config');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: config.gemini.model,
      generationConfig: config.gemini.generationConfig,
      safetySettings: config.gemini.safetySettings,
    });
  }

  /**
   * Generate Mermaid.js diagram code from natural language description
   * @param {string} description - Natural language description of the diagram
   * @param {string} diagramType - Type of diagram (flowchart, class, sequence, etc.)
   * @returns {Promise<string>} - Generated Mermaid.js code
   */
  async generateMermaidDiagram(description, diagramType = 'auto') {
    try {
      const prompt = this.buildMermaidPrompt(description, diagramType);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract Mermaid code from the response
      let mermaidCode = this.extractMermaidCode(text);

      if (!mermaidCode) {
        throw new Error('Failed to generate valid Mermaid code');
      }

      // Post-process ER diagrams to fix common issues
      if (mermaidCode.toLowerCase().trim().startsWith('erdiagram')) {
        const originalCode = mermaidCode;
        mermaidCode = this.fixERSyntax(mermaidCode);

        // Validate the fixed code and revert if fix made it invalid
        if (!this.validateMermaidSyntax(mermaidCode)) {
          mermaidCode = originalCode;
        }
      }

      return mermaidCode;
    } catch (error) {
      console.error('Error generating Mermaid diagram:', error);
      throw new Error(`Failed to generate diagram: ${error.message}`);
    }
  }

  /**
   * Build specialized prompt for Mermaid diagram generation
   * @param {string} description - User's description
   * @param {string} diagramType - Type of diagram
   * @returns {string} - Complete prompt for Gemini
   */
  buildMermaidPrompt(description, diagramType) {
    // Enhanced prompt with specific examples for each diagram type
    let specificGuidance = '';

    if (diagramType === 'er' || (diagramType === 'auto' && this.isERDescription(description))) {
      specificGuidance = `

**ER DIAGRAM SPECIFIC REQUIREMENTS:**
- Start with "erDiagram"
- Define entities with attributes inside curly braces
- Use proper relationship notation: ||--o{ (one-to-many), ||--|| (one-to-one), }o--o{ (many-to-many)
- Relationship labels MUST be simple verbs: places, contains, has, owns, creates, manages
- STRICTLY FORBIDDEN: "belongs to", "IDENTIFYING", "written by", or any complex phrases
- For categorization, use: CATEGORY ||--o{ PRODUCT : categorizes (NOT "belongs to")
- For authorship, use: AUTHOR ||--o{ BOOK : writes (NOT "written by")
- Attribute format: "type name" or "name type" (e.g., "int customer_id PK", "string name")

**CORRECT ER DIAGRAM EXAMPLES:**
erDiagram
    CUSTOMER {
        int customer_id PK
        string name
        string email
    }
    ORDER {
        int order_id PK
        int customer_id FK
        date order_date
    }
    PRODUCT {
        int product_id PK
        int category_id FK
        string name
    }
    CATEGORY {
        int category_id PK
        string name
    }
    CUSTOMER ||--o{ ORDER : places
    CATEGORY ||--o{ PRODUCT : categorizes
    ORDER ||--o{ PRODUCT : contains

**WRONG EXAMPLES TO AVOID:**
- PRODUCT ||--o{ CATEGORY : belongs to (WRONG!)
- BOOK ||--o{ AUTHOR : written by (WRONG!)
Use instead: CATEGORY ||--o{ PRODUCT : categorizes`;
    } else if (diagramType === 'class' || (diagramType === 'auto' && this.isClassDescription(description))) {
      specificGuidance = `

**CLASS DIAGRAM SPECIFIC REQUIREMENTS:**
- Start with "classDiagram"
- Define classes with attributes and methods
- Use proper visibility: + (public), - (private), # (protected)
- Inheritance: Parent <|-- Child
- Association: ClassA --> ClassB
- Composition: ClassA *-- ClassB`;
    } else if (diagramType === 'sequence' || (diagramType === 'auto' && this.isSequenceDescription(description))) {
      specificGuidance = `

**SEQUENCE DIAGRAM SPECIFIC REQUIREMENTS:**
- Start with "sequenceDiagram"
- Define participants
- Use proper arrows: ->> (solid), -->> (dashed), -x (cross), --x (dashed cross)
- Include alt/opt/loop blocks when needed`;
    }

    const basePrompt = `You are an expert Diagram Code Generator specializing in creating accurate, executable Mermaid.js diagram code from natural language descriptions.

**CRITICAL REQUIREMENTS:**
1. Generate ONLY valid Mermaid.js code - no explanations, no markdown formatting
2. Output must be syntactically correct and executable
3. Include ALL elements described by the user
4. Use appropriate Mermaid.js syntax for the diagram type

**Supported Diagram Types:**
- Flowcharts: Use "graph TD" (top-down) or "graph LR" (left-right)
- Class Diagrams: Use "classDiagram"
- Sequence Diagrams: Use "sequenceDiagram"
- Entity-Relationship: Use "erDiagram"
- State Diagrams: Use "stateDiagram-v2"
- Gantt Charts: Use "gantt"

**Format Selection Logic:**
${diagramType !== 'auto' ? `- User requested: ${diagramType}` : '- Auto-detect the most appropriate diagram type based on the description'}${specificGuidance}

**Output Requirements:**
- Start directly with the Mermaid diagram type declaration
- Use descriptive node names that reflect the user's terminology
- Include proper labels for relationships when specified
- Ensure logical flow direction matches the described process
- NO markdown code blocks, NO explanations, ONLY the Mermaid code

**User Description:**
${description}

Generate the Mermaid.js code now:`;

    return basePrompt;
  }

  /**
   * Check if description suggests an ER diagram
   * @param {string} description - User's description
   * @returns {boolean} - Whether it's likely an ER diagram
   */
  isERDescription(description) {
    const erKeywords = [
      'entity', 'entities', 'relationship', 'database', 'schema', 'table', 'tables',
      'customer', 'order', 'product', 'user', 'post', 'comment', 'category',
      'foreign key', 'primary key', 'one-to-many', 'many-to-many', 'one-to-one'
    ];
    const lowerDesc = description.toLowerCase();
    return erKeywords.some(keyword => lowerDesc.includes(keyword)) ||
           lowerDesc.includes('er diagram') || lowerDesc.includes('erd');
  }

  /**
   * Check if description suggests a class diagram
   * @param {string} description - User's description
   * @returns {boolean} - Whether it's likely a class diagram
   */
  isClassDescription(description) {
    const classKeywords = [
      'class', 'classes', 'inheritance', 'method', 'methods', 'property', 'properties',
      'object', 'objects', 'extends', 'implements', 'interface', 'abstract'
    ];
    const lowerDesc = description.toLowerCase();
    return classKeywords.some(keyword => lowerDesc.includes(keyword)) ||
           lowerDesc.includes('class diagram') || lowerDesc.includes('uml');
  }

  /**
   * Check if description suggests a sequence diagram
   * @param {string} description - User's description
   * @returns {boolean} - Whether it's likely a sequence diagram
   */
  isSequenceDescription(description) {
    const sequenceKeywords = [
      'sequence', 'interaction', 'message', 'actor', 'participant', 'timeline',
      'request', 'response', 'call', 'invoke', 'send', 'receive'
    ];
    const lowerDesc = description.toLowerCase();
    return sequenceKeywords.some(keyword => lowerDesc.includes(keyword)) ||
           lowerDesc.includes('sequence diagram');
  }

  /**
   * Extract Mermaid code from Gemini's response
   * @param {string} text - Raw response from Gemini
   * @returns {string|null} - Extracted Mermaid code or null if not found
   */
  extractMermaidCode(text) {
    // Remove any markdown code blocks if present
    let code = text.replace(/```mermaid\n?/g, '').replace(/```\n?/g, '');
    
    // Remove any leading/trailing whitespace
    code = code.trim();
    
    // Validate that it starts with a valid Mermaid diagram type
    const validStarters = [
      'graph', 'flowchart', 'classDiagram', 'sequenceDiagram', 
      'erDiagram', 'stateDiagram', 'gantt', 'pie', 'journey',
      'gitgraph', 'mindmap', 'timeline'
    ];
    
    const startsWithValidType = validStarters.some(starter => 
      code.toLowerCase().startsWith(starter.toLowerCase())
    );
    
    if (!startsWithValidType) {
      console.warn('Generated code does not start with valid Mermaid diagram type:', code.substring(0, 50));
      return null;
    }
    
    return code;
  }

  /**
   * Validate Mermaid syntax (enhanced validation)
   * @param {string} mermaidCode - Mermaid code to validate
   * @returns {boolean} - Whether the code appears to be valid
   */
  validateMermaidSyntax(mermaidCode) {
    if (!mermaidCode || typeof mermaidCode !== 'string') {
      return false;
    }

    // Basic syntax validation
    const trimmed = mermaidCode.trim();

    // Check for valid diagram type
    const validStarters = [
      'graph', 'flowchart', 'classDiagram', 'sequenceDiagram',
      'erDiagram', 'stateDiagram', 'gantt', 'pie', 'journey'
    ];

    const hasValidStarter = validStarters.some(starter =>
      trimmed.toLowerCase().startsWith(starter.toLowerCase())
    );

    if (!hasValidStarter) {
      return false;
    }

    // Check for basic structure (at least one line after the diagram type)
    const lines = trimmed.split('\n').filter(line => line.trim().length > 0);

    if (lines.length < 2) {
      return false;
    }

    // ER Diagram specific validation
    if (trimmed.toLowerCase().startsWith('erdiagram')) {
      return this.validateERSyntax(trimmed);
    }

    return true;
  }

  /**
   * Validate ER diagram specific syntax
   * @param {string} erCode - ER diagram code
   * @returns {boolean} - Whether the ER syntax is valid
   */
  validateERSyntax(erCode) {
    // For now, be more lenient with ER validation since we're fixing issues post-generation
    // Just check for basic ER structure
    const hasEntities = /\w+\s*\{/.test(erCode);
    const hasValidRelationships = /\|\|--|\}o--|\|\|--o\{|\}o--o\{/.test(erCode);

    // Accept ER diagrams that have either entities or relationships
    return hasEntities || hasValidRelationships;
  }

  /**
   * Fix common ER diagram syntax issues
   * @param {string} erCode - ER diagram code
   * @returns {string} - Fixed ER diagram code
   */
  fixERSyntax(erCode) {
    let fixedCode = erCode;

    // Fix "belongs to" relationships - more comprehensive patterns
    fixedCode = fixedCode.replace(
      /(\w+)\s+\|\|--o\{\s+(\w+)\s*:\s*belongs\s+to/gi,
      '$2 ||--o{ $1 : categorizes'
    );

    // Fix any remaining "belongs to" patterns
    fixedCode = fixedCode.replace(
      /(\w+)\s*\|\|--o\{\s*(\w+)\s*:\s*belongs\s+to/gi,
      '$2 ||--o{ $1 : categorizes'
    );

    // Fix standalone "belongs to" in relationships
    fixedCode = fixedCode.replace(
      /:\s*belongs\s+to\s*/gi,
      ': categorizes'
    );

    // Fix "written by" relationships
    fixedCode = fixedCode.replace(
      /:\s*written\s+by/gi,
      ': writes'
    );

    // Remove IDENTIFYING keyword
    fixedCode = fixedCode.replace(/IDENTIFYING\s+/gi, '');

    // Fix malformed relationship syntax
    fixedCode = fixedCode.replace(
      /(\w+)\s*:\s*belongs\s*to(\w+)/gi,
      '$2 ||--o{ $1 : categorizes'
    );

    // Reverse incorrect relationships for categorization
    // PRODUCT ||--o{ CATEGORY should be CATEGORY ||--o{ PRODUCT
    fixedCode = fixedCode.replace(
      /(PRODUCT|Product|product)\s+\|\|--o\{\s+(CATEGORY|Category|category)\s*:\s*(\w+)/gi,
      '$2 ||--o{ $1 : categorizes'
    );

    // Ensure proper spacing around relationship symbols
    fixedCode = fixedCode.replace(/\|\|--o\{/g, ' ||--o{ ');
    fixedCode = fixedCode.replace(/\|\|--\|\|/g, ' ||--|| ');
    fixedCode = fixedCode.replace(/\}o--o\{/g, ' }o--o{ ');

    // Clean up extra spaces but preserve line breaks
    fixedCode = fixedCode.replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').replace(/\s+\n/g, '\n');

    return fixedCode.trim();
  }
}

module.exports = new GeminiService();
