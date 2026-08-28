import type { Post } from '@/domain/types';

export interface CreativeProps {
  post: Post;
  photo: string | null;
  partnerBand: boolean;
}
