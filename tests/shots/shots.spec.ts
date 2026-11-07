import { test, type Page } from '@playwright/test';
import { startGame, stubSpeech } from '../e2e/helpers';

/*
 * Bilder vom Spiel für die Durchsicht: Titel, Figurenwahl, Brett (normal und Zoom 3), Kiosk
 * und ein Bogen mit allen Sprites in groß. Ausgabe nach shots/ (nicht im Repo).
 */
const out = (name: string) => `shots/${name}.png`;

async function freezeBoard(page: Page, zoom: number) {
  await page.evaluate((zoom) => {
    type B = { stop(): void; draw(): void; sync(g: unknown): void; zoomAt(f: number): void; focusTile(x: number, y: number): void; zoom: number; time: number };
    const f = (window as unknown as { __flens: { board: B; game: any } }).__flens;
    const b = f.board, g = f.game;
    b.stop();
    g.seen = g.seen.map((r: boolean[]) => r.map(() => true));
    while (b.zoom < zoom * 0.98) b.zoomAt(Math.min(1.2, zoom / b.zoom));
    const h = g.heroes[0];
    b.focusTile(h.x + 2, h.y + 1);
    b.sync(g); b.time = 123_456; b.draw();
  }, zoom);
}

test('titel', async ({ page }) => {
  await stubSpeech(page);
  await page.goto('/');
  await page.screenshot({ path: out('titel') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: out('titel-iphone') });
});

test('figurenwahl', async ({ page }) => {
  await stubSpeech(page);
  await page.goto('/');
  await page.locator('[data-new]').click();
  await page.locator('[data-campaign="hafen"]').click();
  await page.locator('[data-hero="nordhexe"]').click();
  await page.screenshot({ path: out('figurenwahl') });
});

test('brett', async ({ page }) => {
  await stubSpeech(page);
  await startGame(page, { heroes: ['nordhexe', 'joern', 'maren', 'frauke'] });
  await freezeBoard(page, 1);
  await page.screenshot({ path: out('brett') });
  await freezeBoard(page, 3);
  await page.screenshot({ path: out('brett-zoom3') });
});

test('kiosk', async ({ page }) => {
  await stubSpeech(page);
  await startGame(page, { heroes: ['nordhexe', 'joern', 'maren', 'hinnerk'] });
  await page.evaluate(async () => {
    const f = (window as unknown as { __flens: { board: { stop(): void }; campaign: { oere: number } } }).__flens;
    f.board.stop();
    f.campaign.oere = 40;
    const url = '/src/ui/screens/shop.ts';
    const m = await import(/* @vite-ignore */ url);
    m.shop();
  });
  await page.screenshot({ path: out('kiosk'), fullPage: true });
});

for (const [name, px, only] of [['bogen', 96, ''], ['bogen-figuren', 192, 'Figuren'], ['bogen-gegner', 160, 'Gegner']] as const) test(name, async ({ page }) => {
  await stubSpeech(page);
  await page.goto('/');
  await page.evaluate(async ([px, only]) => {
    const urls = ['/src/ui/sprites.ts', '/src/content/index.ts'];
    const [s, c] = await Promise.all(urls.map((u) => import(/* @vite-ignore */ u)));
    const heroes = Object.keys(c.HEROES).filter((id) => !c.HEROES[id].hidden).concat('juni');
    const monsters = Object.keys(c.MONSTERS);
    const rows: [string, HTMLCanvasElement[]][] = [
      ['Figuren', heroes.flatMap((id) => [s.heroSprite(id, [], 0), s.heroSprite(id, [], 2), s.heroSprite(id, ['friesennerz', 'gummistiefel', 'bootshaken', 'katzenohren'], 0, false, 2)])],
      ['Liegend, Piet', [...heroes.map((id) => s.heroDown(id, [])), s.piet(0), s.piet(1)]],
      ['Gegner', monsters.slice(0, 10).map((id) => s.monsterSprite(id, 0))],
      ['Gegner', monsters.slice(10).map((id) => s.monsterSprite(id, 0))],
      ['Dinge', Object.entries(s.objects).map(([, fn]) => (fn as (f: number) => HTMLCanvasElement)(0))],
      ['Boden', s.THEMES.flatMap((_: unknown, t: number) => [s.floorTile(t, 0), s.floorTile(t, 9), s.wallFace(t, 0), s.wallFace(t, 9)])],
    ];
    document.body.innerHTML = '';
    document.body.style.background = '#1b2a33';
    for (const [label, imgs] of rows.filter(([l]) => !only || l === only)) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:6px;align-items:center;margin:6px;flex-wrap:wrap;color:#eee;font:14px sans-serif';
      row.append(label);
      for (const i of imgs) {
        const img = document.createElement('img');
        img.src = i.toDataURL();
        img.style.cssText = `width:${px}px;height:${px}px;image-rendering:pixelated;background:#2c3e48`;
        row.append(img);
      }
      document.body.append(row);
    }
  }, [px, only] as const);
  await page.setViewportSize({ width: 1500, height: 900 });
  await page.screenshot({ path: out(name), fullPage: true });
});
