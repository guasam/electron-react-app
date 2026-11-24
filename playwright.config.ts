import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/desktop',
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: 'list',
  use: { trace: 'retain-on-failure' },
})
