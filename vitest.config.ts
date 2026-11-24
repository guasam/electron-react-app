import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': resolve(__dirname, '.') } },
  test: { include: ['tests/**/*.test.{ts,tsx}'], pool: 'forks', maxWorkers: 1, testTimeout: 15000 },
})
