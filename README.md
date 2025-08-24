
# AnoUpload v2.0 — Modern anonymous file uploader 🚀

AnoUpload is a compact, privacy-minded file uploader built with Node.js, Express and Multer. Version 2.0 focuses on reliability, a modern UI, and large-file resilience (client chunking + server reassembly).

![License](https://img.shields.io/badge/license-GPL--3.0-blue)

## What's new in v2.0

- Modernized single-page UI with dark purple theme, responsive layout and mobile support
- Optional Discord notifications: server no longer requires `DISCORD_WEBHOOK_URL` (notifications skipped when unset)
- Robust `MAX_CONTENT_LENGTH` parsing (supports `1gb`, `1024MB`, etc.) and human-readable `/config` endpoint
- Sequential uploads and client-side chunking (default 8 MB chunks) with server-side `/upload-chunk` support
- Improved error handling and debug logging (413 JSON responses include configured limits and bytes received)
- Local upload history (browser localStorage), drag-and-drop, previews, and copy/open shortcuts

## Highlights

- Runtime: Node.js + Express
- Upload handling: Multer (disk storage) + chunk reassembly endpoint
- Storage: Local filesystem by default, optional GitHub-backed storage

Key endpoints
- `GET /` → web UI (`public/index.html`)
- `GET /config` → server limits and storage mode
- `POST /` → single-file upload (small files)
- `POST /upload-chunk` → appendable chunk upload for large files
- `GET /uploads/:filename` → serve uploaded files

## Quick start

1. Clone and install:

```bash
git clone https://github.com/FreeCode911/AnoUpload.git
cd AnoUpload
npm install
```

2. Create a `.env` file in the project root and set the minimum variables you need:

```
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=1gb            # accepts human formats like 1gb, 1024MB, 1000000000
USE_GITHUB=false                  # true to push to GitHub instead of local disk
GITHUB_TOKEN=                       # optional, required if USE_GITHUB=true
GITHUB_REPO=                        # optional
DISCORD_WEBHOOK_URL=none           # optional; leave unset or "none" to disable notifications
```

3. Start the server:

```bash
npm start
```

4. Open the web UI in your browser at the address printed by the server (or visit `http://localhost:8080`).

## Large-file flow (overview)

- Client uploads files one-by-one; files larger than the chunk threshold are split into chunks (default 8 MB).
- Each chunk is posted to `POST /upload-chunk` with metadata (uploadId, filename, index, total, isLast).
- Server appends chunks to a temporary file and finalizes the upload when the last chunk arrives.

This avoids many upstream single-request size limits. If your host still rejects chunked POSTs, try reducing chunk size or increase proxy limits (e.g., NGINX `client_max_body_size`).

## Configuration & environment variables

- `UPLOAD_FOLDER` — Directory to store uploads (default: `uploads`)
- `MAX_CONTENT_LENGTH` — Maximum file size accepted by server (bytes or human like `1gb`)
- `USE_GITHUB` — `true` to push files to GitHub instead of disk
- `GITHUB_TOKEN`, `GITHUB_REPO` — required when `USE_GITHUB=true`
- `DISCORD_WEBHOOK_URL` — Optional; leave unset or `none` to disable notifications

The server exposes `GET /config` which returns `maxContentLength` and `maxContentHuman` for client enforcement.

## Troubleshooting

- 413 Request Entity Too Large (HTML nginx 413 returned immediately): upstream proxy likely rejected the request before Node received the body. Use client chunking or increase proxy limits on the host.
- If server logs show `bytesReceived` ≈ 0 for a failed upload, that confirms upstream rejection.

## Development notes

- Main files:
   - `index.js` — server entrypoint, parsing, chunk reassembly and debug logging
   - `public/index.html` — UI, drag/drop, chunked upload client and history
   - `discordWebhook.js` — optional webhook notifier

## Changelog (v2.0)

- 2.0.0 — 2025-08-24
   - UI refresh, optional webhook, MAX_CONTENT_LENGTH improvements, client chunking + `/upload-chunk`, enhanced logging

## License

GPL-3.0 — see `LICENSE`

---

If you'd like, I can add an `UPGRADE.md` with migration notes or embed a small screenshot/GIF of the new UI.
