# Raven — Project Timeline

A dependency-ordered, phased build plan — durations assume a **solo developer working part-time** (evenings/weekends). Adjust to your actual pace. Every phase ends with a concrete, testable deliverable.

---

## Phase 1 — Project setup & infrastructure wiring
**Estimated time: 2–3 days**

- [x] Initialize Next.js 15 (App Router) + TypeScript project named `raven`
- [x] Set up Tailwind CSS + shadcn/ui8
- [x] Create free Supabase project (Postgres + Storage enabled, no card required)

**Deliverable:** Project Setup

---

## Phase 2 — Auth, environment & keep-alive
**Estimated time: 2–3 days**

- [x] Install and configure Payload CMS, embedded in the Next.js app
- [x] Connect Payload to Supabase Postgres, run first migration
- [x] Create the first admin user, confirm `/admin` loads and logs in
- [x] Set up Supabase Row Level Security (RLS) policies for storage buckets (admin-only writes)
- [x] Set up the GitHub Actions keep-alive workflow (`.github/workflows/keepalive.yml`) pinging a trivial API route every 3–4 days — set this up now, before there's real data to lose

**Deliverable:** a working, authenticated Payload admin panel on Vercel, with the free-tier keep-alive already running in the background.

---

## Phase 3 — Taxonomy data model
**Estimated time: 3–4 days**

- [x] Define the `Node` collection in Payload: type (branch/year/subject/chapter/topic), parentId, title, slug, orderIndex, status
- [x] Define the `Chapter` block schema as a linked field/collection (empty block array for now)
- [x] Write seed data manually (via Payload's default UI) to confirm the schema holds a real Branch → Year → Subject → Chapter path — schema ready; seed via `/admin` → Nodes
- [x] Basic public route scaffolding: `/[branch]/[year]/[subject]/[chapter]` resolving to a placeholder page

**Deliverable:** the data model exists and holds one real, manually-entered taxonomy path end to end.

---

## Phase 4 — Taxonomy admin UI (the drag-and-drop tree)
**Estimated time: 1–1.5 weeks**

- [x] Build the custom taxonomy tree view in the admin using react-arborist
- [x] Wire drag events to update `parentId`/`orderIndex` via Payload's API (reorder + reparent)
- [x] Add "create new node" actions from the tree (new branch, subject, chapter, topic) at any valid position
- [x] Add inline rename/delete actions on tree nodes
- [x] Test: build out one full branch (year → subject → several chapters) entirely by dragging and clicking, no manual database entry — achievable via /admin/taxonomy (create/drag/rename/delete), verify after seeding

**Deliverable:** the admin can construct and rearrange a real taxonomy purely through the drag-and-drop tree.

---

## Phase 5 — Chapter block editor (the three block types)
**Estimated time: 1.5–2 weeks**

- [x] Build the block list UI inside a chapter (markdown / image / youtube), each addable and removable
- [x] Integrate Tiptap for the markdown block's editing experience
- [x] Image block: upload flow to Supabase Storage, alt text + caption fields
- [x] YouTube block: URL/ID input with a title field
- [x] Wire dnd-kit to reorder blocks within a chapter

**Deliverable:** admin can build a chapter with all three block types and rearrange them freely.

---

## Phase 6 — Live preview & publish pipeline
**Estimated time: 1–1.5 weeks**

- [x] Build the split-view layout: block editor on one side, live preview on the other, using the same components the public site will render
- [x] Draft vs. Published status on chapters and taxonomy nodes
- [x] Publish hook: compile markdown to HTML at save time, store both raw markdown and compiled HTML
- [x] Publish hook: trigger on-demand revalidation (`revalidatePath`) for exactly the affected route

**Deliverable:** admin can write a chapter, preview it accurately, hit publish, and see it live within seconds — the full "playground" experience from the PRD.

---

## Phase 7 — Public reading experience
**Estimated time: 1.5–2 weeks**

- [x] Static generation (`generateStaticParams`) for all published chapters/subjects
- [x] `fallback: 'blocking'` for newly published pages not yet statically built
- [x] Render markdown blocks from pre-compiled HTML (no client-side parsing)
- [x] Image blocks via `next/image`, reserved aspect ratio + `blurDataURL` placeholders, `priority` only on the first above-the-fold image
- [x] YouTube blocks as click-to-play facade thumbnails (no auto-loaded iframe)
- [x] Breadcrumb-style navigation: Year → Subject → Chapter
- [x] Mobile-first responsive pass

**Deliverable:** a stranger can browse real, published content on mobile, start to finish, with no visible loading jank.

---

## Phase 8 — Settings: branch & theme
**Estimated time: 3–5 days**

- [x] Build the settings drawer UI
- [x] Branch toggle, wired to a Zustand store
- [x] Light/dark theme toggle, wired to the same store, applied globally
- [x] Persist both to IndexedDB via Dexie.js so they survive app restarts with no network

**Deliverable:** switching branch or theme is instant, global, and remembered on the next visit — even offline.

---

## Phase 9 — Pinning & offline preferences
**Estimated time: 4–6 days**

- [x] Add pin/unpin controls on subject and chapter pages
- [ ] Extend the Dexie/Zustand store to hold an ordered `pinnedIds` list
- [ ] Build the homepage to render pinned items for quick access
- [ ] Test: pin several items, fully close the app, reopen with no network, confirm pins are intact

**Deliverable:** a returning user's homepage shows their pinned content immediately, with or without connectivity.

---

## Phase 10 — PWA & offline chapter caching
**Estimated time: 1–1.5 weeks**

- [ ] Web app manifest: icons, `theme-color`, `display: standalone`
- [ ] Serwist service worker setup
- [ ] Stale-while-revalidate caching for chapter pages and images
- [ ] Custom install prompt (`beforeinstallprompt`, shown at a sensible moment, not on first load)
- [ ] Test: open several chapters, enable airplane mode, confirm they still render fully

**Deliverable:** Raven installs to a phone home screen, and previously viewed chapters are fully readable offline.

---

## Phase 11 — Search
**Estimated time: 4–6 days**

- [ ] Generate a lightweight search index (titles, tags, short excerpts) as part of the publish hook
- [ ] Ship the index as a static JSON asset, cached by the service worker
- [ ] Build the client-side search UI using Fuse.js or FlexSearch
- [ ] Test: search while offline, confirm results return with no network call

**Deliverable:** users can search the whole archive instantly, online or offline.

---

## Phase 12 — AI-assisted markdown & polish
**Estimated time: 1 week**

- [ ] Add the "Generate with AI" action on the markdown block, calling your chosen LLM provider
- [ ] Ensure AI output always lands in the block for admin review/edit — never auto-published
- [ ] Accessibility pass: color contrast in both themes, enforce alt text on image blocks
- [ ] Performance pass: Lighthouse audit, confirm no unexpected layout shift or slow paints
- [ ] Handle edge cases: empty taxonomy levels, broken image links, missing/invalid YouTube IDs

**Deliverable:** Raven feels finished — fast, accessible, and resilient to incomplete content.

---

## Phase 13 — Launch & ongoing monitoring
**Estimated time: ongoing**

- [ ] Final deploy to Vercel with production environment variables
- [ ] Confirm the keep-alive cron is active and firing on schedule
- [ ] Populate real content for at least one full branch/year/subject as a live example
- [ ] Install Raven on your own device as the first real user
- [ ] Monitor Supabase's 500MB DB / 1GB storage / egress limits as content and traffic grow — see `architecture.md` §8 for documented next steps if you outgrow the free tier

---

## Suggested overall timeline

| Phase | Focus | Estimated duration |
|---|---|---|
| 1 | Project setup & infra wiring | 2–3 days |
| 2 | Auth, environment & keep-alive | 2–3 days |
| 3 | Taxonomy data model | 3–4 days |
| 4 | Taxonomy admin UI (drag-and-drop tree) | 1–1.5 weeks |
| 5 | Chapter block editor | 1.5–2 weeks |
| 6 | Live preview & publish pipeline | 1–1.5 weeks |
| 7 | Public reading experience | 1.5–2 weeks |
| 8 | Settings: branch & theme | 3–5 days |
| 9 | Pinning & offline preferences | 4–6 days |
| 10 | PWA & offline chapter caching | 1–1.5 weeks |
| 11 | Search | 4–6 days |
| 12 | AI-assisted markdown & polish | 1 week |
| 13 | Launch & ongoing monitoring | ongoing |

**Total to a real, usable v1: roughly 10–14 weeks part-time.** Phases 1–7 are the critical path — once Phase 7 is done, Raven is genuinely usable end to end (an admin can publish, a reader can browse). Phases 8–12 are what make it feel personal, installable, and polished; treat completing Phase 7 as your first real milestone worth showing someone.
