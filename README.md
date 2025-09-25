# TalentFlow — React App

A modern React application scaffolded with **Vite**, styled with **Tailwind**, and powered by **TanStack Query**, **MSW** (mock API), and **Dexie** (IndexedDB persistence). This repository demonstrates a mini hiring platform: Jobs, Candidates (including Kanban), and Assessments (builder + runtime).

---

## ✨ Features

* **Local‑first**: Data lives in IndexedDB via Dexie; persists across reloads
* **Mock API**: MSW handlers simulate REST with latency & occasional failures
* **Optimistic UI**: Reorder, edits, and stage changes feel instant
* **Assessments**: Builder with conditional logic, live preview, runtime validation
* **Kanban**: Drag & drop candidate stages (dnd‑kit)
* **Virtualized Lists**: Smooth large lists with react‑window
* **Routing**: React Router with deep links
* **Forms**: react‑hook‑form + Zod

---

## 🚀 Quick Start

```bash
# Create a new Vite + React + TS project
npm create vite@latest talentflow -- --template react-ts
cd talentflow

# Install dependencies
npm i react-router-dom @tanstack/react-query @tanstack/react-query-devtools \
  zod react-hook-form @hookform/resolvers \
  dexie localforage \
  msw \
  @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities \
  react-window react-virtualized-auto-sizer \
  clsx tailwind-merge lucide-react

# Tailwind setup
npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Initialize MSW service worker
npx msw init public/ --save

# Dev server
npm run dev
```

**Tailwind config**

```js
// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

**Global CSS**

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 📁 Project Structure

```
src/
  app/
    App.tsx
    routes.tsx
    providers/
      QueryProvider.tsx
      MSWProvider.tsx
  api/
    msw/handlers.ts
    msw/browser.ts
    client.ts
  data/
    db.ts
    seed.ts
    repository.ts
  features/
    jobs/ ...
    candidates/ ...
    assessments/ ...
  lib/
    types.ts
    utils.ts
    constants.ts
  ui/       # small Tailwind components (Button, Input, Toast, Dialog, etc.)
  main.tsx
  index.css
```

---

## 🔧 Scripts

```jsonc
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

---

## 🧰 Environment

No backend required. MSW intercepts `/jobs`, `/candidates`, `/assessments/*` and uses Dexie for persistence. Ensure `public/mockServiceWorker.js` exists (created by `npx msw init`).

---

## 🧪 Testing (optional)

* Unit: Vitest + React Testing Library
* MSW can be reused to stub network calls in tests

---

## 🧭 Conventions

* **Components**: function components with hooks only
* **Data**: remote state via React Query; local UI state via `useState`
* **Types**: Zod schemas export TypeScript types (via `z.infer`)
* **Styling**: Tailwind utility‑first; keep components presentational

---

## 🐞 Troubleshooting

* *Blank data / seed not loading*: ensure MSW worker started and `ensureSeed()` runs in `MSWProvider`
* *Service worker not found*: run `npx msw init public/ --save` and restart dev server
* *Autosave flicker while typing*: the Builder uses debounced optimistic saves; ensure you **don’t** `invalidateQueries` on save

---

## 📄 License

MIT — use freely for learning and internal demos.
