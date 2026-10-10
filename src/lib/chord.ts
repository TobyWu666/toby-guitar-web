/**
 * 和弦按法圖的 SVG：<Chord> 元件和 /tools/chord/ 編輯器共用，所以兩邊畫出來一模一樣。
 * 陣列都從第 6 弦（低音 E）排到第 1 弦；frets 的 null = 不彈、0 = 空弦。
 */
import { noteNameAt } from './music';

/** 版面尺寸（viewBox 單位）：第 6 弦的 x、琴枕的 y、弦距、格距 */
export const CHORD_GEOM = { X0: 34, Y0: 50, G: 20, C: 26 } as const;
const { X0, Y0, G, C } = CHORD_GEOM;
const R = 9;

export type Frets = (number | null)[];
/** 指法：'1'–'4' 或 'T'（拇指），null = 不標 */
export type Fingers = (string | null)[];

function splitSix(s: string, what: string): string[] {
  const parts = s.includes(',') ? s.split(',').map((p) => p.trim()) : [...s.trim()];
  if (parts.length !== 6) throw new Error(`${what}要有 6 條弦：「${s}」`);
  return parts;
}

/** "x02010" 或 "x,10,12,12,11,10" → 每條弦的格數 */
export function parseChordFrets(frets: string): Frets {
  return splitSix(frets, '和弦按法').map((p) => {
    if (/^[xX]$/.test(p)) return null;
    const n = Number(p);
    if (!Number.isInteger(n) || n < 0) throw new Error(`看不懂的格數：「${p}」（x = 不彈、0 = 空弦）`);
    return n;
  });
}

/** "x02010" → 指法；x、0 或其他符號 = 不標 */
export function parseChordFingers(fingers: string): Fingers {
  return splitSix(fingers, '指法').map((p) => (/^[1-4]$/.test(p) ? p : /^[tT]$/.test(p) ? 'T' : null));
}

/** 沒指定起始格時：4 格內按得到就從第 1 格（畫琴枕），否則從最低的按壓格開始 */
export function autoBase(frets: Frets): number {
  const pressed = frets.filter((f): f is number => f !== null && f > 0);
  const maxF = Math.max(0, ...pressed);
  return maxF <= 4 ? 1 : Math.min(...pressed);
}

/**
 * 橫按：同一隻手指在同一格按兩條以上的弦就畫成一條橫槓
 * （中間的弦要嘛不彈、要嘛按在同一格或更高的格，不能是空弦）。
 */
export function findBarres(frets: Frets, fingers: Fingers) {
  const out: { fret: number; from: number; to: number; finger: string }[] = [];
  const seen = new Set<string>();
  frets.forEach((f, i) => {
    const fg = fingers[i];
    if (f === null || f <= 0 || !fg) return;
    const key = `${fg}@${f}`;
    if (seen.has(key)) return;
    seen.add(key);
    let to = i;
    for (let j = i + 1; j < 6; j++) if (frets[j] === f && fingers[j] === fg) to = j;
    if (to === i) return;
    const between = frets.slice(i + 1, to);
    if (between.every((b) => b === null || b >= f)) out.push({ fret: f, from: i, to, finger: fg });
  });
  return out;
}

export function chordLabel(name: string, frets: Frets) {
  return `${name} 和弦按法：` + frets.map((f, i) => `${6 - i} 弦 ${f === null ? '不彈' : f === 0 ? '空弦' : `${f} 格`}`).join('、');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface ChordDiagramOpts {
  name: string;
  frets: Frets;
  fingers?: Fingers;
  /** 根音（拼音名用，例如 Bb 才會顯示 B♭ 而不是 A♯） */
  root?: string;
  /** 起始格（不填 = 自動） */
  base?: number;
  /** 至少畫幾格（編輯器用來留空間點擊） */
  minRows?: number;
}

export function chordDiagram(o: ChordDiagramOpts) {
  const fs = o.frets;
  const fingers = o.fingers ?? [];
  const pressed = fs.filter((f): f is number => f !== null && f > 0);
  const maxF = Math.max(0, ...pressed);
  const minF = pressed.length ? Math.min(...pressed) : Infinity;
  const base = Math.max(1, Math.min(o.base ?? autoBase(fs), minF));
  const rows = Math.max(o.minRows ?? 4, maxF - base + 1);
  const W = X0 + 5 * G + 20;
  const H = Y0 + rows * C + 30;
  const x = (i: number) => X0 + i * G;
  const y = (f: number) => Y0 + (f - base + 0.5) * C;
  const barres = findBarres(fs, fingers);
  const inBarre = (i: number) => barres.some((b) => fs[i] === b.fret && fingers[i] === b.finger && i >= b.from && i <= b.to);

  const p: string[] = [];
  p.push(`<text class="title" x="${X0 + 2.5 * G}" y="18">${esc(o.name)}</text>`);
  if (base === 1) p.push(`<rect class="nut" x="${X0 - 1}" y="${Y0 - 4}" width="${5 * G + 2}" height="5"></rect>`);
  else
    p.push(
      `<line class="fret" x1="${X0}" y1="${Y0}" x2="${X0 + 5 * G}" y2="${Y0}"></line>`,
      `<text class="lbl" x="${X0 - 8}" y="${Y0 + C / 2}" text-anchor="end" dominant-baseline="central">${base}fr</text>`,
    );
  for (let k = 1; k <= rows; k++) p.push(`<line class="fret" x1="${X0}" y1="${Y0 + k * C}" x2="${X0 + 5 * G}" y2="${Y0 + k * C}"></line>`);
  fs.forEach((f, i) => {
    p.push(
      `<line class="str" x1="${x(i)}" y1="${Y0}" x2="${x(i)}" y2="${Y0 + rows * C}" stroke-width="${+(1 + (5 - i) * 0.3).toFixed(1)}"></line>`,
      `<text class="lbl" x="${x(i)}" y="${Y0 - 14}" text-anchor="middle">${f === null ? '×' : f === 0 ? '○' : ''}</text>`,
      `<text class="lbl" x="${x(i)}" y="${H - 6}" text-anchor="middle">${f === null ? '' : noteNameAt(6 - i, f, o.root)}</text>`,
    );
  });
  for (const b of barres)
    p.push(
      `<g class="note"><rect class="bar" x="${x(b.from) - R}" y="${y(b.fret) - R}" width="${x(b.to) - x(b.from) + 2 * R}" height="${2 * R}" rx="${R}"></rect>` +
        `<text x="${x(b.from)}" y="${y(b.fret)}" style="font-size:11px">${esc(b.finger)}</text></g>`,
    );
  fs.forEach((f, i) => {
    if (f === null || f <= 0 || inBarre(i)) return;
    p.push(
      `<g class="note"><circle cx="${x(i)}" cy="${y(f)}" r="${R}"></circle>` +
        `<text x="${x(i)}" y="${y(f)}" style="font-size:11px">${esc(fingers[i] ?? '')}</text></g>`,
    );
  });

  return { W, H, viewBox: `0 0 ${W} ${H}`, body: p.join(''), base, rows, label: chordLabel(o.name, fs) };
}
