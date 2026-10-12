import { describe, expect, test } from 'vitest'
import * as axe from '../../src/libraries/axe/definition.js'
import { formatLbOz, formatWeight, toLbOz } from '../../src/core/weight.js'

const product = (fields = {}, extra = {}) => ({ library: 'axe', name: '', notes: '', fields: { ...axe.newFields(), ...fields }, ...extra })
const TODAY = '2026-10-12'

describe('validate', () => {
  test('needs a maker or a pattern', () => {
    expect(axe.validate(product(), TODAY)).toHaveProperty('maker')
    expect(axe.validate(product({ maker: '  ' }), TODAY)).toHaveProperty('maker')
    expect(axe.validate(product({ maker: 'Plumb' }), TODAY)).toEqual({})
    expect(axe.validate(product({ pattern: 'Dayton' }), TODAY)).toEqual({})
  })

  test.each([
    ['weight_g', 20], ['weight_g', 20000], ['bit_length_mm', 0], ['haft_length_mm', 5000], ['price_paid', -1],
  ])('%s = %s is out of range', (key, value) => {
    expect(axe.validate(product({ maker: 'Plumb', [key]: value }), TODAY)).toHaveProperty(key)
  })

  test('acquired date cannot be in the future', () => {
    expect(axe.validate(product({ maker: 'Plumb', acquired_date: '2026-10-13' }), TODAY)).toHaveProperty('acquired_date')
    expect(axe.validate(product({ maker: 'Plumb', acquired_date: TODAY }), TODAY)).toEqual({})
  })
})

describe('names and summary', () => {
  test('defaultName joins maker and pattern', () => {
    expect(axe.defaultName(product({ maker: 'Plumb', pattern: 'Dayton' }))).toBe('Plumb Dayton')
    expect(axe.defaultName(product({ pattern: 'Hatchet' }))).toBe('Hatchet')
    expect(axe.defaultName(product())).toBe('Unnamed axe')
  })

  test('editableName blanks auto-generated names', () => {
    expect(axe.editableName(product({ maker: 'Plumb' }, { name: 'Plumb' }))).toBe('')
    expect(axe.editableName(product({ maker: 'Plumb' }, { name: 'Grandad\'s' }))).toBe('Grandad\'s')
  })

  test('summary shows lb/oz and restoration', () => {
    expect(axe.summary(product({ pattern: 'Dayton', weight_g: 1588 }))).toBe('3 lb 8 oz · as found')
    expect(axe.summary(product({ restoration: null }))).toBe('')
  })
})

describe('weight', () => {
  test.each([
    [1588, { lb: 3, oz: 8 }],
    [1814, { lb: 4, oz: 0 }],
    [397, { lb: 0, oz: 14 }],
  ])('%s g', (g, expected) => expect(toLbOz(g)).toEqual(expected))

  test('formats', () => {
    expect(formatLbOz(1814)).toBe('4 lb')
    expect(formatLbOz(397)).toBe('14 oz')
    expect(formatWeight(1588)).toBe('1.59 kg · 3 lb 8 oz')
    expect(formatWeight(850)).toBe('850 g · 1 lb 14 oz')
    expect(formatWeight(null)).toBeNull()
  })
})
