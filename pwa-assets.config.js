import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

const background = '#06261c'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    apple: { sizes: [180], padding: 0, resizeOptions: { background } },
    // Maskable comes from public/icon-maskable.svg (scripts/maskable.mjs): padding here would frame the gradient in a flat border
    maskable: { sizes: [] },
  },
  images: ['public/icon.svg'],
})
