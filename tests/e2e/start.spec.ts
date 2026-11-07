import { expect, test } from '@playwright/test';
import pkg from '../../package.json' with { type: 'json' };
import { spoken, startGame, stubSpeech } from './helpers';

const { version } = pkg;

test.beforeEach(async ({ page }) => { await stubSpeech(page); });

test('Startseite und Kampagnenauswahl zeigen die Version', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.version')).toHaveText(`Version ${version}`);
  await page.locator('[data-new]').click();
  await expect(page.locator('.version')).toHaveText(`Version ${version}`);
});

test('vom Titel bis aufs Brett, mit Kampagnen- und Kapiteltext als einziger Ansage', async ({ page }) => {
  await startGame(page, { campaign: 'akte' });
  const said = await spoken(page);
  expect(said).toContain('Die Akte Förde');
  expect(said).toContain('Kapitel 1');
  expect(said).not.toMatch(/ist dran|Leuchtturm|Rechner/);
  await expect(page.locator('.side .pc')).toHaveCount(2);
});

test('Spielstand bleibt nach dem Neuladen erhalten', async ({ page }) => {
  await startGame(page);
  await page.reload();
  await expect(page.locator('[data-go]')).toContainText('Der Fall Hafenlogbuch, Kapitel 1');
});

test('das Logo im Spiel führt erst nach Rückfrage zum Titel', async ({ page }) => {
  await startGame(page);
  await expect(page.locator('.top button', { hasText: 'Menü' })).toHaveCount(0);
  const asked: string[] = [];
  page.once('dialog', (d) => { asked.push(d.message()); void d.dismiss(); });
  await page.locator('.top [data-quit]').click();
  expect(asked[0]).toContain('wirklich verlassen');
  await expect(page.locator('canvas.board')).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await page.locator('.top [data-quit]').click();
  await expect(page.locator('canvas.board')).toHaveCount(0);
  await expect(page.locator('[data-new]')).toBeVisible();
});
