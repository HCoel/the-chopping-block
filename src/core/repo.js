import { SLOTS } from './db.js'

const live = rows => rows.filter(r => r && !r.deleted)
const slotOrder = (a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot)

export function createRepo(db, { now = () => new Date().toISOString(), uuid = () => crypto.randomUUID() } = {}) {
  async function listProducts(library) {
    return live(await db.products.where('library').equals(library).toArray())
  }

  async function getProduct(id) {
    const p = await db.products.get(id)
    return p && !p.deleted ? p : undefined
  }

  // Tombstone keeps the row (so the deletion reaches backups) but drops the bytes
  async function clearSlot(productId, slot, t) {
    const thumbs = await db.thumbs.where('product_id').equals(productId).toArray()
    for (const th of thumbs.filter(x => slot === undefined || x.slot === slot)) {
      await db.photos.update(th.id, { deleted: true, data: null, updated_at: t })
      await db.thumbs.delete(th.id)
    }
  }

  // slotChanges: { [slot]: null (remove) | { full, thumb } (replace) }; slots left out are unchanged.
  // Images must be processed before calling: awaiting non-IndexedDB work would end the transaction.
  async function saveProduct(product, slotChanges = {}) {
    return db.transaction('rw', db.products, db.photos, db.thumbs, async () => {
      const t = now()
      const existing = product.id ? await db.products.get(product.id) : undefined
      const rec = {
        deleted: false,
        ...existing,
        ...product,
        id: product.id ?? uuid(),
        created_at: existing?.created_at ?? t,
        updated_at: t,
      }
      await db.products.put(rec)
      for (const [slot, change] of Object.entries(slotChanges)) {
        if (!SLOTS.includes(slot) || change === undefined) continue
        await clearSlot(rec.id, slot, t)
        if (!change) continue
        const id = uuid()
        await db.photos.put({ id, product_id: rec.id, slot, type: change.full.type, data: change.full.data, created_at: t, updated_at: t, deleted: false })
        await db.thumbs.put({ id, product_id: rec.id, slot, type: change.thumb.type, data: change.thumb.data })
      }
      return rec
    })
  }

  async function deleteProduct(id) {
    await db.transaction('rw', db.products, db.photos, db.thumbs, async () => {
      const t = now()
      if (!(await db.products.get(id))) return
      await db.products.update(id, { deleted: true, updated_at: t })
      await clearSlot(id, undefined, t)
    })
  }

  // Thumbs exist exactly for live photos, so they double as the slot index
  async function listThumbs(productId) {
    return (await db.thumbs.where('product_id').equals(productId).toArray()).sort(slotOrder)
  }

  async function getPhoto(id) {
    const p = await db.photos.get(id)
    return p && !p.deleted ? p : undefined
  }

  async function getThumb(id) {
    return db.thumbs.get(id)
  }

  async function getMeta(key) {
    return (await db.meta.get(key))?.value ?? null
  }

  async function setMeta(key, value) {
    await db.meta.put({ key, value })
  }

  return { db, listProducts, getProduct, saveProduct, deleteProduct, listThumbs, getPhoto, getThumb, getMeta, setMeta }
}
