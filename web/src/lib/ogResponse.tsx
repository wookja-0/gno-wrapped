import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { ShareCardOG } from './og';
import { isEmpty, validate, type WrappedData } from '@/lib/wrapped';

const FONT_DIR = path.join(process.cwd(), 'node_modules', '@fontsource');
const FONTS = [
  { name: 'Archivo', file: 'archivo/files/archivo-latin-500-normal.woff', weight: 500 },
  { name: 'Archivo', file: 'archivo/files/archivo-latin-900-normal.woff', weight: 900 },
  { name: 'JetBrains Mono', file: 'jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff', weight: 500 },
  { name: 'Silkscreen', file: 'silkscreen/files/silkscreen-latin-400-normal.woff', weight: 400 },
] as const;

let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 500 | 900; style: 'normal' }[]> | undefined;
const loadFonts = () =>
  (fonts ??= Promise.all(FONTS.map(async (f) => ({ name: f.name, data: await readFile(path.join(FONT_DIR, f.file)), weight: f.weight, style: 'normal' as const }))));


/** 1200x630 PNG for a recap, or the error response that must be sent instead. */
export async function ogResponse(d: WrappedData | null): Promise<Response> {
  if (isEmpty(d)) return new Response('no recap', { status: 404 });
  // A bad file must never ship as an image.
  const errors = validate(d!);
  if (errors.length) return new Response(`invalid data: ${errors.join('; ')}`, { status: 422 });
  return new ImageResponse(<ShareCardOG d={d!} />, {
    width: 1200,
    height: 630,
    fonts: await loadFonts(),
    // The card follows the live recap; cache briefly.
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
  });
}
