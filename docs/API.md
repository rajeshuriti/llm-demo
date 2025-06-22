# API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
No authentication required for public endpoints. The application uses the configured Gemini API key server-side.

## Rate Limiting
- **Window**: 15 minutes
- **Limit**: 100 requests per IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Response Format
All API responses follow this structure:

```json
{
  "success": boolean,
  "data": object | array,
  "error": string,
  "details": string,
  "metadata": object
}
```

## Endpoints

### 1. Generate Diagram
Generate a Mermaid diagram from natural language description.

**Endpoint:** `POST /diagrams/generate`

**Request Body:**
```json
{
  "description": "string (required, 10-2000 chars)",
  "diagramType": "string (optional)",
  "options": {
    "temperature": "number (optional, 0-1)",
    "maxTokens": "number (optional, 100-4000)"
  }
}
```

**Diagram Types:**
- `auto` (default) - Auto-detect diagram type
- `flowchart` - Process flows and decision trees
- `class` - Object-oriented design diagrams
- `sequence` - Time-ordered interactions
- `er` - Entity relationship diagrams
- `state` - State machines and transitions
- `gantt` - Project timelines

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "mermaidCode": "graph TD\n    A[Start] --> B[End]",
    "diagramType": "flowchart",
    "generationTime": "1250ms",
    "warnings": ["Optional warning messages"]
  },
  "metadata": {
    "inputLength": 45,
    "outputLength": 156,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Validation failed
- `401` - Authentication failed (invalid API key)
- `429` - Rate limit exceeded
- `500` - Internal server error

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/diagrams/generate \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Create a flowchart showing user registration: user fills form, system validates, creates account, sends email",
    "diagramType": "flowchart"
  }'
```

### 2. Validate Diagram
Validate Mermaid diagram syntax.

**Endpoint:** `POST /diagrams/validate`

**Request Body:**
```json
{
  "mermaidCode": "string (required)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "codeLength": 156,
    "lineCount": 5
  }
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/diagrams/validate \
  -H "Content-Type: application/json" \
  -d '{
    "mermaidCode": "graph TD\n    A[Start] --> B[End]"
  }'
```

### 3. Get Examples
Retrieve example descriptions and their expected diagram types.

**Endpoint:** `GET /diagrams/examples`

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Simple Process Flow",
      "description": "Create a flowchart showing the process of making coffee...",
      "expectedType": "flowchart",
      "category": "process"
    }
  ],
  "metadata": {
    "count": 5,
    "categories": ["process", "system", "database", "object-oriented", "workflow"]
  }
}
```

**Example Request:**
```bash
curl http://localhost:3000/api/diagrams/examples
```

### 4. Get Supported Types
Get list of supported diagram types and their descriptions.

**Endpoint:** `GET /diagrams/types`

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "type": "flowchart",
      "name": "Flowchart",
      "description": "Process flows, decision trees, workflows",
      "syntax": "graph TD or graph LR",
      "useCase": "Business processes, algorithms, decision making"
    }
  ]
}
```

**Example Request:**
```bash
curl http://localhost:3000/api/diagrams/types
```

### 5. Health Check
Check application health and status.

**Endpoint:** `GET /health`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "version": "1.0.0",
    "environment": "development"
  }
}
```

**Example Request:**
```bash
curl http://localhost:3000/api/health
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "Error category",
  "details": "Detailed error message",
  "stack": "Error stack trace (development only)"
}
```

### Common Error Codes

#### 400 - Bad Request
- Invalid input parameters
- Validation failures
- Missing required fields

#### 401 - Unauthorized
- Invalid or missing Gemini API key
- Authentication failures

#### 429 - Too Many Requests
- Rate limit exceeded
- API quota exhausted

#### 500 - Internal Server Error
- Gemini API failures
- Unexpected server errors
- Service unavailable

### Error Examples

**Validation Error (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    "Description must be at least 10 characters long",
    "Diagram type must be one of: auto, flowchart, class, sequence, er, state, gantt"
  ]
}
```

**Rate Limit Error (429):**
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "details": "API quota exceeded. Please try again later."
}
```

**API Key Error (401):**
```json
{
  "success": false,
  "error": "Authentication failed",
  "details": "Invalid or missing API key"
}
```

## Best Practices

### 1. Input Optimization
- **Be Specific**: Provide clear, detailed descriptions
- **Use Keywords**: Include diagram-specific terms (e.g., "flowchart", "sequence", "class")
- **Structure**: Organize complex descriptions with clear relationships

### 2. Error Handling
- Always check the `success` field in responses
- Handle rate limiting with exponential backoff
- Validate inputs client-side before API calls

### 3. Performance
- Cache generated diagrams when possible
- Use appropriate diagram types for better results
- Monitor generation times and adjust complexity

### 4. Security
- Sanitize user inputs before sending to API
- Don't expose API keys in client-side code
- Implement proper CORS settings for production

## SDK Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

class MermaidDiagramAPI {
  constructor(baseURL = 'http://localhost:3000/api') {
    this.baseURL = baseURL;
  }

  async generateDiagram(description, diagramType = 'auto') {
    try {
      const response = await axios.post(`${this.baseURL}/diagrams/generate`, {
        description,
        diagramType
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.details || error.message);
    }
  }

  async validateDiagram(mermaidCode) {
    try {
      const response = await axios.post(`${this.baseURL}/diagrams/validate`, {
        mermaidCode
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.details || error.message);
    }
  }
}

// Usage
const api = new MermaidDiagramAPI();
const result = await api.generateDiagram('Create a simple flowchart with start and end');
console.log(result.data.mermaidCode);
```

### Python
```python
import requests
import json

class MermaidDiagramAPI:
    def __init__(self, base_url="http://localhost:3000/api"):
        self.base_url = base_url

    def generate_diagram(self, description, diagram_type="auto"):
        url = f"{self.base_url}/diagrams/generate"
        payload = {
            "description": description,
            "diagramType": diagram_type
        }
        
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"API Error: {response.json().get('details', 'Unknown error')}")

    def validate_diagram(self, mermaid_code):
        url = f"{self.base_url}/diagrams/validate"
        payload = {"mermaidCode": mermaid_code}
        
        response = requests.post(url, json=payload)
        return response.json()

# Usage
api = MermaidDiagramAPI()
result = api.generate_diagram("Create a simple flowchart with start and end")
print(result["data"]["mermaidCode"])
```

## Changelog

### Version 1.0.0
- Initial release
- Basic diagram generation with Gemini API
- Support for 6 diagram types
- Web interface and REST API
- Input validation and error handling
- Rate limiting and security features
