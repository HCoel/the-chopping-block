import axe from './axe/index.js'

export const LIBRARIES = [axe]

export function getLibrary(id) {
  return LIBRARIES.find(l => l.id === id)
}
