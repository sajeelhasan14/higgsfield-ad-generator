// Where each of an ad's images goes, in words for the preview. This must match sendAd in lib/publishing/index.ts:
// image 1 goes to Facebook and paid ads; images 2+ are the Instagram carousel, which needs at least 2 slides.

export const PAID_AD_LABEL = 'Paid ad';

export function imageDestinations(imageCount: number): string[] {
  const hasCarousel = imageCount - 1 >= 2;
  return Array.from({ length: imageCount }, (_, i) => {
    if (i === 0) return hasCarousel ? `Facebook post · ${PAID_AD_LABEL}` : `Facebook post · Instagram post · ${PAID_AD_LABEL}`;
    return hasCarousel ? `Instagram carousel · slide ${i} of ${imageCount - 1}` : 'Not posted';
  });
}
