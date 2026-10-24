import type { PLATFORMS } from '@/lib/config';

export type Platform = (typeof PLATFORMS)[number];
export type PostStatus = 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';

export interface Post {
  id: string; // BIGINT comes back from pg as a string
  adId: string;
  platform: Platform;
  kind: 'organic';
  status: PostStatus;
  scheduledAt: Date;
  runAt: Date;
  attempts: number;
  lastError: string | null;
  externalId: string | null;
  publishedAt: Date | null;
}
