// Turns one post image (JSX) into a JPEG: Satori lays it out as SVG, sharp draws the SVG and saves it as JPEG.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';
import satori from 'satori';
import sharp from 'sharp';
import { BODY, DISPLAY, SLIDE_HEIGHT, SLIDE_WIDTH } from './templates/shared';

const FONT_DIR = path.join(process.cwd(), 'assets', 'fonts');

// Read once and reused for every image. Satori needs the font files themselves; it can't use system fonts.
let fonts: Parameters<typeof satori>[1]['fonts'] | null = null;
function loadFonts() {
  fonts ??= [
    { name: DISPLAY, weight: 800, style: 'normal', data: readFileSync(path.join(FONT_DIR, 'BarlowCondensed-ExtraBold.ttf')) },
    { name: DISPLAY, weight: 900, style: 'normal', data: readFileSync(path.join(FONT_DIR, 'BarlowCondensed-Black.ttf')) },
    { name: BODY, weight: 500, style: 'normal', data: readFileSync(path.join(FONT_DIR, 'Barlow-Medium.ttf')) },
    { name: BODY, weight: 600, style: 'normal', data: readFileSync(path.join(FONT_DIR, 'Barlow-SemiBold.ttf')) },
  ];
  return fonts;
}

/** One image → JPEG bytes (1080×1350). JPEG because Instagram's API accepts no other format. */
export async function renderSlide(slide: ReactNode): Promise<Buffer> {
  const svg = await satori(slide, { width: SLIDE_WIDTH, height: SLIDE_HEIGHT, fonts: loadFonts() });
  return sharp(Buffer.from(svg)).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}
