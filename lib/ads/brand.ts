// Everything about the store that appears on the ads. Change it here and every post follows.
// Colours: the store's own ad look (black, white and their orange #EC5C12); the logo is assets/brand/logo.png,
// cut from their Facebook Page picture. The store's own tagline,
// delivery terms and other promises still have to come from the client: an ad must never state an invented claim.

export const BRAND = {
  name: 'Gym Flooring UK',
  website: 'gymflooringuk.uk',
  /** What the store is, in a few words. Given to the AI so its scenes suit the shop; never printed on an ad. */
  about: 'a UK online shop for rubber gym flooring: tiles, mats, rolls and underlay for home and commercial gyms',
  hashtags: ['#gymflooring', '#homegym', '#garagegym', '#rubberflooring', '#gymsetup'],
  colors: {
    background: '#0B0C0E', // the dark fade over the photo
    text: '#FFFFFF', // headline and price
    muted: '#9AA0AA', // "From", "per metre", the old price
    accent: '#EC5C12', // the category line, fact tags, the thickness in the headline, the website
    chip: 'rgba(236,92,18,0.18)', // the background of a fact tag
  },
} as const;
