import type { Post } from '@/domain/types';

export interface CreativeProps {
  post: Post;
  photo: string | null;
  /** Wymiary `photo` po przetworzeniu (proporcja do kadru); null = brak zdjęcia albo nieznane. */
  photoSize?: { w: number; h: number } | null;
  partnerBand: boolean;
}
