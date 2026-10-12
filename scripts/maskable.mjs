// Android crops maskable icons to circles, squircles etc. The artwork keeps its full-bleed background
// and only the axe shrinks into the safe zone (inner 80%), so no padding band appears.
import sharp from 'sharp'

await sharp('public/icon-maskable.svg', { density: 288 }).resize(512, 512).png().toFile('public/maskable-icon-512x512.png')
console.log('✔ maskable-icon-512x512.png')
