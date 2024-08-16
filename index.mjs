// index.mjs
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';
import crypto from 'crypto';
import sendDiscordNotification from './discordWebhook.js'; // Import the module

dotenv.config();

const app = express();
const uploadFolder = process.env.UPLOAD_FOLDER;
const maxContentLength = parseInt(process.env.MAX_CONTENT_LENGTH, 10);
const githubToken = process.env.GITHUB_TOKEN;
const githubRepo = process.env.GITHUB_REPO;
const websiteUrl = process.env.WEBSITE_URL || 'http://localhost'; // Default to http://localhost if not set
if (!uploadFolder || isNaN(maxContentLength) || !githubToken || !githubRepo || !websiteUrl) {
    console.error(`
\x1b[31m================================\x1b[0m
\x1b[31m          ERROR: Configuration\x1b[0m
\x1b[31m================================\x1b[0m
    Missing or incorrect environment variables:`);

    if (!uploadFolder) {
        console.error(`\x1b[31m- UPLOAD_FOLDER Not Found\x1b[0m`);
    } else {
        console.error(`\x1b[32m- UPLOAD_FOLDER Found\x1b[0m`);
    }

    if (isNaN(maxContentLength)) {
        console.error(`\x1b[31m- MAX_CONTENT_LENGTH Not Found or Invalid\x1b[0m`);
    } else {
        console.error(`\x1b[32m- MAX_CONTENT_LENGTH Found\x1b[0m`);
    }

    if (!githubToken) {
        console.error(`\x1b[31m- GITHUB_TOKEN Not Found\x1b[0m`);
    } else {
        console.error(`\x1b[32m- GITHUB_TOKEN Found\x1b[0m`);
    }

    if (!githubRepo) {
        console.error(`\x1b[31m- GITHUB_REPO Not Found\x1b[0m`);
    } else {
        console.error(`\x1b[32m- GITHUB_REPO Found\x1b[0m`);
    }

    if (!websiteUrl) {
        console.error(`\x1b[31m- WEBSITE_URL Not Found\x1b[0m`);
    } else {
        console.error(`\x1b[32m- WEBSITE_URL Found\x1b[0m`);
    }

    console.error(`Please set them in your .env file.
\x1b[31m================================\x1b[0m
    `);
    process.exit(1); // Exit the process with an error code
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

app.use(express.static('public'));

// Route for the upload form
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'upload.html'), (err) => {
        if (err) {
            console.error(`Error sending upload form: ${err.message}`);
            res.status(500).send('Error loading upload form.');
        }
    });
});

// Define a route to handle file listing
app.get('/files', (req, res) => {
    const folderPath = uploadFolder; // Path to your folder containing files

    fs.readdir(folderPath, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err.message);
            res.status(500).send('Error reading directory.');
            return;
        }

        const fileUrls = files.map(file => `/uploads/${file}`);

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Files in Folder</title>
            </head>
            <body>
                <h1>Files in Folder</h1>
                <ul>
                    ${fileUrls.map(url => `<li><a href="${url}" target="_blank">${url}</a></li>`).join('')}
                </ul>
            </body>
            </html>
        `);
    });
});

// Route for file upload
app.post('/', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
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

        const fileUrl = `${websiteUrl}cn/${filename}`;

        // Send notification to Discord
        await sendDiscordNotification(filename, fileUrl); // Use the imported function

        res.json({ file_url: fileUrl });
    } catch (error) {
        console.error('Error uploading file to GitHub or sending Discord notification:', error.message);
        res.status(500).send('Error uploading file to LykCloud');
    }
});

// Route for accessing uploaded files
app.get('/uploads/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(uploadFolder, filename);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(`Error sending file ${filename}: ${err.message}`);
            res.status(404).send('File not found.');
        }
    });
});

// Route for file_uploaded page
app.get('/file_uploaded', (req, res) => {
    const { file_url } = req.query;
    if (file_url) {
        res.send(`<html><body><p>File uploaded: <a href="${file_url}">${file_url}</a></p></body></html>`);
    } else {
        res.status(404).send('File URL not found.');
    }
});

// Custom 404 error handler
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(process.cwd(), 'public', '404.html'), (err) => {
        if (err) {
            console.error(`Error sending 404 page: ${err.message}`);
            res.status(500).send('Error loading 404 page.');
        }
    });
});

const port = process.env.PORT || 49098;

app.listen(port, () => {
    console.log(`
\x1b[32m================================\x1b[0m
\x1b[32m     AnoUpload Starting\x1b[0m
\x1b[32m================================\x1b[0m
\x1b[32mVersion v1.2\x1b[0m
\x1b[32mWebsite: https://lykcloud.me\x1b[0m
\x1b[32mDiscord: https://lykcloud.me\x1b[0m
\x1b[32m================================\x1b[0m
\x1b[32mAnoUploader By LegendYt4k\x1b[0m
\x1b[32m================================\x1b[0m
`);
    console.log(`\x1b[32mAnoUpload is running on Port :${port}\x1b[0m`);
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