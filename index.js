const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const crypto = require('crypto');
const sendDiscordNotification = require('./discordWebhook.js'); // Import the module

function AnoUploader() {
		dotenv.config();

		const app = express();
		const uploadFolder = process.env.UPLOAD_FOLDER;
	// Robust parsing: accept plain numbers (bytes) or human-friendly strings like '1gb', '1024MB'
	function parseSize(val){
		if(val === undefined || val === null) return NaN;
		if(typeof val === 'number') return val;
		const s = String(val).trim().toLowerCase();
		// pure number
		if(/^\d+$/.test(s)) return parseInt(s,10);
		// support suffixes
		const m = s.match(/^([\d.]+)\s*(b|kb|mb|gb|tb)?$/i);
		if(!m) return NaN;
		const n = parseFloat(m[1]);
		const suf = (m[2] || '').toLowerCase();
		const KB = 1024;
		const MB = KB * 1024;
		const GB = MB * 1024;
		const TB = GB * 1024;
		switch(suf){
			case 'tb': return Math.round(n * TB);
			case 'gb': return Math.round(n * GB);
			case 'mb': return Math.round(n * MB);
			case 'kb': return Math.round(n * KB);
			case 'b': return Math.round(n);
			default: return Math.round(n); // if no suffix but had decimals
		}
	}
	const maxContentLength = parseSize(process.env.MAX_CONTENT_LENGTH);
	const FALLBACK_MAX = 10 * 1024 * 1024 * 1024; // 10GB fallback when parsing fails
		const githubToken = process.env.GITHUB_TOKEN;
		const githubRepo = process.env.GITHUB_REPO;
		const webh = process.env.DISCORD_WEBHOOK_URL;
		// New flag: when set to 'false' (string), files will be served from the local uploads folder
		// Default: true (use GitHub as file backend)
		const useGithub = process.env.USE_GITHUB ? String(process.env.USE_GITHUB).toLowerCase() === 'true' : true;
		const websiteUrl = process.env.WEBSITE_URL || 'http://localhost';

		// Validate required configuration. If USE_GITHUB is disabled we don't require GitHub token/repo.
		if (!uploadFolder || isNaN(maxContentLength) || (!websiteUrl) || (useGithub && (!githubToken || !githubRepo))) {
		console.error(`
\x1b[31m================================\x1b[0m
\x1b[31m      ERROR: Configuration\x1b[0m
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

			// Only check GitHub config when running in GitHub storage mode
			if (useGithub) {
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
			} else {
				console.error(`\x1b[33m- Storage mode: Local file server (USE_GITHUB=false)\x1b[0m`);
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

	// Optionally, log a warning if DISCORD_WEBHOOK_URL is not set
	if (!webh) {
		console.warn(`\x1b[33m- DISCORD_WEBHOOK_URL Not Found (Discord notifications will be skipped)\x1b[0m`);
	} else {
		console.log(`\x1b[32m- DISCORD_WEBHOOK_URL Found\x1b[0m`);
	}

	console.log(`Resolved MAX_CONTENT_LENGTH = ${maxContentLength} bytes (${Number.isFinite(maxContentLength) ? (maxContentLength/1024/1024).toFixed(2)+' MB' : 'invalid'})`);
	if(!Number.isFinite(maxContentLength)){
		console.warn(`MAX_CONTENT_LENGTH invalid, using fallback ${Math.round(FALLBACK_MAX/1024/1024)} MB`);
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

	// Apply a permissive runtime limit to avoid accidental rejections from an unexpected parse/config issue.
	const appliedLimit = Number.isFinite(maxContentLength) ? maxContentLength : FALLBACK_MAX;
	const upload = multer({
		storage: storage,
		limits: { fileSize: appliedLimit }
	});
	console.log(`Applied multer fileSize limit = ${appliedLimit} bytes (${(appliedLimit/1024/1024).toFixed(2)} MB)`);

		// Ensure parts directory exists for chunked uploads
		const partsDir = path.join(uploadFolder, '.parts');
		if (!fs.existsSync(partsDir)) {
			try { fs.mkdirSync(partsDir, { recursive: true }); } catch(e){ console.error('Could not create parts dir', e && e.message); }
		}

			// Log POST body sizes for debugging (helps determine whether upstream proxy is rejecting)
			app.use((req, res, next) => {
				if (req.method === 'POST' && req.path === '/') {
					try{
						const cl = req.headers['content-length'] || 'unknown';
						console.log(`Incoming POST / - Content-Length: ${cl} - Remote: ${req.ip}`);
					}catch(e){}
				}
				next();
			});

	app.use(express.static(path.join(__dirname, 'public')));

	// Expose a small config endpoint so the client can read server limits (no secrets)
	app.get('/config', (req, res) => {
		try {
			const human = Number.isFinite(maxContentLength) ? (maxContentLength >= 1024*1024*1024 ? (maxContentLength/1024/1024/1024).toFixed(2)+' GB' : (maxContentLength/1024/1024).toFixed(0)+' MB') : null;
			res.json({
				maxContentLength: Number.isFinite(maxContentLength) ? maxContentLength : null,
				maxContentHuman: human,
				storageMode: useGithub ? 'github' : 'local'
			});
		} catch (err) {
			res.json({});
		}
	});

		app.get('/', (req, res) => {
				// Serve the main index - ensure absolute path is used
				const indexPath = path.resolve(__dirname, 'public', 'index.html');
				res.sendFile(indexPath, (err) => {
					if (err) {
						console.error(`Error sending upload form: ${err.message}`);
						res.status(500).send('Error loading upload form.');
					}
				});
		});

	// Accept one file per request under the field name 'file'
	app.post('/', upload.single('file'), async (req, res) => {
		// Log request headers for debugging (do not consume the stream)
		try{ console.log('POST / headers:', JSON.stringify({ 'content-length': req.headers['content-length'], 'transfer-encoding': req.headers['transfer-encoding'] || 'none' })); }catch(e){}
		const f = req.file;
		if(f){ try{ console.log(`Saved file metadata: originalname=${f.originalname} filename=${f.filename} size=${f.size}`); }catch(e){} }
		if (!f) {
			return res.status(400).send('No file uploaded. Use field name "file" for single uploads.');
		}

		try {
			let fileUrl = null;

			if (useGithub) {
				const octokit = await getOctokit();
				const filePath = f.path;
				const filename = f.filename;
				const content = fs.readFileSync(filePath);

				await octokit.repos.createOrUpdateFileContents({
					owner: githubRepo.split('/')[0],
					repo: githubRepo.split('/')[1],
					path: `cn/${filename}`,
					message: `Added ${filename}`,
					content: content.toString('base64')
				});

				fileUrl = `${websiteUrl.replace(/\/$/, '')}/cn/${filename}`;
				if (webh) await sendDiscordNotification(filename, fileUrl);
			} else {
				const filename = f.filename;
				fileUrl = `${websiteUrl.replace(/\/$/, '')}/uploads/${encodeURIComponent(filename)}`;
				if (webh) await sendDiscordNotification(filename, fileUrl);
			}

			// Default behaviour: return file URL and filename. Client can request scheduling separately.
			res.json({ file_url: fileUrl, filename: f.filename });
		} catch (error) {
			console.error('Error uploading file or sending Discord notification:', error && error.message ? error.message : error);
			res.status(500).send('Error uploading file');
		}
	});

	// Chunked upload endpoint: accepts a single chunk under field 'chunk'
	// Required body fields: uploadId, filename, index (0-based), total
	app.post('/upload-chunk', upload.single('chunk'), async (req, res) => {
		const part = req.file;
		try{ console.log('POST /upload-chunk headers:', JSON.stringify({ 'content-length': req.headers['content-length'], 'transfer-encoding': req.headers['transfer-encoding'] || 'none' })); }catch(e){}
		if(part){ try{ console.log(`Received chunk metadata: originalname=${part.originalname} filename=${part.filename} size=${part.size}`); }catch(e){} }
		const { uploadId, filename, index, total } = req.body || {};
		if(!part || !uploadId || !filename || typeof index === 'undefined' || typeof total === 'undefined'){
			return res.status(400).json({ error: 'Missing chunk metadata' });
		}

		const safe = path.basename(String(filename));
		const tmpPath = path.join(partsDir, `${uploadId}-${safe}.part`);

		try{
			// append chunk to temp part file
			fs.appendFileSync(tmpPath, fs.readFileSync(part.path));
			// remove uploaded chunk
			try{ fs.unlinkSync(part.path); }catch(e){}

			const idx = parseInt(index,10);
			const tot = parseInt(total,10);
			if(idx+1 >= tot){
				// finalize: move part to final filename
				const uniqueFilename = `${crypto.randomBytes(3).toString('hex').toUpperCase()}-${safe}`;
				const finalPath = path.join(uploadFolder, uniqueFilename);
				fs.renameSync(tmpPath, finalPath);

				const fileUrl = `${websiteUrl.replace(/\/$/, '')}/uploads/${encodeURIComponent(uniqueFilename)}`;
				if(webh) await sendDiscordNotification(uniqueFilename, fileUrl);
				// return filename so the client can schedule deletion if desired
				return res.json({ file_url: fileUrl, filename: uniqueFilename });
			}

			// not finished yet
			return res.json({ ok: true });
		} catch (err) {
			console.error('Error handling chunk:', err && err.message);
			return res.status(500).json({ error: 'Chunk handling error' });
		}
	});

		app.get('/uploads/:filename', (req, res) => {
			const { filename } = req.params;
			// Ensure we send an absolute path to res.sendFile to avoid the "path must be absolute" error
			const filePath = path.isAbsolute(uploadFolder) ? path.join(uploadFolder, filename) : path.resolve(uploadFolder, filename);
			res.sendFile(filePath, (err) => {
				if (err) {
					console.error(`Error sending file ${filename}: ${err.message}`);
					res.status(404).send('File not found.');
				}
			});
		});

		// UI: schedule a deletion for a file (hours from now). Body: { filename, hours }
		app.post('/schedule-delete', express.json(), (req, res) => {
			const { filename, hours } = req.body || {};
			if(!filename) return res.status(400).json({ error: 'filename required' });
			const ok = scheduleDeletion(filename, hours || 24);
			if(!ok) return res.status(400).json({ error: 'Could not schedule deletion (file missing or unsupported storage mode)' });
			return res.json({ ok: true, filename });
		});

		// UI: list scheduled deletions
		app.get('/scheduled', (req, res) => {
			const lifetimes = loadLifetimes();
			const list = Object.entries(lifetimes).map(([filename, expiresAt]) => ({ filename, expiresAt, expiresAtISO: new Date(Number(expiresAt)).toISOString() }));
			res.json({ scheduled: list });
		});

		// UI: cancel scheduled deletion for a filename
		app.post('/cancel-delete', express.json(), (req, res) => {
			const { filename } = req.body || {};
			if(!filename) return res.status(400).json({ error: 'filename required' });
			const lifetimes = loadLifetimes();
			if(!lifetimes[filename]) return res.status(404).json({ error: 'Not scheduled' });
			delete lifetimes[filename];
			saveLifetimes(lifetimes);
			return res.json({ ok: true, filename });
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
				const notFoundPath = path.resolve(__dirname, 'public', '404.html');
				res.status(404).sendFile(notFoundPath, (err) => {
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
\x1b[32m     AnoUpload Running\x1b[0m
\x1b[32m================================\x1b[0m
\x1b[32mVersion v2.0\x1b[0m
\x1b[32mWebsite: https://lykcloud.me\x1b[0m
\x1b[32mDiscord: https://discord.com/invite/jKzn4aMu8Z\x1b[0m
\x1b[32m================================\x1b[0m
\x1b[32mAnoUploader By LegendYt4k\x1b[0m
\x1b[32m================================\x1b[0m
				`);
				console.log(`\x1b[32mAnoUpload is running on Port :${port}\x1b[0m`);
		});

	// Lifetime scheduling helpers
	const lifetimesFile = path.join(uploadFolder, 'lifetimes.json');

	function loadLifetimes(){
		try{
			if(!fs.existsSync(lifetimesFile)) return {};
			const raw = fs.readFileSync(lifetimesFile, 'utf8');
			return JSON.parse(raw || '{}');
		}catch(e){
			console.error('Could not load lifetimes file:', e && e.message);
			return {};
		}
	}

	function saveLifetimes(obj){
		try{
			fs.writeFileSync(lifetimesFile, JSON.stringify(obj, null, 2));
		}catch(e){
			console.error('Could not save lifetimes file:', e && e.message);
		}
	}

	function scheduleDeletion(filename, hours){
		if(useGithub){
			// Scheduling deletion for GitHub-backed files isn't supported in this simple implementation
			return false;
		}
		const abs = path.join(uploadFolder, filename);
		if(!fs.existsSync(abs)) return false;
		const lifetimes = loadLifetimes();
		const expiresAt = Date.now() + (Number(hours) || 24) * 3600 * 1000;
		lifetimes[filename] = expiresAt;
		saveLifetimes(lifetimes);
		return true;
	}

	// Sweeper: run every 20s and remove expired files listed in lifetimes.json
	setInterval(() => {
		try{
			const lifetimes = loadLifetimes();
			const now = Date.now();
			let changed = false;
			for(const [filename, expiresAt] of Object.entries(lifetimes)){
				if(!expiresAt) continue;
				if(now >= Number(expiresAt)){
					const target = path.join(uploadFolder, filename);
					try{
						if(fs.existsSync(target)){
							fs.unlinkSync(target);
							console.log(`Auto-deleted expired file: ${filename}`);
						} else {
							console.log(`Expired file not found for deletion: ${filename}`);
						}
					}catch(e){ console.error(`Error deleting expired file ${filename}:`, e && e.message); }
					delete lifetimes[filename];
					changed = true;
				}
			}
			if(changed) saveLifetimes(lifetimes);
		}catch(e){
			console.error('Error in lifetimes sweeper:', e && e.message);
		}
	}, 20 * 1000);

		// Error handler to catch multer file size limit and respond with 413 and JSON
		app.use((err, req, res, next) => {
				if (err && err.code === 'LIMIT_FILE_SIZE') {
					console.error('Upload rejected: file too large');
					try{
						console.error('Request headers at failure:', JSON.stringify(req.headers, null, 2));
						console.error('Bytes received before failure:', req._bytesReceived || 0);
					}catch(e){}
					const human = Number.isFinite(maxContentLength) ? (maxContentLength >= 1024*1024*1024 ? (maxContentLength/1024/1024/1024).toFixed(2)+' GB' : (maxContentLength/1024/1024).toFixed(0)+' MB') : null;
					return res.status(413).json({ error: 'File too large', maxContentLength, maxContentHuman: human, bytesReceived: req._bytesReceived || 0 });
				}

			// If multer error object
			if (err && err instanceof multer.MulterError) {
				console.error('Multer error:', err.message);
				return res.status(400).json({ error: err.message });
			}

			// fallback
			if (err) {
				console.error('Server error:', err && err.message);
				return res.status(500).json({ error: 'Server error' });
			}

			next();
		});
}

AnoUploader();

// Error handling middleware (handle multer file size limit and return JSON)
// Place after AnoUploader is executed so app is available when created.
try {
	const appModule = require.cache[require.resolve('./index.js')];
	// This file defines and starts the app inside AnoUploader(); we already attached middleware inside the function.
} catch (e) {
	// noop
}

// Add a top-level error handler by re-opening the server file's app reference isn't trivial here because app is local in the function.
// Instead, ensure multer's limit triggers a descriptive error on the upload route by wrapping the upload handler above.  
