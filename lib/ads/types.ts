export type AdStatus = 'draft' | 'generating' | 'ready' | 'approved' | 'failed';

export interface Ad {
  id: string; // BIGINT comes back from pg as a string
  productId: string | null;
  productTitle: string | null;
  status: AdStatus;
  caption: string;
  heroRequestId: string | null;
  heroAttempt: number;
  error: string | null;
  /** The variant prices the image shows; compared with Shopify's current prices right before posting. */
  priceSignature: string | null;
  createdAt: Date;
  /** Storage keys of the slides, in order. Empty until the ad is ready. */
  images: string[];
  /** When it will be posted, once approved (the same moment on every platform). */
  scheduledAt: Date | null;
}
