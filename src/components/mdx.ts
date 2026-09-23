/**
 * 在課程 MDX 裡可以直接使用的元件（不用 import）。
 * 新增元件時記得加到這裡，並在 CLAUDE.md 的元件清單補一行。
 */
import Fretboard from './guitar/Fretboard.astro';
import Chord from './guitar/Chord.astro';
import Chords from './guitar/Chords.astro';
import Tab from './guitar/Tab.astro';
import Audio from './guitar/Audio.astro';
import Whiteboard from './lesson/Whiteboard.astro';
import Exercise from './lesson/Exercise.astro';
import Callout from './lesson/Callout.astro';
import QA from './lesson/QA.astro';

export const mdxComponents = { Fretboard, Chord, Chords, Tab, Audio, Whiteboard, Exercise, Callout, QA };
