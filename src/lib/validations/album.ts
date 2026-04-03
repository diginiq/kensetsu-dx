import { z } from 'zod';
import { AlbumLayout } from '../album/types';

export const albumLayoutSchema = z.enum(['A4_PORTRAIT_2', 'A4_PORTRAIT_4', 'A4_LANDSCAPE_1']);

export const captionDataSchema = z.object({
  photoNumber: z.string().min(1, '写真番号は必須です'),
  workType: z.string().min(1, '工種は必須です'),
  subType: z.string().optional(),
  date: z.string().min(1, '撮影日は必須です'),
  location: z.string().min(1, '撮影箇所は必須です'),
  memo: z.string().optional().default(''),
});

export const albumPhotoSchema = z.object({
  photoId: z.string().uuid('写真IDが不正です'),
  url: z.string().default(''),
  thumbUrl: z.string().default(''),
  caption: captionDataSchema,
});

export const generateAlbumSchema = z.object({
  layout: albumLayoutSchema,
  photos: z.array(albumPhotoSchema).min(1, '少なくとも1枚の写真を選択してください'),
});

export const exportXmlSchema = z.object({
  photos: z.array(albumPhotoSchema).min(1, '少なくとも1枚の写真を選択してください'),
});
