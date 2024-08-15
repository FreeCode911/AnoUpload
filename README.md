
# AnoUpload 🚀

AnoUpload is a sleek and user-friendly file hosting service that allows you to upload files with ease while keeping your identity safe and secure. Built with the powerful combination of Node.js, Express, and Multer, AnoUpload makes file sharing and storage a breeze!, Anonymous File Uploader Using GitHub Cloud Storage


## 🌟 Features

- **🔓 Free and Unlimited File Hosting:** Upload as many files as you want without any size limitations.
- **🕵️‍♂️ Anonymous Uploads:** No need to register or create an account—your identity stays hidden.
- **🔒 Secure File Sharing:** Files are stored securely and can be accessed via unique URLs.
- **🔗 Automatic GitHub Integration:** Files are seamlessly uploaded to a GitHub repository for long-term storage.
- **📩 Discord Notifications:** Get real-time notifications whenever a new file is uploaded.

## 🚀 Getting Started

1. **🍴 Fork this Repo:** Click the "Fork" button at the top right of this Repl.
2. **⚙️ Set up Environment Variables:**
   - Create a `.env` file in the root directory of your forked Repl.
   - Add the following environment variables with your values:
     - `UPLOAD_FOLDER`: The directory where uploaded files will be stored (e.g., "uploads").
     - `MAX_CONTENT_LENGTH`: The maximum allowed file size in bytes (e.g., 1073741824 for 1GB).
     - `GITHUB_TOKEN`: A GitHub personal access token with the `repo` scope. Generate one [here](https://github.com/settings/tokens).
     - `GITHUB_REPO`: Your GitHub repository name in the format `owner/repo` (e.g., `FreeCode911/AnoUpload`).
     - `WEBSITE_URL`: The URL of your deployed Repl (e.g., `https://your-name.com`).
3. **▶️ Run the AnoUpload:** `npm start`
4. **🌐 Access the Website:** Open the link provided in the console output to access your AnoUpload instance.

## 📜 License

This project is licensed under the MIT License. For more details, see the `LICENSE` file.
