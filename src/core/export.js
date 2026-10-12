import { Zip, ZipPassThrough, strFromU8, strToU8, unzipSync } from 'fflate'
import { SLOTS } from './db.js'

export const APP_ID = 'the-chopping-block'
export const TABLES = ['products', 'photos']
export const FORMAT_VERSION = 1

export class ImportError extends Error {}

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
const isStr = v => typeof v === 'string'
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v)

// Fields the app reads without guarding; a record missing them would crash the UI after import
const RECORD_CHECKS = {
  products: r => isStr(r.library) && isStr(r.name) && isObj(r.fields),
  photos: r => isStr(r.product_id) && SLOTS.includes(r.slot) && isStr(r.type),
}

const photoPath = id => `photos/${id}.jpg`
const thumbPath = id => `thumbs/${id}.jpg`
const bytes = buf => new Uint8Array(buf)

// Streams entries into Blob parts so a ~100MB backup is never one contiguous buffer.
// Level 0 (stored): JPEGs don't compress, and storing keeps a phone's CPU out of it.
function zipWriter() {
  const parts = []
  let resolve
  let reject
  const done = new Promise((res, rej) => { resolve = res; reject = rej })
  const zip = new Zip((err, chunk, final) => {
    if (err) return reject(err)
    parts.push(chunk)
    if (final) resolve(new Blob(parts, { type: 'application/zip' }))
  })
  return {
    add(name, data) {
      const entry = new ZipPassThrough(name)
      zip.add(entry)
      entry.push(data, true)
    },
    end() {
      zip.end()
      return done
    },
  }
}

// kind 'full': every row, tombstones included. kind 'incremental': rows changed after `since`.
export async function buildBackup(db, { kind = 'full', since = null, exportedAt }) {
  if (kind === 'incremental' && !since) throw new Error('Incremental backup needs a previous backup time')
  const changed = table => (kind === 'incremental' ? db.table(table).where('updated_at').above(since) : db.table(table).toCollection())
  const out = zipWriter()
  const products = await changed('products').toArray()

  // One photo at a time: only the current photo's bytes are held, not the whole collection
  const photoMeta = []
  for (const id of await changed('photos').primaryKeys()) {
    const row = await db.photos.get(id)
    if (!row) continue
    const { data, ...meta } = row
    photoMeta.push({ ...meta, data: null })
    if (row.deleted || !data) continue
    const thumb = await db.thumbs.get(id)
    if (!thumb) continue // invariant: live photos have thumbs; skip rather than write a backup that won't import
    out.add(photoPath(id), bytes(data))
    out.add(thumbPath(id), bytes(thumb.data))
  }

  const counts = { products: products.length, photos: photoMeta.length }
  out.add('data.json', strToU8(JSON.stringify({ products, photos: photoMeta })))
  out.add('manifest.json', strToU8(JSON.stringify({ format_version: FORMAT_VERSION, app: APP_ID, kind, since, exported_at: exportedAt, counts })))
  return { blob: await out.end(), counts }
}

function readJson(entries, name) {
  if (!entries[name]) throw new ImportError(`Backup is missing ${name}`)
  try {
    return JSON.parse(strFromU8(entries[name]))
  } catch {
    throw new ImportError(`Backup has a damaged ${name}`)
  }
}

// Copy out of the zip buffer: storing a view would make IndexedDB clone the entire backup per photo
const own = u8 => u8.slice().buffer

export function readBackup(buffer) {
  let entries
  try {
    entries = unzipSync(new Uint8Array(buffer))
  } catch {
    throw new ImportError('Not a valid backup file (not a zip)')
  }
  const manifest = readJson(entries, 'manifest.json')
  if (manifest?.app !== APP_ID) throw new ImportError('This backup is from a different app')
  if (manifest.format_version !== FORMAT_VERSION) throw new ImportError(`Unsupported backup version: ${manifest.format_version}`)
  const data = readJson(entries, 'data.json')
  for (const t of TABLES) {
    if (!Array.isArray(data?.[t])) throw new ImportError(`Backup is missing "${t}"`)
    data[t].forEach((r, i) => {
      const ok = isObj(r) && isStr(r.id) && ISO_RE.test(r.updated_at ?? '') && RECORD_CHECKS[t](r)
      if (!ok) throw new ImportError(`Bad record in "${t}" (#${i + 1})`)
    })
  }
  const thumbs = {}
  const photos = data.photos.map(p => {
    if (p.deleted) return { ...p, data: null }
    const full = entries[photoPath(p.id)]
    const thumb = entries[thumbPath(p.id)]
    if (!full || !thumb) throw new ImportError(`Backup is missing a photo (${p.id})`)
    thumbs[p.id] = { id: p.id, product_id: p.product_id, slot: p.slot, type: 'image/jpeg', data: own(thumb) }
    return { ...p, data: own(full) }
  })
  return { manifest, products: data.products, photos, thumbs }
}

// Several backups (a full one plus incrementals) collapse to one, newest copy of each record wins.
// Same rule as planImport, so the result does not depend on the order files are picked in.
export function mergeBackups(backups) {
  const merged = { products: new Map(), photos: new Map() }
  const thumbs = {}
  for (const b of backups) {
    for (const t of TABLES) {
      for (const rec of b[t]) {
        const cur = merged[t].get(rec.id)
        if (!cur || rec.updated_at > cur.updated_at) {
          merged[t].set(rec.id, rec)
          if (t === 'photos') {
            if (b.thumbs[rec.id]) thumbs[rec.id] = b.thumbs[rec.id]
            else delete thumbs[rec.id]
          }
        }
      }
    }
  }
  return { products: [...merged.products.values()], photos: [...merged.photos.values()], thumbs }
}

export async function planImport(db, data) {
  const counts = {}
  const writes = {}
  for (const t of TABLES) {
    const incoming = data[t]
    const existing = await db.table(t).bulkGet(incoming.map(r => r.id))
    counts[t] = { new: 0, updated: 0, unchanged: 0 }
    writes[t] = []
    incoming.forEach((rec, i) => {
      const cur = existing[i]
      if (!cur) {
        counts[t].new++
        writes[t].push(rec)
      } else if (rec.updated_at > cur.updated_at) {
        counts[t].updated++
        writes[t].push(rec)
      } else {
        counts[t].unchanged++
      }
    })
  }
  writes.thumbs = writes.photos.filter(p => !p.deleted).map(p => data.thumbs[p.id])
  writes.deadThumbs = writes.photos.filter(p => p.deleted).map(p => p.id)
  return { counts, writes }
}

export async function applyImport(db, plan) {
  await db.transaction('rw', db.products, db.photos, db.thumbs, async () => {
    const w = plan.writes
    if (w.products?.length) await db.products.bulkPut(w.products)
    if (w.photos?.length) await db.photos.bulkPut(w.photos)
    if (w.deadThumbs?.length) await db.thumbs.bulkDelete(w.deadThumbs)
    if (w.thumbs?.length) await db.thumbs.bulkPut(w.thumbs)
  })
}

const pad = n => String(n).padStart(2, '0')

// Local time: the filename is what the user sees in Drive
export function backupFilename(kind, date = new Date()) {
  const d = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`
  return `${APP_ID}-${kind === 'incremental' ? 'incr' : 'full'}-${d}.zip`
}
