'use strict';
/* Paid products (Stage 2 "pay for play"). Data only; career/store.js decides ownership.
   While CONFIG.store.enabled is false every product counts as owned, so nothing is paywalled.
   grants: 'hotel:<id>' entries are what a hotel's `product` field points at. */
const PRODUCTS = {
  hotel_pack_1: { name: tl('product.hotelPack1'), price: '$2.99', grants: ['hotel:dubai'] },
  // Premium: the last hotel, the 3rd and 4th valet, premium stall P2 (career/store.js premiumFeature)
  premium: {
    name: tl('product.premium'),
    price: '$4.99',
    grants: ['hotel:swiss_chalet', 'crew:extra', 'stall:premium2'],
  },
  supporter: { name: tl('product.supporter'), price: '$4.99', grants: ['uniform:gold', 'hotel:*'] },
};
