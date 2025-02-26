const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const crypto = require('crypto');
const sendDiscordNotification = require('./discordWebhook.js');

function AnoUploader() {
    dotenv.config();

    const app = express();
    const uploadFolder = process.env.UPLOAD_FOLDER;
    const maxContentLength = parseInt(process.env.MAX_CONTENT_LENGTH, 10);
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO;
    const webh = process.env.DISCORD_WEBHOOK_URL;
    const websiteUrl = process.env.WEBSITE_URL || 'http://localhost';

    function checkConfig() {
        if (!uploadFolder || isNaN(maxContentLength) || !githubToken || !githubRepo || !websiteUrl || !webh) {
            console.error(`
================================
      ERROR: Configuration
================================
Missing or incorrect environment variables:`);
            if (!uploadFolder) {
                console.error(`- UPLOAD_FOLDER Not Found`);
            } else {
                console.error(`- UPLOAD_FOLDER Found`);
            }
            if (isNaN(maxContentLength)) {
                console.error(`- MAX_CONTENT_LENGTH Not Found or Invalid`);
            } else {
                console.error(`- MAX_CONTENT_LENGTH Found`);
            }
            if (!githubToken) {
                console.error(`- GITHUB_TOKEN Not Found`);
            } else {
                console.error(`- GITHUB_TOKEN Found`);
            }
            if (!webh) {
                console.error(`- DISCORD_WEBHOOK_URL Not Found`);
            } else {
                console.error(`- DISCORD_WEBHOOK_URL Found`);
            }
            if (!githubRepo) {
                console.error(`- GITHUB_REPO Not Found`);
            } else {
                console.error(`- GITHUB_REPO Found`);
            }
            if (!websiteUrl) {
                console.error(`- WEBSITE_URL Not Found`);
            } else {
                console.error(`- WEBSITE_URL Found`);
            }
            console.error(`Please set them in your .env file.
================================
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
    }

    checkConfig();

    // Import Octokit dynamically
    async function getOctokit() {
        const { Octokit } = await import('@octokit/rest');
        return new Octokit({ auth: githubToken });
    }

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

    app.use(express.static(path.join(__dirname, 'public')));

    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'upload.html'), (err) => {
            if (err) {
                console.error(`Error sending upload form: ${err.message}`);
                res.status(500).send('Error loading upload form.');
            }
        });
    });

    app.post('/', upload.single('file'), async (req, res) => {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        const { filename, path: filePath } = req.file;

        try {
            const content = fs.readFileSync(filePath);
            const octokit = await getOctokit();

            await octokit.repos.createOrUpdateFileContents({
                owner: githubRepo.split('/')[0],
                repo: githubRepo.split('/')[1],
                path: `cn/${filename}`,
                message: `Added ${filename}`,
                content: content.toString('base64')
            });

            const fileUrl = `${websiteUrl}/cn/${filename}`;

            await sendDiscordNotification(filename, fileUrl);

            res.json({ file_url: fileUrl });
        } catch (error) {
            console.error('Error uploading file to GitHub or sending Discord notification:', error.message);
            res.status(500).send('Error uploading file to LykCloud');
        }
    });

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

    app.get('/file_uploaded', (req, res) => {
        const { file_url } = req.query;
        if (file_url) {
            res.send(`<html><body><p>File uploaded: <a href="${file_url}">${file_url}</a></p></body></html>`);
        } else {
            res.status(404).send('File URL not found.');
        }
    });

    app.use((req, res, next) => {
        res.status(404).sendFile(path.join(__dirname, 'public', '404.html'), (err) => {
            if (err) {
                console.error(`Error sending 404 page: ${err.message}`);
                res.status(500).send('Error loading 404 page.');
            }
        });
    });

    return {
        start: function(port) {
            port = port || process.env.PORT || 49098;
            app.listen(port, () => {
                console.log(`
================================
     AnoUpload Running
================================
Version v1.6
Website: https://lykcloud.me
Discord: https://discord.com/invite/jKzn4aMu8Z
================================
AnoUploader By LegendYt4k
================================
                `);
                console.log(`AnoUpload is running on Port :${port}`);
            });

            setInterval(() => {
                fs.readdir(uploadFolder, (err, files) => {
                    if (err) {
                        console.error('Error reading upload folder:', err);
                        return;
                    }
                    const now = Date.now();
                    files.forEach(file => {
                        const filePath = path.join(uploadFolder, file);
                        fs.stat(filePath, (err, stats) => {
                            if (err) {
                                console.error(`Error getting file stats for ${file}:`, err);
                                return;
                            }
                            const age = now - stats.mtime.getTime();
                            if (age > 24 * 60 * 60 * 1000) { // 24 hours
                                fs.unlink(filePath, err => {
                                    if (err) {
                                        console.error(`Error deleting file ${file}:`, err);
                                    } else {
                                        console.log(`Deleted old file: ${file}`);
                                    }
                                });
                            }
                        });
                    });
                });
            }, 60 * 60 * 1000); // Check every hour
        }
    };
}

module.exports = AnoUploader;
