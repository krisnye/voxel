import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// https://vitejs.dev/config/
export default defineConfig( {
  assetsInclude: [ '**/*.gltf', '**/*.frag', '**/*.vert' ],
  // plugins: [preact()], // this shit doesn't work well with effects
} )
