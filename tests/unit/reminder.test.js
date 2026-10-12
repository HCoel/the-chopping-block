import { expect, test } from 'vitest'
import { daysSince, needsBackup, needsFullBackup } from '../../src/core/reminder.js'

const now = Date.parse('2026-10-20T12:00:00.000Z')

test('daysSince', () => {
  expect(daysSince(null, now)).toBeNull()
  expect(daysSince('2026-10-20T00:00:00.000Z', now)).toBe(0)
  expect(daysSince('2026-10-06T12:00:00.000Z', now)).toBe(14)
})

test('needsBackup', () => {
  expect(needsBackup(null, 0, now)).toBe(false)
  expect(needsBackup(null, 3, now)).toBe(true)
  expect(needsBackup('2026-10-07T12:00:00.000Z', 3, now)).toBe(false)
  expect(needsBackup('2026-10-06T12:00:00.000Z', 3, now)).toBe(true)
})

test('needsFullBackup after 60 days or never', () => {
  expect(needsFullBackup(null, 0, now)).toBe(false)
  expect(needsFullBackup(null, 3, now)).toBe(true)
  expect(needsFullBackup('2026-08-22T12:00:00.000Z', 3, now)).toBe(false)
  expect(needsFullBackup('2026-08-21T12:00:00.000Z', 3, now)).toBe(true)
})
