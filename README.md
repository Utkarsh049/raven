# Raven

Raven is an installable, offline-capable notes platform organized as **Branch → Year → Subject → Chapter → Topic**. Content is managed entirely through a drag-and-drop admin "playground" — a taxonomy tree for structure, and a three-block chapter editor (markdown, image, YouTube) for content — while readers get an instant, app-like browsing experience with personal pinning and offline access.

> See `prd.md` for full product requirements, `architecture.md` for technical design, and `timeline.md` for the phased build plan.

## Features

- 📚 **Drag-and-drop taxonomy**: Branch → Year → Subject → Chapter → Topic, restructured by dragging nodes in a tree, no manual data entry
- 🧱 **Three-block chapter editor**: markdown/text, image, and YouTube blocks, reordered by drag-and-drop
- 👀 **Live split-view preview**: admin edits on one side, sees the exact published result on the other
- 🤖 **AI-assisted drafting**: "Generate with AI" on the markdown block, always admin-reviewed before saving
- ⚡ **Instant page loads**: static generation + on-demand revalidation — publishing reflects on the live site in seconds, no rebuild wait
- 📱 **Installable PWA** with offline access to previously viewed chapters
- 📌 **Pin subjects/chapters** to the homepage — pins, branch, and theme all persist offline (IndexedDB)
- 🌗 **Branch and light/dark theme toggle** from a settings drawer
- 🔍 **Client-side, offline-capable search**
- 💸 Runs entirely on **free-tier infrastructure** — no credit card required anywhere in the stack

## Tech stack

- **Framework:** Next.js 15 (App Router), TypeScript
- **CMS:** Payload CMS 3.0 (embedded in the same app)
- **Database & storage:** Supabase (Postgres + Storage), free tier
- **PWA:** Serwist
- **Admin UI:** react-arborist (taxonomy tree), dnd-kit (block reordering), Tiptap (markdown editing)
- **Client state/offline:** Zustand + Dexie.js (IndexedDB)
- **Search:** Fuse.js / FlexSearch (client-side)
- **Styling:** Tailwind CSS + shadcn/ui
- **Hosting:** Vercel (Hobby tier)

## Getting started

### Prerequisites

- Node.js 20+
- A free [Supabase](https://supabase.com) project (Postgres + Storage enabled) — no credit card required
- A free [Vercel](https://vercel.com) account for deployment

### 1. Clone and install

```bash
git clone <your-repo-url> raven
cd raven
npm install
```

### 2. Environment variables

Create a `.env.local` file in the project root:

```bash
# Supabase
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/postgres
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Payload
PAYLOAD_SECRET=<a-long-random-string>

# Revalidation (used by the admin publish hook)
REVALIDATE_SECRET=<a-long-random-string>

# Optional: AI-assisted markdown generation
AI_API_KEY=<your-provider-key>
```

### 3. Run database migrations

```bash
npm run payload:migrate
```

### 4. Start the dev server

```bash
npm run dev
```

- Public site: `http://localhost:3000`
- Admin playground: `http://localhost:3000/admin`

On first run, the admin panel prompts you to create the first admin user.

## Project structure

```
/app            Next.js routes: public reader pages, admin mount, API routes
/collections    Payload collection definitions: Node (taxonomy), Chapter (blocks)
/components
  /reader       Public-facing block renderers (markdown/image/youtube)
  /admin        Taxonomy tree (react-arborist), block editor (dnd-kit + Tiptap), live preview
/lib
  /db           Supabase client
  /search       Search index generation + Fuse/FlexSearch setup
  /offline      Dexie schema + Zustand store (branch, theme, pinned items)
/public         PWA manifest, icons
/sw             Service worker configuration (Serwist)
```

See `architecture.md` for a detailed breakdown of every layer.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build |
| `npm run start` | Start the production server locally |
| `npm run payload:migrate` | Run Payload/database migrations |
| `npm run lint` | Lint the codebase |

## Keeping the free tier alive

Supabase's free tier pauses a project after 7 days with no database activity. This repo includes a GitHub Actions workflow (`.github/workflows/keepalive.yml`) that pings a lightweight API route every few days to reset that window — no ongoing action needed once the workflow is enabled on your repo.

## Deployment

1. Push this repo to GitHub.
2. Import it into Vercel (Hobby tier is fine to start).
3. Add the same environment variables from `.env.local` to your Vercel project settings.
4. Deploy. From then on, publishing content from the admin playground updates the live site within seconds via on-demand revalidation — no redeploy required for content changes.

