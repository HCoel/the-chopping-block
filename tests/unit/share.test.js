import { expect, test } from 'vitest'
import { canShareFile, shareFile } from '../../src/core/share.js'

const file = { name: 'b.zip' }
const err = (name, message = name) => Object.assign(new Error(message), { name })

test('shares when the share sheet accepts the file', async () => {
  expect(await shareFile(file, { share: async () => {} })).toEqual({ result: 'shared' })
})

test('a cancelled share is not a backup', async () => {
  expect(await shareFile(file, { share: async () => { throw err('AbortError') } })).toEqual({ result: 'cancelled' })
})

test('a refused share reports the real error instead of asking to retry', async () => {
  const out = await shareFile(file, { share: async () => { throw err('NotAllowedError', 'Permission denied') } })
  expect(out).toEqual({ result: 'failed', error: 'NotAllowedError: Permission denied' })
})

test('canShareFile is false where file sharing is missing or throws', () => {
  expect(canShareFile(file, {})).toBe(false)
  expect(canShareFile(file, { canShare: () => { throw new TypeError('x') } })).toBe(false)
  expect(canShareFile(file, { canShare: () => true })).toBe(true)
})
