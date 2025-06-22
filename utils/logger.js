const fs = require('fs');
const path = require('path');

/**
 * Simple logging utility for the application
 */
class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '..', 'logs');
    this.ensureLogDirectory();
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Get current timestamp in ISO format
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Format log message
   */
  formatMessage(level, message, meta = {}) {
    return JSON.stringify({
      timestamp: this.getTimestamp(),
      level: level.toUpperCase(),
      message,
      ...meta
    }) + '\n';
  }

  /**
   * Write log to file
   */
  writeToFile(filename, content) {
    const filePath = path.join(this.logDir, filename);
    fs.appendFileSync(filePath, content);
  }

  /**
   * Log info message
   */
  info(message, meta = {}) {
    const logMessage = this.formatMessage('info', message, meta);
    console.log(logMessage.trim());
    
    if (process.env.NODE_ENV === 'production') {
      this.writeToFile('app.log', logMessage);
    }
  }

  /**
   * Log warning message
   */
  warn(message, meta = {}) {
    const logMessage = this.formatMessage('warn', message, meta);
    console.warn(logMessage.trim());
    
    if (process.env.NODE_ENV === 'production') {
      this.writeToFile('app.log', logMessage);
    }
  }

  /**
   * Log error message
   */
  error(message, meta = {}) {
    const logMessage = this.formatMessage('error', message, meta);
    console.error(logMessage.trim());
    
    // Always log errors to file
    this.writeToFile('error.log', logMessage);
    
    if (process.env.NODE_ENV === 'production') {
      this.writeToFile('app.log', logMessage);
    }
  }

  /**
   * Log debug message (only in development)
   */
  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      const logMessage = this.formatMessage('debug', message, meta);
      console.debug(logMessage.trim());
    }
  }

  /**
   * Log API request
   */
  logRequest(req, res, responseTime) {
    const meta = {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`
    };

    if (res.statusCode >= 400) {
      this.warn(`HTTP ${res.statusCode} - ${req.method} ${req.url}`, meta);
    } else {
      this.info(`HTTP ${res.statusCode} - ${req.method} ${req.url}`, meta);
    }
  }

  /**
   * Log diagram generation
   */
  logDiagramGeneration(description, diagramType, success, responseTime, error = null) {
    const meta = {
      descriptionLength: description.length,
      diagramType,
      responseTime: `${responseTime}ms`,
      success
    };

    if (error) {
      meta.error = error.message;
    }

    if (success) {
      this.info('Diagram generated successfully', meta);
    } else {
      this.error('Diagram generation failed', meta);
    }
  }

  /**
   * Log Gemini API usage
   */
  logGeminiUsage(inputTokens, outputTokens, success, error = null) {
    const meta = {
      inputTokens,
      outputTokens,
      success
    };

    if (error) {
      meta.error = error.message;
    }

    if (success) {
      this.info('Gemini API call successful', meta);
    } else {
      this.error('Gemini API call failed', meta);
    }
  }
}

module.exports = new Logger();
