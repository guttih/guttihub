# Guttihub

IPTV streaming client built with [Next.js](https://nextjs.org).  
This project is designed to download and play IPTV streams from `.m3u` playlists, supporting playback and metadata management in a modern web interface.

---

## 🚀 Getting Started

To start the development server:

```bash
npm run dev
# or: yarn dev / pnpm dev / bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the app.

You can edit the main page by modifying `app/page.tsx`. The page supports hot reload during development.

---

## 🧑‍💻 Development Resources

- 📘 [Development Guide (`development.adoc`)](./docs/development.adoc)  
  Tips, tricks, naming conventions, and useful shell commands for working on this project.

- 📦 [Available Scripts (`scripts.adoc`)](./docs/scripts.adoc)  
  Full list of `npm` scripts and what they do — including linting, testing, and build commands.

---

## 🧪 Testing

This project uses [Vitest](https://vitest.dev) for unit testing.

```bash
npm run test         # Run all tests once
npm run test:watch   # Watch mode
npm run test:ui      # Open Vitest UI
```

---

## ✨ Features

- Built with the latest [Next.js](https://nextjs.org) (App Router & Turbopack)
- React 19
- Tailwind CSS for UI
- M3U playlist support (via HLS.js)
- Modern component structure and strict ESLint/TypeScript setup

---

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs) — features, APIs, and best practices
- [Learn Next.js](https://nextjs.org/learn) — interactive Next.js tutorial

---

## ☁️ Deploying

The recommended deployment method is via [Vercel](https://vercel.com).  
For more info, check out [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying).
