import { advanceGeneration } from '@/lib/ads/generate';
import { listAdsToGenerate, markAdFailed } from '@/lib/ads/repository';

/** Moves every ad that is being generated one step forward (see lib/ads/generate.ts). */
export async function generateAds(): Promise<void> {
  for (const ad of await listAdsToGenerate()) {
    try {
      await advanceGeneration(ad);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Ad ${ad.id} failed to generate: ${message}`);
      await markAdFailed(ad.id, message);
    }
  }
}
