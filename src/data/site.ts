export const SITE = {
  name: '偷筆吉他',
  tagline: '吉他筆記',
  description: '偷筆吉他的筆記：每一堂課的重點、譜例、作業，以及整理好的知識地圖。',
  lang: 'zh-Hant',
};

/** 知識點分類。顏色在 src/styles/global.css 的 --cat-<key>。 */
export const CATEGORIES = {
  theory: { name: '樂理' },
  fret: { name: '指板' },
  tech: { name: '技巧' },
  rhythm: { name: '節奏' },
  gear: { name: '器材' },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as [CategoryKey, ...CategoryKey[]];

/** 知識地圖的四個欄位名稱（對應 topic 的 level 1–4） */
export const LEVELS = ['第 1 步 · 基礎', '第 2 步', '第 3 步', '第 4 步 · 應用'];
