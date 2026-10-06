'use strict';
/* Paid products (Stage 2 "pay for play"). Data only; career/store.js decides ownership.
   While CONFIG.store.enabled is false every product counts as owned, so nothing is paywalled.
   grants: 'hotel:<id>' entries are what a hotel's `product` field points at. */
const PRODUCTS = {
  hotel_pack_1: { name: 'HOTEL PACK: ALPS + DUBAI', price: '$2.99', grants: ['hotel:swiss_chalet', 'hotel:dubai'] },
  supporter: { name: 'SUPPORTER EDITION', price: '$4.99', grants: ['uniform:gold', 'hotel:*'] },
};
