import base from './playwright.config';
import { defineConfig } from '@playwright/test';

/** Bilder fürs Anschauen und für Telegram: `npm run shots`, Ausgabe in shots/. Kein Test im eigentlichen Sinn. */
export default defineConfig({ ...base, testDir: 'tests/shots', fullyParallel: false, workers: 1 });
