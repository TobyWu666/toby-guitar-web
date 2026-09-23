import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CATEGORY_KEYS } from './data/site';

/**
 * 每一堂課：src/content/lessons/<YYYY-MM-DD>-lesson-<N>/index.mdx
 * 同一個資料夾放這堂課用到的圖片、音檔。
 */
const lessons = defineCollection({
  loader: glob({
    pattern: '*/index.mdx',
    base: './src/content/lessons',
    generateId: ({ entry }) => entry.split('/')[0],
  }),
  schema: z.object({
    /** 第幾堂（網址會是 /lessons/<lesson>） */
    lesson: z.number().int().positive(),
    date: z.coerce.date(),
    title: z.string(),
    /** 標題中要用白板筆畫底線的字（選填，必須是 title 的一部分） */
    highlight: z.string().optional(),
    /** 一句話摘要，顯示在列表與搜尋結果 */
    summary: z.string(),
    /** 這堂課涵蓋的知識點（對應 src/content/topics/ 的檔名） */
    topics: z.array(reference('topics')).default([]),
    homework: z.array(z.string()).default([]),
    /** 草稿不會出現在網站上 */
    draft: z.boolean().default(false),
  }),
});

/**
 * 知識點：src/content/topics/<id>.md
 * 內文（選填）會顯示在知識點頁面，可以寫這個觀念的完整說明。
 */
const topics = defineCollection({
  loader: glob({ pattern: '*.{md,mdx}', base: './src/content/topics' }),
  schema: z.object({
    name: z.string(),
    category: z.enum(CATEGORY_KEYS),
    /** 在知識地圖上的欄位：1 = 最基礎 */
    level: z.number().int().min(1).max(4),
    /** 要先學會的知識點 */
    prerequisites: z.array(reference('topics')).default([]),
    description: z.string(),
  }),
});

export const collections = { lessons, topics };
