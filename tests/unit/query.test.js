import { describe, expect, test } from 'vitest'
import { facetOptions, matchesSearch, queryProducts } from '../../src/core/query.js'
import * as axe from '../../src/libraries/axe/definition.js'

const lib = axe
const make = (id, name, fields = {}, extra = {}) => ({
  id, name, notes: '', library: 'axe', updated_at: `2026-01-0${id}T00:00:00.000Z`,
  fields: { ...axe.newFields(), ...fields }, ...extra,
})

const products = [
  make('1', 'Plumb Dayton', { maker: 'Plumb', pattern: 'Dayton', weight_g: 1590, acquired_date: '2025-03-01', stamp_text: 'PLUMB PHILA' }),
  make('2', 'Kelly Michigan', { maker: 'Kelly', pattern: 'Michigan', weight_g: 1800, acquired_date: '2026-02-01', collection_status: 'for trade' }),
  make('3', 'Mystery hatchet', { pattern: 'Hatchet' }, { notes: 'From the shed' }),
]

describe('search', () => {
  test.each([
    ['plumb', ['1']],
    ['phila', ['1']],
    ['MICHIGAN', ['2']],
    ['shed', ['3']],
    ['', ['1', '2', '3']],
  ])('%s', (q, ids) => {
    expect(products.filter(p => matchesSearch(p, q)).map(p => p.id)).toEqual(ids)
  })
})

describe('filters', () => {
  test('within a facet options OR; across facets AND', () => {
    const ids = filters => queryProducts(products, lib, { filters }).map(p => p.id)
    expect(ids({ pattern: ['Dayton', 'Hatchet'] })).toEqual(['3', '1'])
    expect(ids({ pattern: ['Dayton', 'Michigan'], collection_status: ['for trade'] })).toEqual(['2'])
  })

  test('maker and pattern options come from the collection', () => {
    const maker = lib.facets.find(f => f.key === 'maker')
    expect(facetOptions(maker, products)).toEqual(['Kelly', 'Plumb'])
    const status = lib.facets.find(f => f.key === 'collection_status')
    expect(facetOptions(status, products)).toEqual(axe.COLLECTION)
  })

  test('deleted products are excluded', () => {
    expect(queryProducts([...products, make('4', 'Gone', {}, { deleted: true })], lib).map(p => p.id)).not.toContain('4')
  })
})

describe('sorts', () => {
  const ids = sort => queryProducts(products, lib, { sort }).map(p => p.id)
  test('name by default', () => expect(ids('name')).toEqual(['2', '3', '1']))
  test('maker A-Z, blank maker last', () => expect(ids('maker')).toEqual(['2', '1', '3']))
  test('heaviest first, no weight last', () => expect(ids('weight')).toEqual(['2', '1', '3']))
  test('newest acquired first, no date last', () => expect(ids('acquired')).toEqual(['2', '1', '3']))
  test('pattern in list order', () => expect(ids('pattern')).toEqual(['1', '2', '3']))
})
