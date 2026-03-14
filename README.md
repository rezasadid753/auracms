# 🌌 Aura CMS

A professional, full-stack personal portfolio CMS designed for creators, developers, and designers. Aura allows you to deploy a complete personal website in minutes and manage all your content through a secure, intuitive administrative dashboard.

## 🌟 Key Features

- **🎨 Fully Customizable**: Change your name, profession, and profile image directly from the admin panel.
- **📁 Integrated File Manager**: Securely upload and manage large files with password protection.
- **🔗 Smart Links**: Create dynamic sections for your social profiles, projects, and public downloads.
- **📩 Visitor Inbox**: Receive messages and file attachments from visitors directly in your dashboard.
- **📊 Engagement Tracking**: Monitor clicks and downloads for all your shared links and files.
- **🌍 Multi-Language Support**: Built-in support for English and Persian (Farsi) with RTL optimization.

## 🛠️ Tech Stack

- **Frontend**: React 19, Tailwind CSS 4, Motion, Lucide Icons.
- **Backend**: Node.js, Express.
- **Database**: SQLite (via `better-sqlite3`) - Zero configuration required.
- **Language**: TypeScript.

## 🚀 Getting Started

### 1. Requirements
Ensure you have [Node.js 18+](https://nodejs.org/) installed.

### 2. Installation
Clone the repository and install dependencies:

```bash
npm install
```

### 3. Running the Application
Start the application using PM2:

```bash
pm2 start "npm run dev" --name "auracms"
```

### 4. Nginx Configuration
If you are using Nginx as a reverse proxy, use the following configuration:

```nginx
location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Disable buffering for dev server streaming
        proxy_buffering off;
        
        # Prevent caching of the dev server response
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
        expires off;
    }
```

## 🔐 Security Configuration

By default, the application comes with the following credentials:
- **Admin Panel Password**: `1212`
- **Links & Files Section Password**: `2323`

It is highly recommended that you change these passwords before deploying your application. You can update them by searching for these values in the `server.ts` file and replacing them with your desired passwords.

## 📂 Project Structure

- `src/`: Frontend React application.
- `server.ts`: Express backend server and API endpoints.
- `data/`: SQLite database storage (automatically created).
- `uploads/`: Directory for uploaded files.

## 📝 License

Licensed under the MIT License.
Feel free to use and modify for your own personal portfolio!

---

<p align="center">
  Empowering creators to share their work with the world. 🌌
</p>
