
const AnoUploader = require('./index.js');

// Test with all environment variables set
process.env.UPLOAD_FOLDER = './uploads';
process.env.MAX_CONTENT_LENGTH = '10485760';
process.env.GITHUB_TOKEN = 'test_token';
process.env.GITHUB_REPO = 'test/repo';
process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';
process.env.WEBSITE_URL = 'http://localhost:3000';

try {
    const uploader = new AnoUploader();
    console.log('Test 2 passed: AnoUploader initialized successfully');
    // Since start() method runs the server, we'll just log success without calling it
} catch (error) {
    console.error('Test 2 failed:', error);
}
