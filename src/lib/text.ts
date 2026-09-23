export interface SearchItem {
  type: 'lesson' | 'topic';
  url: string;
  title: string;
  /** 顯示在標題前的小標籤：「第 14 堂」或分類名稱 */
  tag: string;
  meta: string;
  summary: string;
  keywords: string;
  body: string;
}

/**
 * 把 MDX 原文轉成純文字給搜尋用：
 * 拿掉 import、標記語法；元件標籤裡用引號包起來的文字（例如 q="…"、title="…"）會保留下來。
 */
export function mdxToText(src: string): string {
  return src
    .replace(/^import\s.+$/gm, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[A-Za-z][^>]*>/g, (tag) => {
      const texts = [...tag.matchAll(/(?:title|caption|q|alt|name)="([^"]*)"/g)].map((m) => m[1]);
      return ` ${texts.join(' ')} `;
    })
    .replace(/<\/[A-Za-z][^>]*>/g, ' ')
    .replace(/^\s*(?:[-+]|\d+\.)\s+/gm, '')
    .replace(/-{3,}/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|]/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
