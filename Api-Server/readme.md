## 🚀 API Server for AnoUpload 📁

This API Only AnoUpload No GUI

Here's the updated README with instructions for uploading files using `curl`:

## 🌟 Features

- **📤 File Upload:** Easily upload files to the server.
- **📂 File Listing:** View all files that have been uploaded.
- **🔗 GitHub Integration:** Automatically upload files to your GitHub repository.
- **📣 Discord Notifications:** Receive instant notifications in a Discord channel whenever a new file is uploaded.

## 🛠️ Setup

### 1. 📦 Clone the Repository

Start by cloning the repository that contains this API server:

```bash
git clone https://github.com/FreeCode911/AnoUpload.git
cd AnoUpload/Api-Server
```

### 2. ⚙️ Install Dependencies

Make sure you have the necessary dependencies installed. If you're using Node.js, run:

```bash
npm install
```

### 3. 🗝️ Configure Environment Variables

Create a `.env` file in the root directory and set up your environment variables. You'll need to specify details for GitHub integration, Discord notifications, and file storage.

## 📤 Uploading Files

You can upload files to the server using `curl`. Here’s how:

### **Upload a File**

Use the following `curl` command to upload a file:

```bash
curl -X POST http://localhost:8080/upload \
  -F "file=@/path/to/your/file"
```

- **`http://your-server-url/upload`**: Replace this with the URL of your file upload endpoint.
- **`/path/to/your/file`**: Replace this with the path to the file you want to upload.

### **List All Files**

To list all uploaded files, use:

```bash
curl -X GET http://your-server-url/files 
```

## 🔧 Configuration

### **GitHub Integration**

Ensure you have set up your GitHub repository in the `.env` file. Files uploaded to the server will be automatically pushed to this repository.

### **Discord Notifications**

Configure your Discord webhook URL in the `.env` file to receive notifications when a new file is uploaded.

## 📜 Notes

- Ensure the server is running before making `curl` requests.
- Make sure to replace placeholder values in commands with your actual server details and credentials.
