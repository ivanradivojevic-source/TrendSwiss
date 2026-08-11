import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { withBasePath } from '@/src/lib/basePath';

const GALLERY_DIR = path.join(process.cwd(), 'public', 'home-gallery');
const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;

export type HomeGalleryImage = {
  src: string;
  width: number;
  height: number;
};

/** Slike iz `public/home-gallery` (kopija iz SlikePrvaStrana). */
export async function getHomeGalleryImages(): Promise<HomeGalleryImage[]> {
  if (!fs.existsSync(GALLERY_DIR)) return [];

  const names = fs
    .readdirSync(GALLERY_DIR)
    .filter((name) => IMAGE_EXT.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return Promise.all(
    names.map(async (name) => {
      const filePath = path.join(GALLERY_DIR, name);
      const meta = await sharp(filePath).metadata();
      const width = meta.width && meta.width > 0 ? meta.width : 2000;
      const height = meta.height && meta.height > 0 ? meta.height : 3000;
      return {
        src: withBasePath(`/home-gallery/${encodeURIComponent(name)}`),
        width,
        height,
      };
    })
  );
}
