import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { sendDiscordNotification } from './discordWebhook.js'; // Import the function

dotenv.config();

const app = express();
const uploadFolder = process.env.UPLOAD_FOLDER;
const maxContentLength = parseInt(process.env.MAX_CONTENT_LENGTH, 10);
const githubToken = process.env.GITHUB_TOKEN;
const githubRepo = process.env.GITHUB_REPO;
const websiteUrl = process.env.WEBSITE_URL || 'http://localhost';

if (!uploadFolder || isNaN(maxContentLength) || !githubToken || !githubRepo || !websiteUrl) {
    console.error(`Missing or incorrect environment variables.`);
    process.exit(1);
}

if (!fs.existsSync(uploadFolder)) {
    try {
        fs.mkdirSync(uploadFolder);
        console.log(`Upload folder ${uploadFolder} created.`);
    } catch (err) {
        console.error(`Error creating upload folder: ${err.message}`);
        process.exit(1);
    }
}

const octokit = new Octokit({ auth: githubToken });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadFolder);
    },
    filename: (req, file, cb) => {
        const originalFilename = file.originalname;
        const randomString = crypto.randomBytes(3).toString('hex').toUpperCase();
        const uniqueFilename = `${randomString}-${originalFilename}`;
        cb(null, uniqueFilename);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: maxContentLength }
});

app.use(express.json());

// Health Check Endpoint
app.get('/', (req, res) => {
    res.json({ message: 'AnoUpload API is running', version: 'v1.1' });
});

// Upload File Endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { filename, path: filePath } = req.file;

    try {
        const content = fs.readFileSync(filePath);
        await octokit.repos.createOrUpdateFileContents({
            owner: githubRepo.split('/')[0],
            repo: githubRepo.split('/')[1],
            path: `cn/${filename}`,
            message: `Added ${filename}`,
            content: content.toString('base64')
        });

        const fileUrl = `${websiteUrl}/cn/${filename}`;

        // Send notification to Discord
        await sendDiscordNotification(filename, fileUrl);

        res.json({ file_url: fileUrl, message: 'File uploaded successfully' });
    } catch (error) {
        console.error('Error uploading file to GitHub or sending Discord notification:', error.message);
        res.status(500).json({ error: 'Error uploading file to LykCloud' });
    }
});

// List Files Endpoint
app.get('/files', (req, res) => {
    fs.readdir(uploadFolder, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err.message);
            return res.status(500).json({ error: 'Error reading directory.' });
        }

        const fileUrls = files.map(file => ({
            filename: file,
            url: `${websiteUrl}/uploads/${file}`
        }));

        res.json({ files: fileUrls });
    });
});

// Access Uploaded File Endpoint
app.get('/uploads/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(uploadFolder, filename);

    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(`Error sending file ${filename}: ${err.message}`);
            return res.status(404).json({ error: 'File not found.' });
        }
    });
});

// Delete Uploaded File Endpoint
app.delete('/uploads/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(uploadFolder, filename);

    fs.unlink(filePath, (err) => {
        if (err) {
            console.error(`Error deleting file ${filename}: ${err.message}`);
            return res.status(500).json({ error: 'Error deleting file.' });
        }
        res.json({ message: `File ${filename} deleted successfully.` });
    });
});

// Custom 404 handler for undefined API routes
app.use((req, res, next) => {
    res.status(404).json({ error: 'Route not found.' });
});

const port = process.env.PORT || 49098;

app.listen(port, () => {
    console.log(`AnoUpload API is running on ${websiteUrl}:${port}`);
});

// Function to delete all files in uploads folder every 30 minutes
setInterval(() => {
    fs.readdir(uploadFolder, (err, files) => {
        if (err) {
            console.error('Error reading upload folder:', err.message);
            return;
        }

        for (const file of files) {
            fs.unlink(path.join(uploadFolder, file), err => {
                if (err) {
                    console.error(`Error deleting file ${file}:`, err.message);
                    return;
                }
                console.log(`Deleted ${file}`);
            });
        }
    });
}, 1800000); // 30 minutes in milliseconds
