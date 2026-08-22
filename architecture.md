# Raven — Architecture Document

## 1. Tech stack summary

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Native SSG/ISR/streaming, PWA-friendly |
| CMS / Admin | Payload CMS 3.0, embedded in the Next.js app | Custom admin UI (tree + block editor) as native React components, one repo/one deploy, free/self-hosted |
| Database | Supabase Postgres (free tier) | No credit card required, commercial use allowed, bundles storage + auth |
| File storage | Supabase Storage (free tier) | Same provider as DB; RLS-based access control for images |
| PWA / service worker | Serwist | Actively maintained, built for Next.js App Router |
| Taxonomy tree UI | react-arborist | Purpose-built virtualized drag-and-drop tree — the engine behind Raven's admin tree |
| Block reordering | dnd-kit | Lightweight sortable list — used for reordering the 3 block types inside a chapter |
| Markdown editing | Tiptap (core, headless) | Rich text editing scoped to the markdown block only |
| Client state | Zustand | Theme, branch selection, UI state |
| Offline storage | Dexie.js (IndexedDB) | Pinned items + preferences — works fully offline |
| Search | Fuse.js or FlexSearch (client-side) | Free, offline-capable, no server round-trip |
| Styling | Tailwind CSS + shadcn/ui | Fast to build both the admin playground and the public reader UI |
| Hosting | Vercel (Hobby tier) | Native ISR/on-demand revalidation/edge caching, free |
| Keep-alive | GitHub Actions scheduled workflow (cron) | Prevents Supabase free-tier auto-pause after 7 days idle |

## 2. High-level request flow

```
Admin "playground" (Payload, embedded in Next.js)
   — taxonomy tree (react-arborist) + block editor (dnd-kit + Tiptap)
        │  publish action
        ▼
Postgres (Supabase) — taxonomy nodes + chapter block content
        │  on-save hook
        ▼
revalidatePath() / revalidateTag() — on-demand ISR, no full rebuild
        │
        ▼
Static page regenerated, cached at Vercel's edge
        │
        ▼
Reader's installed PWA — served instantly from cache,
service worker adds offline access + fast repeat visits
```

Publishing is the *only* trigger for regeneration — no timer-based revalidation, no full site rebuild. A publish updates exactly the affected route(s), typically within a few seconds.

## 3. Data model

### 3.1 Taxonomy — one self-similar tree, not five tables

```
Node {
  id            uuid, primary key
  parentId      uuid, nullable, references Node.id
  type          enum: branch | year | subject | chapter | topic
  title         string
  slug          string
  orderIndex    integer      -- position among siblings, written by drag-and-drop
  status        enum: draft | published
  createdAt     timestamp
  updatedAt     timestamp
}
```

Adding a new branch, nesting a topic under a chapter, or moving a chapter from one subject to another is always the same operation: update `parentId` and re-sequence `orderIndex` among siblings. This is what makes "admin can drag in a new branch/subject/chapter freely" possible without a schema migration every time the tree changes shape.

### 3.2 Chapter content — the three-block model

```
Chapter.blocks: Array<
    { type: 'markdown', order: number, content: string, compiledHtml: string }
  | { type: 'image',    order: number, url: string, alt: string, caption?: string }
  | { type: 'youtube',  order: number, videoId: string, title: string }
>
```

- One JSON column per chapter — atomic save, no joins needed to render a page.
- `content` (raw markdown) and `compiledHtml` are both stored: `compiledHtml` is generated **at publish time** so the reader's browser never runs a markdown parser.
- Block order is edited via **dnd-kit** inside the chapter editor — a separate, flat-list drag-and-drop distinct from the taxonomy tree's nested drag-and-drop (react-arborist).

### 3.3 User preferences — client-side only, never touches the server

```
Preferences {
  branch: string
  theme: 'light' | 'dark'
  pinnedIds: string[]     -- ordered list of Node ids, rendered on the homepage
}
```

Stored in IndexedDB via Dexie.js, wrapped by a Zustand store. Fully functional offline; no backend sync in v1.

## 4. Rendering strategy — why it feels instant

- **Static Generation (SSG)** for every chapter/subject/index page (`generateStaticParams`).
- **On-demand ISR** only — the Payload publish hook calls `revalidatePath()`/`revalidateTag()` for exactly the routes affected by that publish.
- **`fallback: 'blocking'`** for any route not yet statically built — the first visitor triggers server-side generation; everyone after gets the cached version.
- The page shell (nav, settings drawer) is static; any genuinely dynamic sliver is wrapped in its own `<Suspense>` boundary so it never blocks the rest of the page.
- **Markdown blocks**: rendered from `compiledHtml`, present in the initial server response — text is visible the instant the page arrives, with no parsing step in the browser.
- **Image blocks**: `next/image` with width/height (or aspect-ratio) set up front so space is reserved before the image loads, plus a `blurDataURL` placeholder. Only the first above-the-fold image gets `priority`; the rest lazy-load.
- **YouTube blocks**: a static thumbnail + play button. The real YouTube iframe/JS only loads after a click, so a video-containing chapter is exactly as fast to open as a text-only one.

## 5. Admin architecture — the "playground"

- Payload runs **inside** the Next.js app (same codebase, same deploy); admin lives at `/admin`.
- **Taxonomy tree view**: a custom Payload admin component wrapping **react-arborist**. Drag events (reorder, reparent, create) call Payload's API to update `parentId`/`orderIndex`, giving the "drag a new branch/subject/chapter into place" experience described in the PRD.
- **Chapter editor**: a custom Payload view, split into:
  - **Left — block list**: each block (markdown/image/youtube) editable inline, reordered via dnd-kit's drag handles. Markdown blocks use Tiptap; image blocks use a file picker uploading to Supabase Storage; YouTube blocks take a URL/ID + title.
  - **Right — live preview**: renders the same reader-facing components the public site uses, updating as the admin edits, so there's no gap between "what I see while editing" and "what gets published."
  - **"Generate with AI"** button, scoped only to the markdown block: calls an LLM endpoint, inserts the draft into that block, and stops — the admin always edits/approves before saving.
- **Auth**: Payload's built-in authentication for admin login; no separate auth service.
- **Publish hook**: on save/publish, this hook (a) compiles markdown to HTML, (b) triggers on-demand revalidation for the affected route(s), and (c) updates the client-side search index entry for that chapter.

## 6. PWA architecture

- **Manifest**: icons, `theme-color`, `display: standalone`.
- **Service worker (Serwist)**: precaches the app shell; uses **stale-while-revalidate** for chapter pages and images, giving instant repeat loads plus offline access to anything previously opened.
- **Install prompt**: `beforeinstallprompt` is captured and surfaced through a custom, well-timed in-app prompt rather than the browser default.

## 7. Search architecture

- At publish time, the search index (titles, tags, short excerpts — not full chapter bodies) is regenerated and shipped as a static JSON asset.
- The client loads and caches this index once, then runs **Fuse.js or FlexSearch** entirely in-browser — fuzzy, typo-tolerant, and works offline since no network call is needed per search.
- If the archive eventually outgrows a client-shippable index, the documented next steps are (in order): Postgres full-text search, then a hosted service like Meilisearch — neither is needed at Raven's v1 scale.

## 8. Deployment & staying on the free tier

- **Hosting**: Vercel Hobby. (Hobby is licensed for non-commercial use — revisit if Raven becomes a monetized product.)
- **Database/storage**: Supabase free tier (Postgres + Storage). No credit card required; commercial use is explicitly permitted on the free tier.
- **Keep-alive**: a GitHub Actions scheduled workflow pings a lightweight API route every 3–4 days, performing a trivial database query — this resets Supabase's 7-day inactivity pause indefinitely, well within margin.
- **Image handling**: images are compressed/resized client-side before upload (no free-tier image transformation service in this stack), which conserves the 1GB free storage allowance and keeps pages fast.

## 9. Suggested folder structure

```
/app
  /(public)
    /[branch]/[year]/[subject]/[chapter]/page.tsx
    /page.tsx                     -- homepage, renders pinned items
    /settings/page.tsx            -- branch + theme toggle
  /admin
    /[[...segments]]/page.tsx     -- Payload admin mount
  /api
    /revalidate/route.ts          -- on-demand ISR trigger, called from the publish hook
    /keepalive/route.ts           -- pinged by the GitHub Actions cron
/collections                      -- Payload collection configs: Node, Chapter
/components
  /reader                         -- public block renderers (markdown/image/youtube)
  /admin
    /tree                         -- react-arborist wrapper + drag handlers
    /block-editor                 -- dnd-kit block list + Tiptap + live preview pane
/lib
  /db                             -- Supabase/Postgres client
  /search                         -- index generation + Fuse/FlexSearch setup
  /offline                        -- Dexie schema + Zustand store (branch, theme, pins)
/public
  /manifest.json
  /icons
/sw                                -- Serwist service worker config
```

## 10. Security considerations

- Admin routes are protected by Payload auth; no public write access to any collection.
- Supabase Row Level Security (RLS) policies restrict storage bucket writes to authenticated admin requests only.
- Public reads are restricted to `status: published` nodes/chapters at the query level (not just hidden in the UI) — drafts are never reachable, including via direct URL guessing.
