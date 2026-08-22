# Raven — Product Requirements Document (PRD)

## 1. Product overview

**Project name:** Raven

**One-liner:** Raven is an installable, offline-capable notes platform organized as Branch → Year → Subject → Chapter → Topic, where the admin manages the entire structure and content through a drag-and-drop "playground" interface, and readers get an instant, app-like browsing experience with personal pinning and offline access.

**Problem it solves:** Notes for an academic branch (e.g. a stream of study) accumulate for years, across many subjects and chapters, usually scattered across PDFs and docs with no real structure, no offline access, and no fast way for a non-technical admin to keep them updated. Raven gives the content a real hierarchy, gives the admin a visual tool to manage it, and gives the reader a fast, installable app instead of a folder of files.

## 2. Goals

- A **hierarchical content system** — Branch → Year → Subject → Chapter → Topic — that the admin can extend at any level (new branch, new subject, new chapter) without writing a single line of code or touching a database.
- A **drag-and-drop admin experience** for both the taxonomy tree and the content itself, so structuring and writing notes feels like a playground, not a form.
- Chapters composed of **three block types** — markdown/text, image, YouTube — so admin can build a "beautifully formatted and intuitive" chapter combining explanation, visuals, and video.
- A **snappy, no-jank reading experience**: text is visible immediately (never client-fetched), images never shift the layout, and video never loads until clicked.
- A **PWA** installable on mobile with **offline access** to previously viewed chapters.
- A **personalized homepage** via pinned subjects/chapters, with pin state and settings (branch, theme) stored **offline** so they survive with no network.
- Runs entirely on **free-tier infrastructure**, no credit card required anywhere in the stack.

## 3. Non-goals (out of scope for v1)

- Multi-tenant support (multiple organizations on one Raven instance).
- Real-time collaborative editing between multiple admins on the same chapter simultaneously.
- Reader accounts, comments, or social features — readers are anonymous, preferences are local to their device.
- Native iOS/Android apps — the installable PWA covers this need for v1.
- Payments or subscriptions.
- Multi-language content.

## 4. Target users / personas

### Persona A — The Reader
A student or self-learner browsing Raven for a specific branch's notes. Primarily on mobile, often on patchy data, wants to open the app like any other installed app and get straight to a chapter with zero waiting. Wants to keep a small set of "current" subjects/chapters pinned to the homepage rather than navigating the full tree every time, and wants their last-used branch and theme remembered automatically.

### Persona B — The Admin
The person (possibly solo) who owns and maintains Raven's content — not necessarily a developer. Needs to:
- Add a new branch, year, subject, chapter, or topic by **dragging it into place** in a tree, the way you'd organize files in a file explorer.
- Write a chapter using three block types — a markdown block (which can also be AI-drafted and then edited), an image block, and a YouTube block — and **reorder those blocks by dragging them**.
- See a **live, accurate preview** of the chapter exactly as readers will see it, before publishing.
- Publish and see the change reflected on the live site within seconds — no deploy wait.

## 5. Core features (v1)

### 5.1 Content taxonomy (drag-and-drop tree)
- Structure: **Branch → Year → Subject → Chapter → Topic** (topic is optional, for finer subdivision within a chapter).
- Admin creates any new node — a new branch, a new subject under an existing year, a new chapter under a subject — through the **taxonomy tree UI**, not a form buried in menus.
- Reordering siblings and **reparenting** nodes (e.g. dragging a chapter from one subject to another) is done by drag-and-drop.
- Every node carries: title, slug, type, parent reference, order position, and a draft/published status.

### 5.2 Chapter content — the three-block system
Every chapter's content is an **ordered list of blocks**, each one of exactly three types:

1. **Markdown/text block** — the primary content block. Can be typed manually or generated via an "AI generate" action scoped only to this block type; the admin always reviews/edits AI output before saving. Rendered from pre-compiled HTML at publish time (no client-side markdown parsing).
2. **Image block** — an uploaded image with alt text and an optional caption. Reserves its layout space (via width/height or aspect ratio) so it never causes a layout shift while loading.
3. **YouTube block** — stores a video ID and title, and displays as a **click-to-play thumbnail facade** rather than an auto-loaded iframe, so a chapter with a video is no heavier to load than one with just text and images.

Blocks are added, removed, and **reordered by dragging** within the chapter editor.

### 5.3 The admin "playground"
- A **split-view chapter editor**: block list + controls on one side, a **live preview** on the other, rendered with the exact same components the public site uses — what the admin sees is what gets published, with no surprises.
- Draft vs. Published status per chapter (and per taxonomy node).
- Publishing triggers on-demand revalidation so the change is live within seconds.

### 5.4 Public reading flow
- Navigation: **select Year → Subject → Chapter**, breadcrumb-style, every step statically served (instant).
- **Settings drawer**: toggle **branch** and toggle **light/dark theme**.
- **Pinning**: any subject or chapter can be pinned for one-tap access from the homepage. Pinned items, the selected branch, and the theme are all stored in **IndexedDB (offline-first)** — they persist with zero network connectivity.
- Previously opened chapters remain readable fully offline once cached by the service worker.

### 5.5 PWA
- Installable on a mobile home screen (manifest, icons, standalone display mode).
- Custom install prompt shown at a sensible moment (not immediately on first load).
- Offline caching of the app shell and previously visited chapter pages/images.

### 5.6 Search
- Client-side, typo-tolerant search across chapter titles/tags/short excerpts, working fully offline since it's just a cached index with no server round-trip.

## 6. User stories

**As a reader**, I select my branch once in settings and it's remembered on every future visit.

**As a reader**, I pin the subjects I'm currently studying to my homepage so I don't have to walk Branch → Year → Subject → Chapter every time.

**As a reader**, I keep reading a chapter I already opened even with no signal, because it was cached the first time I viewed it.

**As a reader**, I switch to dark mode from the settings drawer and it stays that way next time I open the app.

**As an admin**, I drag a new "Chapter" node under an existing "Subject" node in the tree and it appears immediately, ready to be filled in.

**As an admin**, I drag a chapter from one subject into another when I realize it was misfiled.

**As an admin**, I write a markdown block, drop in an image block, and add a YouTube block for a walkthrough video — then drag the image above the video because that reads better — all in one editor.

**As an admin**, I hit "Generate with AI" on the markdown block to get a first draft, then edit it before saving.

**As an admin**, I see the live preview update as I edit, so I know exactly what readers will see before I publish.

**As an admin**, I publish a chapter and it's live on the real site within seconds — no deploy, no waiting.

## 7. Functional requirements

| ID | Requirement |
|----|-------------|
| FR1 | Admin can create/edit/delete taxonomy nodes of type branch, year, subject, chapter, topic |
| FR2 | Admin can reorder siblings and reparent nodes via drag-and-drop in the taxonomy tree |
| FR3 | A chapter's content is an ordered array of exactly three block types: markdown, image, youtube |
| FR4 | Admin can add, remove, and reorder blocks within a chapter via drag-and-drop |
| FR5 | Admin sees a live, accurate preview of the chapter while editing, using the same rendering components as the public site |
| FR6 | Markdown blocks can be AI-drafted on request, but are always admin-reviewed before save |
| FR7 | Publishing a node/chapter triggers on-demand revalidation; the change is visible on the live site within seconds, without a full rebuild |
| FR8 | Public site is navigable by Year → Subject → Chapter, with all steps statically served |
| FR9 | Settings drawer allows toggling branch and light/dark theme |
| FR10 | User can pin/unpin subjects and chapters; pinned items appear on the homepage |
| FR11 | Pinned items, selected branch, and theme persist fully offline (IndexedDB), surviving app close/reopen with no network |
| FR12 | Previously opened chapters remain readable offline (service worker cache) |
| FR13 | Site is installable as a PWA on mobile with a custom install prompt |
| FR14 | Users can search chapter titles/tags/excerpts client-side with no network call required |
| FR15 | Image blocks reserve layout space up front (no layout shift on load); YouTube blocks never auto-load an iframe |

## 8. Non-functional requirements

- **Performance:** no client-side loading spinners for content that could have been server-rendered; zero unexpected layout shift from images or video.
- **Offline-first for preferences:** theme, branch, and pins must function with zero connectivity.
- **Scalability:** the single self-similar taxonomy table must support years of accumulated branches/subjects/chapters without a schema change.
- **Cost:** the entire stack must run on genuinely free tiers, with no credit card required for signup on any service.
- **Accessibility:** sufficient color contrast in both themes; alt text required on every image block.

## 9. Assumptions & constraints

- Single admin or small trusted team — no complex multi-role permission system required for v1.
- Zero budget for infrastructure — every chosen service must have a real, usable free tier (not a time-limited trial).
- Initial traffic is low-to-moderate and expected to grow gradually.

## 10. Success metrics (informal, v1)

- Time from "admin hits publish" to "change visible on the live site": under 10 seconds.
- Admin can go from "empty tree" to "one branch, one year, one subject, one chapter with all three block types" using only drag-and-drop and in-editor actions — no manual database entry at any point.
- A previously viewed chapter is readable with the device in airplane mode.
- The app installs to a phone home screen and reopens directly into the last-used branch and theme.
