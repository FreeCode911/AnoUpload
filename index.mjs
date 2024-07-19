
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const app = express();
const uploadFolder = process.env.UPLOAD_FOLDER;
const maxContentLength = parseInt(process.env.MAX_CONTENT_LENGTH, 10);


if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder);
}
//zdz@VaqhqVRm88r
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

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
    res.sendFile(path.join(process.cwd(), 'public', 'upload.html'));
});


// Define a route to handle file listing
app.get('/files', (req, res) => {
    const folderPath = 'uploads'; // Path to your folder containing files

    // Read the contents of the folder
    fs.readdir(folderPath, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            res.status(500).send('Error reading directory');
            return;
        }

        // Create an array of file URLs
        const fileUrls = files.map(file => `/files/${file}`);

        // Render the HTML page with the list of file URLs
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
            owner: process.env.GITHUB_REPO.split('/')[0],
            repo: process.env.GITHUB_REPO.split('/')[1],
            path: `cn/${filename}`,
            message: `Added ${filename}`,
            content: content.toString('base64')
        });

        const fileUrl = `https://lykfile.me/cn/${filename}`;

        res.json({ file_url: fileUrl });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error uploading file to LykCloud');
    }
});

// Route for accessing uploaded files
app.get('/uploads/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(uploadFolder, filename);
    res.sendFile(filePath);
});

// Route for file_uploaded page
app.get('/file_uploaded', (req, res) => {
    const { file_url } = req.query;
    if (file_url) {
        res.send(`<html><body><p>File uploaded: <a href="${file_url}">${file_url}</a></p></body></html>`);
    } else {
        res.status(404).send('File URL not found');
    }
});

// Custom 404 error handler
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(process.cwd(), 'public', '404.html'));
});

const port = process.env.PORT || 49098;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
// Function to delete all files in uploads folder every 10 seconds
setInterval(() => {
    fs.readdir(uploadFolder, (err, files) => {
        if (err) {
            console.error('Error reading upload folder:', err);
            return;
        }

        for (const file of files) {
            fs.unlink(path.join(uploadFolder, file), err => {
                if (err) {
                    console.error(`Error deleting file ${file}:`, err);
                    return;
                }
                console.log(`Deleted ${file}`);
            });
        }
    });
}, 1800000);
