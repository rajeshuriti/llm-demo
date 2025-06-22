#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Setup script for Mermaid Diagram Generator
 * This script helps users configure the application
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🚀 Welcome to Mermaid Diagram Generator Setup!\n');
  
  // Check if .env already exists
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  
  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env file already exists.');
    const overwrite = await question('Do you want to overwrite it? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }
  
  console.log('📝 Let\'s configure your environment variables:\n');
  
  // Get Gemini API key
  const apiKey = await question('Enter your Google Gemini API key: ');
  if (!apiKey.trim()) {
    console.log('❌ API key is required. Setup cancelled.');
    rl.close();
    return;
  }
  
  // Get port (optional)
  const port = await question('Enter port number (default: 3000): ') || '3000';
  
  // Get environment
  const nodeEnv = await question('Enter environment (development/production, default: development): ') || 'development';
  
  // Get CORS origins (optional)
  const corsOrigins = await question('Enter allowed CORS origins (comma-separated, default: localhost:3000): ') || 'http://localhost:3000';
  
  // Create .env content
  const envContent = `# Google Gemini API Configuration
GEMINI_API_KEY=${apiKey}

# Server Configuration
PORT=${port}
NODE_ENV=${nodeEnv}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
ALLOWED_ORIGINS=${corsOrigins}
`;

  // Write .env file
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ .env file created successfully!');
  } catch (error) {
    console.log('\n❌ Failed to create .env file:', error.message);
    rl.close();
    return;
  }
  
  // Create logs directory
  const logsDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    try {
      fs.mkdirSync(logsDir, { recursive: true });
      console.log('✅ Logs directory created successfully!');
    } catch (error) {
      console.log('⚠️  Warning: Could not create logs directory:', error.message);
    }
  }
  
  console.log('\n🎉 Setup completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Run "npm install" to install dependencies');
  console.log('2. Run "npm start" to start the application');
  console.log('3. Open http://localhost:' + port + ' in your browser');
  console.log('\nFor development with auto-reload, use "npm run dev"');
  
  rl.close();
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.log('\n❌ Setup failed:', error.message);
  rl.close();
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n\nSetup cancelled by user.');
  rl.close();
  process.exit(0);
});

main().catch((error) => {
  console.log('\n❌ Setup failed:', error.message);
  rl.close();
  process.exit(1);
});
