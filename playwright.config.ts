import { defineConfig } from '@playwright/test';

/**
 * E2E: echte Oberfläche im Browser. Lokal mit dem vorhandenen Edge, in der CI mit Chrome;
 * Browser werden nicht heruntergeladen. Eigener Port (5196), getrennt vom Dev-Server und vom
 * Original-Repo flensquest (5191). Immer ein frisch gestarteter Server: Ein schon laufender gehört
 * womöglich einem anderen Projekt, dann lieber eine Fehlermeldung als fremden Code testen.
 */
const channel = process.env.PW_CHANNEL ?? (process.env.CI ? 'chrome' : 'msedge');

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://localhost:5196',
    channel,
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'npx vite --port 5196 --strictPort',
    url: 'http://localhost:5196',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
