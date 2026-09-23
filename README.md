# 偷筆吉他 · 筆記

每一堂吉他課的重點、譜例、作業，加上整理好的知識地圖。

## 在自己電腦上看

```bash
npm install     # 第一次才需要
npm run dev     # 打開 http://localhost:4321
```

## 新增一堂課

最簡單的方式：把白板照片和這堂課的重點交給 Claude，請它「新增第 N 堂課」。

想自己寫的話：

1. 在 `src/content/lessons/` 新增資料夾，例如 `2026-09-23-lesson-15/`
2. 裡面放 `index.mdx`（可以複製上一堂來改），照片、音檔也放同一個資料夾
3. `npm run dev` 看看效果

可以用的元件（指板圖、和弦圖、TAB 譜、音檔、白板照片、練習題…）和欄位說明都在 [CLAUDE.md](CLAUDE.md)。

## 資料夾

```
src/content/lessons/   每一堂課（一堂一個資料夾）
src/content/topics/    知識點（知識地圖上的每一格）
src/components/        網站元件（guitar/ 是吉他圖解）
src/styles/global.css  顏色、字體（白板風格）
design/                logo 原稿、風格提案
```
