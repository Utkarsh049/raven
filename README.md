# Raven

Raven is an enterprise-grade, offline-first curriculum and notes publishing platform. It structures educational content hierarchically across **Branch → Year → Subject → Chapter → Topic** with instant search, progressive web app (PWA) offline capabilities, and a headless content management system.

The platform provides a dual-interface architecture:
1. **Reader Interface:** High-performance, statically generated, and cached reader views with local pinning, offline reading, responsive navigation, and instantaneous client-side search.
2. **Editorial Control Plane:** A visual administration suite powered by Payload CMS featuring drag-and-drop taxonomy reorganization, block-based rich text composition, live side-by-side rendering, and AI-assisted drafting.

---

## Architectural Highlights

- **Hierarchical Taxonomy Engine:** Complete structural control over branches, academic years, subjects, chapters, and topics through an interactive tree interface.
- **Modular Block Editor:** Structured chapter authoring supporting markdown typography, optimized cloud-hosted images, and embedded video blocks with drag-and-drop reordering.
- **Real-Time Split Preview:** Side-by-side authoring interface delivering accurate live previews matching public reader typography and layouts.
- **Incremental Static Regeneration (ISR):** Content changes published in the administration panel invalidate caches on demand within seconds without requiring full site rebuilds.
- **Offline-First Progressive Web App (PWA):** Service worker architecture leveraging Serwist and Stale-While-Revalidate caching strategies for zero-latency page transitions and offline reading.
- **Client-Side Storage & State Synchronization:** Local state, theme settings, branch preferences, and pinned content persisted locally via Dexie.js (IndexedDB) and Zustand.
- **Decoupled Search Infrastructure:** Fast, client-side indexing and fuzzy search with Fuse.js, operating entirely offline once cached.

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | Next.js 15 (App Router, Turbopack), React 19, TypeScript |
| **Content Management** | Payload CMS 3.0 (Embedded) |
| **Database & Storage** | PostgreSQL via Supabase (Database, Auth, Storage) |
| **Service Worker & PWA** | Serwist (`@serwist/next`) |
| **Client Storage** | IndexedDB via Dexie.js, Zustand |
| **Editor & UI Components** | Tiptap, Radix UI / shadcn/ui, dnd-kit, Tailwind CSS |
| **Search Engine** | Fuse.js (Client-side vector/fuzzy search index) |

---

## Project Structure

```
├── app/
│   ├── (frontend)/          # Reader interface, routes, layouts, and views
│   ├── (payload)/           # Payload CMS admin interface and endpoints
│   ├── api/                 # Internal REST endpoints and search index generators
│   ├── globals.css          # Global CSS, theme definitions, and base layers
│   ├── manifest.ts          # Web App Manifest definition
│   └── sw.ts                # Serwist service worker runtime caching rules
├── collections/             # Payload CMS collection definitions (Nodes, Users)
├── components/
│   ├── admin/               # Administrative views, taxonomy managers, and split editor
│   ├── pins/                # Offline bookmarking and pinning components
│   ├── pwa/                 # PWA lifecycle, install prompts, and service worker registration
│   ├── reader/              # Public-facing block renderers and markdown parsing
│   ├── search/              # Client-side search interface and modal
│   ├── settings/            # Theme and preference drawers
│   └── ui/                  # Reusable UI component primitives
├── lib/                     # Database utilities, indexing logic, and state stores
└── public/                  # Static assets, branding icons, and service worker output
```

---

## Getting Started

### Prerequisites

- Node.js 20.x or higher (or Bun 1.1+)
- PostgreSQL database instance (e.g., Supabase)
- Supabase project with Storage enabled for media assets

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url> raven
   cd raven
   ```

2. Install dependencies:
   ```bash
   bun install
   # or: npm install
   ```

3. Configure environment variables:
   Create a `.env.local` file in the root directory with the following variables:
   ```env
   # Database & Supabase
   DATABASE_URL=postgresql://<user>:<password>@<host>:5432/postgres
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

   # Payload CMS
   PAYLOAD_SECRET=<secure-random-string>

   # Revalidation & Internal APIs
   NEXT_PUBLIC_SERVER_URL=http://localhost:3000
   REVALIDATE_SECRET=<secure-random-string>

   # AI Integration (Optional)
   AI_API_KEY=<provider-api-key>
   ```

4. Apply database schema migrations:
   ```bash
   bun run payload:migrate
   # or: npm run payload:migrate (or: bun run payload migrate)
   ```

5. Start the development server:
   ```bash
   bun run dev
   # or: npm run dev
   ```

- Public Application: `http://localhost:3000`
- Administration Control Panel: `http://localhost:3000/admin`

On initial launch, the administration interface will prompt for the creation of the primary administrative credentials.

---

## Available Scripts

| Script | Purpose |
| :--- | :--- |
| `bun run dev` | Starts the Next.js development server with Turbopack |
| `bun run build` | Compiles the production application bundle and Service Worker |
| `bun run start` | Launches the compiled production application server |
| `bun run payload:migrate` | Executes pending Payload CMS database migrations |
| `bun run lint` | Runs ESLint analysis across the repository |

---

## Deployment

1. Configure environment variables within your hosting provider (such as Vercel).
2. Ensure build command is set to `next build` and install command matches your chosen package manager (`bun install` or `npm install`).
3. Deploy the application. Post-deployment content publications instantly update the live site via on-demand ISR revalidation hooks without requiring redeployment.
