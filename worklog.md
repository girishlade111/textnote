# LS Notes — Worklog

## Project Status Assessment

**LS Notes** is a premium, private, local-first note-taking web application built with Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, and Prisma (SQLite). The app adapts the Android Material Design 3 concept to a fully local web app — no cloud, no accounts, no tracking. All data persists in on-device SQLite via Prisma.

**Current state:** Core MVP is **functional and browser-verified**. The app renders, seeds demo content, supports the full note CRUD lifecycle, navigation across 9 sections, a rich block-based editor, PrivateSafe gating, settings, import/export, and dark mode. VLM visual review scored it 8/10.

## Completed Modifications / Verification Results

### Foundation
- Prisma schema: `Note`, `Folder`, `Tag`, `NoteTag`, `Attachment`, `NoteHistory`, `Setting` (SQLite). `bun run db:push` applied.
- Types system (`src/lib/types.ts`): ContentBlock union (18 block types), NoteDto, FolderDto, TagDto, AppSettings, NOTE_COLORS palette, FONT_OPTIONS.
- Helpers (`src/lib/notes.ts`, `export.ts`, `ui-helpers.ts`, `api-helpers.ts`): block serialization, excerpt/word/char counts, checklist progress, link extraction, relative time, local PIN hashing, MD/HTML/TXT/JSON export + import parsing, haptics, clipboard, download, share.
- Global CSS: Material Design 3 aesthetic with runtime-switchable accent color system (`[data-accent]`), light/dark themes, custom scrollbars, ripple effect, skeleton shimmer, search highlight, prose styles, print styles for PDF.
- Logo SVG (`public/icon.svg`) + manifest (`public/manifest.webmanifest`).

### State & Data
- Zustand stores: `useSettingsStore`, `useUIStore` (persisted view/sort/search), `usePrivateSafeStore` (in-memory unlock session), `useSelectionStore`, `useApp` (section + editor state).
- TanStack Query providers + Sonner toasts.
- Hooks: `use-settings` (load/apply theme+accent+font), `use-data` (notes/folders/tags/stats CRUD + privatesafe unlock/verify).

### API Routes
- `/api/notes` (GET list with scope/q/folder/tag, POST create)
- `/api/notes/[id]` (GET/PUT/DELETE soft-delete)
- `/api/notes/[id]/permanent`, `/restore`, `/duplicate`
- `/api/folders`, `/api/folders/[id]` (with delete modes: trash/moveAll/allNotes)
- `/api/tags`, `/api/tags/[id]` (rename merges, delete removes from notes only)
- `/api/settings` (key/value, secrets hashed)
- `/api/trash/empty`, `/api/trash/purge` (auto-purge by retention days)
- `/api/privatesafe/unlock`, `/api/privatesafe/verify`
- `/api/history/[id]`
- `/api/stats`
- `/api/seed` (demo content on first run)

### UI / Screens
- **AppShell**: sticky top bar (search, grid/list toggle, sort menu), desktop sidebar nav, mobile bottom nav (5 primary sections), mobile drawer (secondary sections), floating FAB, "Private by design" footer.
- **All Notes**: grid/list views, 6 sort modes, search with highlighting, empty states, note cards with color stripe, type icon, pin/private indicators, checklist progress, tags, folder, attachment counts, relative time, hover quick-pin, context menu + dropdown menu with full action set.
- **Create Menu**: bottom sheet with 10 note types + Import + Create in PrivateSafe.
- **Note Editor**: fullscreen overlay, basic/advanced modes, block-based content (text/heading/quote/code/divider/checklist/bullet/numbered/image/audio/file/drawing/table/link/smart/bookmark/toc), per-block move/remove, formatting toolbar with Insert popover, autosave with "Saved" indicator, color picker, tags sheet, move dialog, link review dialog, drawing canvas integration.
- **Drawing Canvas**: pen/pencil/highlighter/eraser/select tools, 10 colors, size slider, 4 background styles (blank/dotted/ruled/grid), undo/redo, clear, download PNG, save to note.
- **Notebooks**: folder grid with color dots, create/rename/delete dialogs, delete offers move-to-All-Notes / move-to-another / trash.
- **Tags**: chip cloud with note counts, create/edit/delete, click filters notes.
- **Trash**: items with days-left badges, restore/permanent-delete, empty-trash confirmation.
- **PrivateSafe**: setup gate, PIN/pattern/biometric unlock, 3x3 pattern lock, auto-lock on background, lock-now.
- **Shared/Exported**: export center (JSON/MD/TXT/HTML batch export) + notes list.
- **Settings**: Appearance (theme/accent/default color mode+color/default view), Show Time (created/edited/both/hidden), Editor & Fonts (default editor, 13 fonts, size slider + 5 presets, live preview, spell-check), Checklist (move-completed/hide-completed), Auto-save (toggle+interval, trash retention), PrivateSafe (enable, methods, set PIN, auto-lock), Search & Behavior (include-private, haptics, animations), Export prefs, Storage usage stats, Backup & Import (JSON backup, file import for JSON/MD/TXT/HTML), About.

### Verification (agent-browser)
- Page loads, no build/runtime errors.
- Seed populates 5 sample notes + 3 folders + 4 tags on first run.
- Note cards render with correct colors, pins, types, excerpts, timestamps.
- Search filters notes live ("project" → only Roadmap note).
- Create menu opens with all 10 note types.
- Editor opens for existing + new notes (title, blocks, toolbar, Insert menu visible).
- Section navigation works (All Notes, Notebooks, Tags, Pinned, Recent, Trash, Settings).
- Dark mode toggles `dark` class on `<html>`.
- Settings renders all 10+ sections.
- VLM visual review: 8/10, strong Material Design adherence.

## Unresolved Issues / Risks / Next-Phase Priorities

### Known limitations
- Inline text marks (bold/italic/etc.) toolbar buttons toggle whole-text marks (not substring selection) — acceptable for v1, could be enhanced with a contenteditable rich text engine.
- Note history snapshots are stored in schema but not yet written on save (history API exists, UI dialog exists, but snapshot creation on edit not wired).
- Bulk selection/multi-select actions (batch move/copy/tag/export/pin/delete) store exists but not surfaced in UI.
- Photo card grouping (albums/stacks) not yet implemented.
- Document scanning (edge detection) is represented as a note type but uses camera capture stub.
- Email-in-notes uses Web Share API (closest web equivalent to Android share sheet).

### Priority recommendations for next phase (cron-driven)
1. **Polish**: wire note-history snapshots on save; surface bulk-selection mode with action bar.
2. **Features**: photo card grouping/albums; smart-card metadata extraction from pasted links; in-note hashtag autocomplete.
3. **Styling detail**: refine card hover states, add stagger animations on grid, improve timestamp contrast on light note colors.
4. **Editor**: upgrade inline formatting to selection-based marks; add markdown-insert/preview in advanced mode; code block syntax highlighting.
5. **PrivateSafe**: blur content on visibility change; PIN setup enrollment flow hardening.
6. **Resilience**: corrupted-import handling, draft restore after interruption, retry on failed saves.

## Tech Notes
- Dev server: `bun run dev` on port 3000 (background). Lint: `bun run lint` (0 errors, 5 minor warnings).
- Only `/` route is user-visible (single-page app with in-memory section routing).
- All API routes use `dynamic = "force-dynamic"` and Prisma SQLite (local file at `db/custom.db`).
