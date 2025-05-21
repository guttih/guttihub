# Guttihub 🎬

A full-featured IPTV streaming platform with in-app playback, stream recording, scheduled downloads, and live monitoring — all self-hosted and built with Next.js + React.

What started as a personal goal to master React and Next.js turned into a production-grade streaming app I use daily. You can schedule, record, watch, and share content — no third-party services, no cloud dependency, no database. Just clean architecture and total control.

---

## ✨ Highlights

- 📺 Stream `.m3u` playlist content with inline or popup video players
- 🔴 Record live streams on-demand or on a schedule
- 📥 Download content directly to the server and expose it like a streaming service
- 👥 Multiple users can share a single stream — one-to-many broadcasting
- 🔐 Google OAuth2 login with support for Admin / Moderator / Streamer / Viewer roles
- 📡 Live monitoring of active recordings and downloads (LiveMonitorPanel)
- 🧠 No database required — everything handled with JSON and local caching
- 📦 PM2 support for deployment, restart, and system service management
- 🛠️ Full CLI deploy script with system checks and `.env` generation

---

## 🚀 Getting Started (Dev Mode)

```bash
npm run dev
```

Then visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

Docs live in `./docs/`:

- 📘 [`development.adoc`](./docs/development.adoc) – Setup, PM2 usage, Tailwind, deployment
- 🔧 [`scripts.adoc`](./docs/scripts.adoc) – All available `npm run` commands
- 🔍 [`filters.adoc`](./docs/filters.adoc) – Regex filters for refining IPTV entries

---

## 🧪 Testing

Uses [Vitest](https://vitest.dev) for test coverage:

```bash
npm run test         # Run all tests once
npm run test:watch   # Live test mode
npm run test:ui      # Opens the test UI in your browser
```

---

## ☁️ Deployment

Deploy to your own server with:

```bash
bash scripts/deploy.sh
```

What it does:
- Validates environment files
- Copies `src/`, `.next/`, configs, and `.env.production` to your server
- Installs production deps
- Restarts the app with PM2

> Your server must have Node 20+, `ffmpeg`, `jq`, `curl`, `at`, and the `atd` service enabled.

🧠 No database required. The system runs entirely on file-based caching and local storage.

---

## 🛠️ Built With

- [Next.js](https://nextjs.org)
- [React 19](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [HLS.js](https://github.com/video-dev/hls.js)
- [PM2](https://pm2.keymetrics.io/)
- [Vitest](https://vitest.dev)

---

## 📅 Timeline

Built over ~4 weeks by [Guðjón Hólm](https://github.com/guttih),  
as project #41 on my personal site: [guttih.com](https://guttih.com)

And yes — it works. 😎  
