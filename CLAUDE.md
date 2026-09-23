# 偷筆吉他 · 筆記網站

A guitar teacher's lesson-notes site. The readers are the teacher's students (one group class, knowledge-focused: theory, technique, fretboard — **no song lessons**). All site copy is Traditional Chinese (Taiwan).

- Stack: Astro 7 + MDX, fully static. `npm run dev` (port 4321), `npm run build` (runs `astro check` first).
- Hosting: GitHub Pages at https://guitar.wutoby.com (public repo TobyWu666/toby-guitar-web). Every push to `main` deploys via `.github/workflows/deploy.yml`. DNS for wutoby.com is on Cloudflare (`guitar` CNAME → tobywu666.github.io, DNS only).
- Design: "whiteboard" style — tokens in `src/styles/global.css` (dark mode = chalkboard). Use tokens, never hard-coded colors. Category colours are `--cat-<key>`.
- Logo: `src/components/Logo.astro` (stroke paths vectorised from `design/logo/toby-logo-original.png`; script in `design/logo/vectorize.py`).

## Adding a lesson (the usual task)

The teacher names the lesson's topic **before class** and expects a full, publishable draft on the site before they teach it: write the content yourself (accurate, beginner-friendly, Traditional Chinese), publish it (`draft: false`), then apply the corrections they send. Whiteboard photos may arrive after class — add them with `<Whiteboard>`. Don't invent a class-specific detail (e.g. what a student asked); ask instead.

1. Create `src/content/lessons/<YYYY-MM-DD>-lesson-<N>/index.mdx`; put photos/audio for that lesson in the same folder.
2. Frontmatter (schema in `src/content.config.ts`):
   ```yaml
   lesson: 15                # unique; URL becomes /lessons/15/
   date: 2026-09-23
   title: …
   highlight: …              # optional, substring of title to marker-underline
   summary: 一句話摘要         # shown in lists and search
   topics: [pentatonic]      # ids of files in src/content/topics/
   draft: false
   ```
3. Body sections (`##` headings build the page TOC): 本堂目標 → one `##` per concept (use `###` inside) → 練習. No 同學的問題 section and no homework — the teacher removed both (the optional `homework` frontmatter field still works if they ever ask for it again).
4. If the lesson introduces a new concept, add `src/content/topics/<id>.md` (`name`, `category`: theory|fret|tech|rhythm|gear, `level` 1–4, `prerequisites`, `description`; optional body = long-form explanation).
5. `npm run build` must pass, then check the page in the browser (desktop + mobile width).

## MDX components (no import needed — registered in `src/components/mdx.ts`)

| Component | Example |
| --- | --- |
| `Fretboard` | `<Fretboard root="A" scale="minor-pentatonic" from={4} to={9} title="…" />` or `notes="6/5 6/8 5/5"` (string/fret). `show="interval"` starts on interval labels; `plain` = note names only (no root colour, no toggle). Note names/intervals are spelled by `src/lib/music.ts`. Horizontal on wide screens, vertical on phones. |
| `Chord` | `<Chord name="Am7" frets="x02010" fingers="x02010" />`; comma-separate when frets ≥ 10. Children → side-by-side text. |
| `Chords` | wraps several `<Chord>` in a row |
| `Tab` | `<Tab seq="6/5 6/8 \| 5/5 5/7" title="…" />` (`\|` bar line, `+` simultaneous) or a `raw` template string |
| `Audio` | `import clip from './x.m4a'` then `<Audio src={clip} caption="…" />` (has 0.5×/0.75× speed) |
| `Whiteboard` | `import board from './board.jpg'` then `<Whiteboard src={board} alt="…" caption="…" />` (tap to zoom). Use jpg/png, not svg. |
| `Callout` | `<Callout title="重點">…</Callout>` |
| `Flow` | `<Flow items={[{ title: '琴弦', desc: '振動' }, …]} />` — step-by-step chain, vertical on phones |
| `ClipWave` | `<ClipWave />` — clean vs overdrive vs distortion waveforms (why gain = clipping) |
| `Exercise` | `<Exercise q="問題">答案（預設收起）</Exercise>` — auto-numbered |

New component → add it to `src/components/mdx.ts` and this table.

## Other notes

- Search is a static index at `/search.json` (`src/pages/search.json.ts`) with substring matching (works for Chinese without segmentation). Component-prop text in `title/caption/q/alt/name` is indexed.
- Dates are UTC midnight; format with helpers in `src/lib/content.ts` (they use UTC getters).
- Real lessons start at lesson 1 (2026-09-23). A lesson is often created as `draft: true` before class (drafts show in `npm run dev` only) and filled in once the teacher sends the whiteboard photos.
- `design/mockups/` holds the original A/B/C style proposals (B was chosen).
