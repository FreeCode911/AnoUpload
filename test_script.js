require('dotenv').config();
const AnoUploader = require('./index.js');

const uploader = new AnoUploader();
uploader.start(3000); // Start the server on port 3000
