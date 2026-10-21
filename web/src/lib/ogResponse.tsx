import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { ShareCardOG } from './og';
import { isEmpty, validate, type WrappedData } from '@/lib/wrapped';
import { limited, limits } from './rateLimit';

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


// Rendered cards by the recap they were drawn from, least recently used first (~50 KB each).
const CACHE_MAX = 200;
const cache = new Map<string, ArrayBuffer>();

/**
 * 1200x630 PNG for a recap, or the error response that must be sent instead. A recap that hasn't
 * changed is served from memory; only a new render counts against the client's limit.
 */
export async function ogResponse(d: WrappedData | null, req: Request): Promise<Response> {
  if (isEmpty(d)) return new Response('no recap', { status: 404 });
  // A bad file must never ship as an image.
  const errors = validate(d!);
  if (errors.length) return new Response(`invalid data: ${errors.join('; ')}`, { status: 422 });

  const key = createHash('sha1').update(JSON.stringify(d)).digest('hex');
  let png = cache.get(key);
  if (png) {
    cache.delete(key); // move to the most recently used end
  } else {
    const tooMany = limited(req, limits.og);
    if (tooMany) return tooMany;
    png = await new ImageResponse(<ShareCardOG d={d!} />, { width: 1200, height: 630, fonts: await loadFonts() }).arrayBuffer();
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  }
  cache.set(key, png);
  // The card follows the live recap; cache briefly.
  return new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60, s-maxage=60' } });
}
