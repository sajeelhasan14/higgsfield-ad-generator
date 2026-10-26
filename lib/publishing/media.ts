// The public link Meta downloads a post image from.
import { mediaSignature } from '@/lib/auth';
import { publicBaseUrl } from '@/lib/config';

export function publicMediaUrl(key: string): string {
  return `${publicBaseUrl()}/public-media/${mediaSignature(key)}/${key.split('/').map(encodeURIComponent).join('/')}`;
}
