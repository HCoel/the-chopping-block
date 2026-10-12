# The Chopping Block - Design

Date: 2026-10-12
Status: Draft for review

## 1. Purpose

Personal catalogue of an axe head collection (~150 heads) for one collector, used on an Android phone. Offline, data on the phone, backed up to Google Drive by export.

### Goals
- Record the details collectors care about per head (maker, stamp, pattern, weight, condition, haft, provenance, value).
- Up to 3 photos per head in fixed slots, with a high-res stamp photo that can be zoomed.
- Find heads fast: search, facet chips, sorts.
- Backups small enough to actually get done: full ZIP occasionally, incremental ZIP often.

### Non-goals (v1)
- Accounts, multi-device sync, sharing a public collection.
- Restoration log, before/after slider, QR labels, share cards, stats (phase 2).
- AI stamp reading / pattern identification.

## 2. Platform and stack

Copied from spool-library: Preact, Dexie (IndexedDB), vite-pwa, GitHub Pages at `hcoel.github.io/the-chopping-block/`. Added: `fflate` for ZIP.

Primary device: Android, Chrome, installed via "Add to Home screen / Install app". Secondary test device: iPhone Safari, home screen. Both must pass the manual checklist.

## 3. Architecture

### Folder layout
```
src/
  core/        db, repo, export (ZIP), image, query, reminder, route, share, validate, units (weight format)
  libraries/
    axe/       definition, FormFields, DetailInfo, Visual (thumb or silhouette)
  ui/          App shell, Grid, Filters, ProductCard, ProductDetail, ProductForm,
               PhotoSlots, PhotoViewer, Settings, InstallGate, UpdatePrompt, BackupBanner
```

### Library definition contract
| Key | Purpose | Axe value |
|---|---|---|
| `id` | stored on each product | `'axe'` |
| `label` | tab / headings | `'Axes'` |
| `fields` | field defaults + validation | see 4.2 |
| `Visual` | tile image | cover thumb, else SVG axe silhouette |
| `summary` | tile subtitle | `pattern · 3 lb 8 oz` |
| `facets` | filter chips | pattern, maker, collection status, restoration status |
| `sorts` | sort menu | maker, weight, acquired (newest), pattern |

Removed from the spool contract: `unit_label`, `amount_mode`, `presets`.

## 4. Data model

### 4.1 Common rules
- Every record: uuid `id`, ISO `created_at`, `updated_at`, `deleted` (soft delete). Every write bumps `updated_at`; this drives incremental backup and import merge.
- Dexie v1:
  ```js
  products: 'id, library, updated_at',
  photos:   'id, product_id, slot, updated_at',
  thumbs:   'id',          // keyed by photo id, ~20KB each
  meta:     'key',
  ```
- Thumbs live apart from photos because Dexie loads whole rows: the grid must never pull 150 full images.

### 4.2 Axe `fields`
| Group | Field | Type / values |
|---|---|---|
| Identity | `maker` | text, datalist from existing + seeded makers |
| | `stamp_text` | text |
| | `stamp_legibility` | full / partial / ghost / none |
| | `pattern` | Dayton, Michigan, Jersey, Kentucky, Hudson Bay, Connecticut, Double bit, Broad / hewing, Hatchet, Boy's axe, Felling, Splitting, Maul, Carpenter, Pulaski, Tomahawk, Adze, Other |
| | `bit_type` | single / double |
| | `country`, `era` | text (era free text, e.g. "1930s-50s") |
| Measurements | `weight_g` | int 100-5000 |
| | `bit_length_mm`, `head_length_mm` | int |
| | `eye_shape` | teardrop / oval / round / other |
| | `poll` | flat / hammer / none |
| Construction | `forging` | drop / hand / cast / unknown |
| Condition | `cond_stamp`, `cond_bit`, `cond_poll`, `cond_surface` | good / fair / poor |
| | `restoration` | as found / cleaned / restored / hung |
| Haft | `haft` | none / original / replacement |
| | `haft_wood`, `haft_length_mm` | text, int |
| Provenance | `found_where`, `acquired_date`, `price_paid`, `est_value`, `location` | text, date, number, number, text |
| Collection | `collection_status` | owned / for trade / sold / wishlist |
| | `notes` | text |

Product top level keeps `name` (optional label, defaults to `maker pattern`).

Weight shows as `1.59 kg · 3 lb 8 oz`. lb/oz is how collectors talk; grams avoid rounding drift.

### 4.3 Photos
- Slots: `profile` (cover), `stamp`, `extra`. Max one live photo per slot.
- Stamp: long edge 2400px. Others: 1200px. All JPEG q0.8 via `resizeImage`. Thumb: 320px.
- Row: `{id, product_id, slot, type, data, updated_at, deleted}`. Delete or replace -> tombstone with `data: null` and thumb removed.
- Photos are written only when the form is saved (no orphans from cancelled edits).

## 5. Screens and flows

### 5.1 Screens
- **Grid:** 2-column tiles (cover thumb, maker, summary). Search, facet chips, sort. Backup banner when overdue.
- **Detail:** swipeable photo carousel (slot dots), tap for full-screen viewer with pinch zoom. Spec table grouped as 4.2. Edit / duplicate / delete.
- **Form:** 3 photo tiles at top (tap: camera or library; long-press: remove), then collapsible groups. Identity open by default.
- **Settings:** backup status (last full, last incremental), Export full, Export changes, Import, storage persistence status.

### 5.2 Flows
- Add: + -> photos -> maker / pattern / weight -> save. Everything except one of maker or pattern is optional.
- Duplicate: copies fields, not photos.
- Backup: see 6.4.

## 6. Platform behaviour and error handling

### 6.1 Risks
| Risk | Mitigation |
|---|---|
| Android Chrome evicts storage | `navigator.storage.persist()`; status shown in Settings |
| Home screen icon removed -> data gone | README + install gate text; backup banner |
| Large export out of memory | streaming fflate `Zip`, level 0, chunks into a Blob |
| Share sheet refuses large file | fallback download to Downloads, then upload to Drive by hand |
| Tested on iPhone only | Playwright Pixel 7 Chromium project + Android manual checklist |

### 6.2 Updates
Unchanged from spool: service worker, "Update available - Reload" prompt.

### 6.3 Validation
`checkRange` for weight and lengths; date not in the future; numbers non-negative.

### 6.4 Backup: export / import
ZIP layout:
```
manifest.json   {format_version: 1, app: "the-chopping-block", kind, since, exported_at, counts}
data.json       {products, photos (metadata, no bytes)}
photos/<id>.jpg
thumbs/<id>.jpg
```
- **Full:** all rows, tombstones included. Filename `the-chopping-block-full-YYYY-MM-DD-HHmm.zip`.
- **Incremental:** rows with `updated_at > last_backup_at`. Filename `...-incr-...`. Disabled until a full backup exists.
- Meta: `last_backup_at` (any), `last_full_backup_at`. Set only when the share or download succeeds.
- Reminder: 14 days since any backup -> banner + gear dot. 60 days since full -> Settings suggests full.
- **Import:** validate manifest + records, preview counts (new / updated / unchanged), apply in one transaction, last-writer-wins per id. Order-independent, so restore = import full + every incremental in any order.

### 6.5 Runtime errors
ErrorBoundary keeps its emergency "Export backup" (full ZIP).

## 7. Testing
- Unit (Vitest + fake-indexeddb): repo slot replace/delete, ZIP round trip full and incremental, reverse-order restore equality, incremental selection, record validation, weight formatting, reminder rules.
- E2E (Playwright): projects `iphone-webkit` and `pixel-chromium`. Add axe with 3 photos, filter, export full + incremental, wipe, import, verify.

## 8. Deployment
Push to `main` -> CI runs unit + e2e (WebKit + Chromium), builds, deploys to GitHub Pages.

## 9. Phase 1 acceptance criteria
1. Installs to home screen on Android Chrome and iPhone Safari; opens offline.
2. Add, edit, duplicate, delete an axe with all 4.2 fields.
3. 3 photo slots; stamp photo zoomable full screen; grid uses thumbs only.
4. Search, facet chips and sorts work.
5. Full and incremental ZIP export via share sheet (Drive on Android), with download fallback.
6. Import full + incrementals restores identical data in any order.
7. Backup banner after 14 days; persistence status shown.
8. 150 seeded axes x 3 photos: grid scrolls smoothly, full export completes on the Android phone.

## 10. Phase 2 (outline)
Restoration log, before/after slider, QR shelf labels, share card image, wishlist view, stats, duplicate warning, Google Drive auto-sync.
