
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
    console.log('Test 1 passed: Error caught when environment variables are missing');
}
