/*
 Das XR-Schild über dem FlensQuest-Schriftzug: Schablonenbuchstaben wie auf Frachtkisten am Hafen,
 möwenweiß auf Förde-Blau mit Goldrand. Die Buchstaben sind als Flächen gezeichnet und nicht gesetzt,
 damit das Schild auf jedem Gerät gleich aussieht, auch ohne passende Systemschrift. Als SVG skaliert
 es mit dem Logo oder Titelbild, an dem es hängt; die Lage regelt style.css über die Klasse.
*/

/** Fester Teil: Schatten, Schild, X mit Schablonensteg und R mit abgesetztem Bauch. */
const SIGN = `<svg class="xr" viewBox="0 0 104 64" aria-hidden="true" focusable="false">
  <rect x="6" y="7" width="94" height="54" rx="4" fill="#0b2533"/>
  <rect x="3" y="3" width="94" height="54" rx="4" fill="#1f4e66" stroke="#e2a93b" stroke-width="4"/>
  <g fill="#f7f4ee">
    <polygon points="12,10 24,10 46,50 34,50"/>
    <polygon points="34,10 46,10 39.4,22 27.4,22"/>
    <polygon points="18.6,38 30.6,38 24,50 12,50"/>
    <rect x="54" y="10" width="11" height="40"/>
    <path d="M68,15.5 H77 A8,8 0 0 1 77,31.5 H68" fill="none" stroke="#f7f4ee" stroke-width="11"/>
    <polygon points="72,40 84,40 92,50 80,50"/>
  </g>
</svg>`;

/** Das Schild allein. */
export const XR_SIGN = SIGN;

/** Schriftzug mit XR-Schild; mini für die Kopfleiste im Spiel. */
export function logo(mini = false) {
  return `<span class="brandmark${mini ? ' mini' : ''}"><img class="logo${mini ? ' mini' : ''}" src="img/schriftzug.webp" alt="FlensQuest XR">${SIGN}</span>`;
}
