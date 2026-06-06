import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const configDir = dirname(fileURLToPath(import.meta.url))

export default {
  plugins: {
    tailwindcss: { config: join(configDir, 'tailwind.config.js') },
    autoprefixer: {},
  },
}
