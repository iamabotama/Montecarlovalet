'use strict';
/* Store / entitlements. The single place that answers "does the player own X?".
   CONFIG.store.enabled = false (today): everything is owned, no paywall, nothing to buy.
   To go live, implement StoreProvider.purchase() against a real backend (e.g. Stripe Checkout + a small
   verify endpoint, or app-store billing) that resolves with the product id once payment is verified,
   then set CONFIG.store.enabled = true. Entitlements are cached in SAVE.entitlements for offline play. */
const StoreProvider = {
  name: 'none',
  purchase(productId) {
    return Promise.reject(new Error(t('store.unavailable')));
  },
  restore() {
    return Promise.resolve([]);
  },
};
// Premium-only features (unlock keys a product grants, e.g. 'crew:extra'). Everyone has them while the store is off.
const premiumFeature = key => !CONFIG.store.enabled || storeGrants().includes(key);
const storeOwns = productId => !CONFIG.store.enabled || SAVE.entitlements.includes(productId);
// All unlock keys granted by owned products ('hotel:*' style keys are handled by storeOwns at the call site).
function storeGrants() {
  if (!CONFIG.store.enabled) return [];
  return SAVE.entitlements.flatMap(id => (PRODUCTS[id] ? PRODUCTS[id].grants : []));
}
function storePurchase(productId) {
  return StoreProvider.purchase(productId).then(id => {
    if (!SAVE.entitlements.includes(id)) SAVE.entitlements.push(id);
    writeSave();
    return id;
  });
}
