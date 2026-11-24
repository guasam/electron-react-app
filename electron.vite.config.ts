import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'electron-vite'

// Shared alias configuration
const aliases = {
  '@/app': resolve(__dirname, 'app'),
  '@/lib': resolve(__dirname, 'lib'),
  '@/conveyor': resolve(__dirname, 'conveyor'),
  '@/resources': resolve(__dirname, 'resources'),
  '@/modules': resolve(__dirname, 'modules'),
  '@/shared': resolve(__dirname, 'shared'),
}

export default defineConfig({
  main: {
    build: {
      rolldownOptions: {
        input: {
          main: resolve(__dirname, 'lib/main/main.ts'),
        },
      },
    },
    resolve: {
      alias: aliases,
    },
  },
  preload: {
    build: {
      // A sandboxed preload can require only Electron; bundle the bridge.
      externalizeDeps: { exclude: ['electron-conveyor'] },
      rolldownOptions: {
        input: {
          preload: resolve(__dirname, 'lib/preload/preload.ts'),
        },
      },
    },
    resolve: {
      alias: aliases,
    },
  },
  renderer: {
    root: './app',
    build: {
      rolldownOptions: {
        input: {
          index: resolve(__dirname, 'app/index.html'),
        },
      },
    },
    resolve: {
      alias: aliases,
      // Insurance for local framework work: when electron-conveyor is swapped to a file:/linked
      // checkout it brings its own node_modules, and two React copies break context/hooks. Off the
      // registry the dependency graph already shares one copy, so this is a no-op there.
      dedupe: ['react', 'react-dom', '@tanstack/react-query', 'zustand'],
    },
    plugins: [tailwindcss(), react()],
  },
})
