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
  /**
   * Storage keys, in order. Empty until the ad is ready. Image 1 is the single post (Facebook, and Instagram
   * when there is no carousel); images 2+ are the Instagram carousel slides, when the product has them.
   */
  images: string[];
  /** When it will be posted, once approved (the same moment on every platform). */
  scheduledAt: Date | null;
}
