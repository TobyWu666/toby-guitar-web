import type { APIRoute } from 'astro';
import { CATEGORIES } from '@/data/site';
import { fmtShort, getLessons, getTopics, lessonUrl, topicUrl } from '@/lib/content';
import { mdxToText, type SearchItem } from '@/lib/text';

/** 全站搜尋索引（build 時產生的靜態 JSON） */
export const GET: APIRoute = async () => {
  const [lessons, topics] = await Promise.all([getLessons(), getTopics()]);
  const topicName = new Map(topics.map((t) => [t.id, t.data.name]));

  const items: SearchItem[] = [
    ...lessons.map((l) => ({
      type: 'lesson' as const,
      url: lessonUrl(l),
      title: l.data.title,
      tag: `第 ${l.data.lesson} 堂`,
      meta: fmtShort(l.data.date),
      summary: l.data.summary,
      keywords: l.data.topics.map((t) => topicName.get(t.id) ?? '').join(' '),
      body: [mdxToText(l.body ?? ''), ...l.data.homework].join(' '),
    })),
    ...topics.map((t) => ({
      type: 'topic' as const,
      url: topicUrl(t.id),
      title: t.data.name,
      tag: CATEGORIES[t.data.category].name,
      meta: '知識點',
      summary: t.data.description,
      keywords: '',
      body: mdxToText(t.body ?? ''),
    })),
  ];
  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
