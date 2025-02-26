
const AnoUploader = require('./index.js');

// Test with missing environment variables
process.env.UPLOAD_FOLDER = '';
process.env.MAX_CONTENT_LENGTH = '';
process.env.GITHUB_TOKEN = '';
process.env.GITHUB_REPO = '';
process.env.DISCORD_WEBHOOK_URL = '';
process.env.WEBSITE_URL = '';

try {
    const uploader = new AnoUploader();
    uploader.start(3000);
} catch (error) {
    console.log('Test passed: Error caught when environment variables are missing');
}

// Test with all environment variables set
process.env.UPLOAD_FOLDER = './uploads';
process.env.MAX_CONTENT_LENGTH = '10485760';
process.env.GITHUB_TOKEN = 'test_token';
process.env.GITHUB_REPO = 'test/repo';
process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';
process.env.WEBSITE_URL = 'http://localhost:3000';

try {
    const uploader = new AnoUploader();
    console.log('Test passed: AnoUploader initialized successfully');
} catch (error) {
    console.error('Test failed:', error);
}
