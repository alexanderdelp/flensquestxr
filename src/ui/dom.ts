/** Kleine DOM-Helfer für die Bildschirme. Alles hängt am Element #app. */
export { esc } from './text';

/** Wurzelelement der Seite; erst beim Gebrauch gesucht, damit reine Module ohne DOM testbar bleiben. */
export const app = {
  get el() { return document.querySelector<HTMLDivElement>('#app')!; },
  querySelector<T extends Element = HTMLElement>(sel: string) { return this.el.querySelector<T>(sel as never) as T | null; },
  querySelectorAll<T extends Element = HTMLElement>(sel: string) { return this.el.querySelectorAll<T>(sel as never); },
};

import { logo, XR_SIGN } from './xr';

export const LOGO = logo();
export { logo, XR_SIGN };

export function html(markup: string) { app.el.innerHTML = markup; }

export function on(sel: string, fn: (el: HTMLElement) => void) {
  app.querySelectorAll<HTMLElement>(sel).forEach((el) => el.addEventListener('click', () => fn(el)));
}

/** Zeigt oder versteckt einen Kasten über dem Brett (Banner, Zeile, Rückblick, Tooltip). */
export function setBox(sel: string, content: string | null) {
  const el = app.querySelector<HTMLElement>(sel);
  if (!el) return;
  el.hidden = content === null;
  if (content !== null) el.innerHTML = content;
}
