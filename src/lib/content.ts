import { getCollection, type CollectionEntry } from 'astro:content';

export type Lesson = CollectionEntry<'lessons'>;
export type Topic = CollectionEntry<'topics'>;

/** 所有已發布的課，最新的在前面。編號重複會直接讓 build 失敗。 */
export async function getLessons(): Promise<Lesson[]> {
  const all = (await getCollection('lessons', (l) => import.meta.env.DEV || !l.data.draft)).sort(
    (a, b) => b.data.lesson - a.data.lesson,
  );
  const seen = new Map<number, string>();
  for (const l of all) {
    const dup = seen.get(l.data.lesson);
    if (dup) throw new Error(`第 ${l.data.lesson} 堂重複了：${dup} 和 ${l.id}`);
    seen.set(l.data.lesson, l.id);
  }
  return all;
}

export async function getTopics(): Promise<Topic[]> {
  return (await getCollection('topics')).sort(
    (a, b) => a.data.level - b.data.level || a.data.category.localeCompare(b.data.category),
  );
}

export const lessonUrl = (l: Lesson) => `/lessons/${l.data.lesson}/`;
export const topicUrl = (id: string) => `/topics/${id}/`;

/** 每個知識點被哪些課教過（新 → 舊） */
export function lessonsByTopic(lessons: Lesson[]) {
  const map = new Map<string, Lesson[]>();
  for (const l of lessons)
    for (const t of l.data.topics) map.set(t.id, [...(map.get(t.id) ?? []), l]);
  return map;
}

// frontmatter 的日期是 UTC 午夜，一律用 UTC 讀，才不會因為 build 機器的時區差一天
const WEEKDAY = '日一二三四五六';
export const fmtLong = (d: Date) =>
  `${d.getUTCFullYear()} 年 ${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日（${WEEKDAY[d.getUTCDay()]}）`;
export const fmtShort = (d: Date) => `${d.getUTCMonth() + 1}/${d.getUTCDate()}（${WEEKDAY[d.getUTCDay()]}）`;
export const monthKey = (d: Date) => `${d.getUTCFullYear()} 年 ${d.getUTCMonth() + 1} 月`;
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
