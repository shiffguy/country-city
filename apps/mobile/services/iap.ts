import {
  initConnection,
  endConnection,
  getProducts,
  requestPurchase,
  getAvailablePurchases,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  type ProductPurchase,
  type PurchaseError,
  type Subscription,
} from 'react-native-iap';
import { Platform } from 'react-native';
import { useGameStore } from '../store/gameStore';

// ─── Product Configuration ───────────────────────────────────────
export const REMOVE_ADS_PRODUCT_ID = 'remove_ads_forever';

const productIds = Platform.select({
  ios: [REMOVE_ADS_PRODUCT_ID],
  android: [REMOVE_ADS_PRODUCT_ID],
  default: [REMOVE_ADS_PRODUCT_ID],
});

// ─── Listener references for cleanup ────────────────────────────
let purchaseUpdateSubscription: Subscription | null = null;
let purchaseErrorSubscription: Subscription | null = null;

/**
 * Initialize the IAP connection and set up purchase listeners.
 * Call this once on app startup.
 */
export async function initIAP(): Promise<void> {
  try {
    await initConnection();

    // Listen for successful purchases
    purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: ProductPurchase) => {
        if (purchase.productId === REMOVE_ADS_PRODUCT_ID) {
          // Grant ad-free status
          useGameStore.getState().setAdFree(true);

          // Acknowledge/finish the transaction
          try {
            await finishTransaction({ purchase, isConsumable: false });
          } catch (err) {
            console.warn('[IAP] Failed to finish transaction:', err);
          }
        }
      }
    );

    // Listen for purchase errors
    purchaseErrorSubscription = purchaseErrorListener(
      (error: PurchaseError) => {
        console.warn('[IAP] Purchase error:', error.message);
      }
    );
  } catch (error) {
    console.warn('[IAP] Failed to initialize IAP connection:', error);
  }
}

/**
 * Fetch available products from the store.
 */
export async function fetchProducts() {
  try {
    const products = await getProducts({ skus: productIds! });
    return products;
  } catch (error) {
    console.warn('[IAP] Failed to fetch products:', error);
    return [];
  }
}

/**
 * Initiate the purchase flow for "Remove Ads".
 */
export async function purchaseRemoveAds(): Promise<void> {
  try {
    await requestPurchase({ sku: REMOVE_ADS_PRODUCT_ID });
    // The purchaseUpdatedListener will handle the result
  } catch (error) {
    console.warn('[IAP] Purchase request failed:', error);
    throw error;
  }
}

/**
 * Restore previous purchases (e.g. after reinstall or new device).
 * If the user previously purchased ad removal, re-grant it.
 */
export async function restorePurchases(): Promise<boolean> {
  try {
    const purchases = await getAvailablePurchases();
    const hasRemoveAds = purchases.some(
      (p) => p.productId === REMOVE_ADS_PRODUCT_ID
    );

    if (hasRemoveAds) {
      useGameStore.getState().setAdFree(true);
      return true;
    }

    return false;
  } catch (error) {
    console.warn('[IAP] Failed to restore purchases:', error);
    return false;
  }
}

/**
 * Clean up IAP listeners and connection.
 * Call this on app unmount / cleanup.
 */
export function cleanupIAP(): void {
  if (purchaseUpdateSubscription) {
    purchaseUpdateSubscription.remove();
    purchaseUpdateSubscription = null;
  }
  if (purchaseErrorSubscription) {
    purchaseErrorSubscription.remove();
    purchaseErrorSubscription = null;
  }
  endConnection();
}
