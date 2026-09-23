/**
 * 吉他樂理小工具：拼出正確的音名（A 小調的 ♭3 是 C、不是 B♯）、計算指板上每一格的音與音程。
 * 弦的編號跟 TAB 譜一樣：1 = 最細的高音 E 弦，6 = 最粗的低音 E 弦。
 */

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** 標準調音每條空弦的音高（pitch class） */
const OPEN_PC: Record<number, number> = { 1: 4, 2: 11, 3: 7, 4: 2, 5: 9, 6: 4 };
/** 大調音階各級距離根音的半音數，用來換算音程 */
const MAJOR_SEMIS = [0, 0, 2, 4, 5, 7, 9, 11];

export const STRING_NAMES: Record<number, string> = { 1: 'e', 2: 'B', 3: 'G', 4: 'D', 5: 'A', 6: 'E' };

export const SCALES: Record<string, string> = {
  major: '1 2 3 4 5 6 7',
  minor: '1 2 b3 4 5 b6 b7',
  'major-pentatonic': '1 2 3 5 6',
  'minor-pentatonic': '1 b3 4 5 b7',
  blues: '1 b3 4 b5 5 b7',
  'major-triad': '1 3 5',
  'minor-triad': '1 b3 5',
  'dim-triad': '1 b3 b5',
  'aug-triad': '1 3 #5',
  dom7: '1 3 5 b7',
  maj7: '1 3 5 7',
  min7: '1 b3 5 b7',
};

interface Interval { degree: number; semis: number; label: string }

function parseInterval(s: string): Interval {
  const m = s.trim().match(/^([b♭#♯]*)(\d+)$/);
  if (!m) throw new Error(`看不懂的音程：「${s}」（例：1、b3、#5）`);
  const acc = [...m[1]].reduce((n, c) => n + (c === '#' || c === '♯' ? 1 : -1), 0);
  const degree = ((Number(m[2]) - 1) % 7) + 1;
  const semis = (((MAJOR_SEMIS[degree] + acc) % 12) + 12) % 12;
  const label = degree === 1 && acc === 0 ? 'R' : m[1].replace(/b/g, '♭').replace(/#/g, '♯') + degree;
  return { degree, semis, label };
}

/** 半音數 → 預設的音程名稱（沒有指定音階時用） */
const DEFAULT_INTERVALS = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'].map(parseInterval);

interface Note { letter: string; pc: number }

export function parseNote(name: string): Note {
  const m = name.trim().match(/^([A-Ga-g])([b♭#♯]*)$/);
  if (!m) throw new Error(`看不懂的音名：「${name}」（例：A、F#、Bb）`);
  const letter = m[1].toUpperCase();
  const acc = [...m[2]].reduce((n, c) => n + (c === '#' || c === '♯' ? 1 : -1), 0);
  return { letter, pc: (((LETTER_PC[letter] + acc) % 12) + 12) % 12 };
}

/** 從根音往上某個音程，拼出正確的音名 */
function spell(root: Note, iv: Interval): string {
  const letter = LETTERS[(LETTERS.indexOf(root.letter as (typeof LETTERS)[number]) + iv.degree - 1) % 7];
  const target = (root.pc + iv.semis) % 12;
  const diff = ((target - LETTER_PC[letter] + 18) % 12) - 6;
  return letter + (diff > 0 ? '♯'.repeat(diff) : '♭'.repeat(-diff));
}

export function intervalsOf(scale: string): Interval[] {
  const def = SCALES[scale] ?? scale; // 也可以直接寫音程，例如 "1 3 5 b7"
  return def.split(/\s+/).filter(Boolean).map(parseInterval);
}

export interface FretNote { string: number; fret: number; name: string; interval: string; isRoot: boolean }

export function pitchAt(string: number, fret: number) {
  return (OPEN_PC[string] + fret) % 12;
}

function describe(string: number, fret: number, root: Note, ivs: Interval[]): FretNote {
  const semis = (pitchAt(string, fret) - root.pc + 12) % 12;
  const iv = ivs.find((i) => i.semis === semis) ?? DEFAULT_INTERVALS[semis];
  return { string, fret, name: spell(root, iv), interval: iv.label, isRoot: semis === 0 };
}

/** "6/5 6/8 5/5" → [{string:6,fret:5}, …] */
export function parsePositions(s: string) {
  return s.split(/\s+/).filter((t) => t && t !== '|').map((t) => {
    const m = t.match(/^([1-6])\/(\d+)$/);
    if (!m) throw new Error(`看不懂的位置：「${t}」（格式：弦/格，例如 6/5）`);
    return { string: Number(m[1]), fret: Number(m[2]) };
  });
}

/**
 * 算出指板圖上要標的音：
 * - 給 notes：只標這些位置
 * - 只給 scale：標出 from–to 格之間所有屬於這個音階的音
 */
export function fretboardNotes(opts: { root: string; scale?: string; notes?: string; from: number; to: number }): FretNote[] {
  const root = parseNote(opts.root);
  const ivs = opts.scale ? intervalsOf(opts.scale) : [];
  if (opts.notes) return parsePositions(opts.notes).map((p) => describe(p.string, p.fret, root, ivs));
  if (!opts.scale) throw new Error('Fretboard 需要 notes 或 scale 其中一個');
  const set = new Set(ivs.map((i) => (root.pc + i.semis) % 12));
  const out: FretNote[] = [];
  for (let s = 1; s <= 6; s++)
    for (let f = opts.from; f <= opts.to; f++) if (set.has(pitchAt(s, f))) out.push(describe(s, f, root, ivs));
  return out;
}

/** 和弦按法 "x02010" 或 "x,10,12,12,11,10" → 每條弦（6→1）的格數，null = 不彈 */
export function parseChordFrets(frets: string): (number | null)[] {
  const parts = frets.includes(',') ? frets.split(',') : [...frets];
  if (parts.length !== 6) throw new Error(`和弦按法要有 6 條弦：「${frets}」`);
  return parts.map((p) => (/^[xX]$/.test(p.trim()) ? null : Number(p)));
}

export function noteNameAt(string: number, fret: number, root?: string) {
  if (root) return describe(string, fret, parseNote(root), []).name;
  const SHARP = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  return SHARP[pitchAt(string, fret)];
}
