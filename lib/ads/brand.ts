// Everything about the store that appears on the ads. Change it here and every post follows.
// Name and website come from Shopify (shop name and primary domain). The store's own tagline, delivery
// terms and other promises still have to come from the client: an ad must never state an invented claim.

export const BRAND = {
  name: 'Plot And Harvest Co',
  website: 'plotandharvest.co.uk',
  /** What the store is, in a few words. Given to the AI so its scenes suit the shop. */
  about: 'a UK garden and allotment shop',
  hashtags: ['#gardening', '#allotment', '#growyourown', '#gardenideas', '#ukgardening'],
  colors: {
    forest: '#22372A', // the panel under the photo
    cream: '#F4EFE3', // text on the panel, the wordmark pill
    sage: '#A8B79A', // small labels
    terracotta: '#C4693B', // the price badge
    ink: '#1B241D', // text on cream
  },
} as const;
