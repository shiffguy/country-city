import mobileAds, {
  InterstitialAd,
  AdEventType,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';
import { useGameStore } from '../store/gameStore';

// ─── Ad Unit IDs ─────────────────────────────────────────────────
// Replace these with your production ad unit IDs before publishing:
// Banner (production):     'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY'
// Interstitial (production): 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY'

export const AD_UNIT_IDS = {
  BANNER: __DEV__
    ? TestIds.BANNER // 'ca-app-pub-3940256099942544/6300978111'
    : 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY', // TODO: Replace with production banner ID
  INTERSTITIAL: __DEV__
    ? TestIds.INTERSTITIAL // 'ca-app-pub-3940256099942544/1033173712'
    : 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY', // TODO: Replace with production interstitial ID
};

// ─── Interstitial Ad Singleton ───────────────────────────────────
let interstitialAd: InterstitialAd | null = null;
let isInterstitialLoaded = false;

/**
 * Initialize Google Mobile Ads SDK.
 * Call this once on app startup.
 */
export async function initializeAds(): Promise<void> {
  try {
    await mobileAds().initialize();
    loadInterstitial();
  } catch (error) {
    console.warn('[Ads] Failed to initialize Mobile Ads SDK:', error);
  }
}

/**
 * Load an interstitial ad so it's ready to show.
 */
export function loadInterstitial(): void {
  if (isAdFree()) return;

  try {
    interstitialAd = InterstitialAd.createForAdRequest(AD_UNIT_IDS.INTERSTITIAL);

    interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      isInterstitialLoaded = true;
    });

    interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      isInterstitialLoaded = false;
      // Pre-load the next interstitial
      loadInterstitial();
    });

    interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.warn('[Ads] Interstitial failed to load:', error);
      isInterstitialLoaded = false;
    });

    interstitialAd.load();
  } catch (error) {
    console.warn('[Ads] Error creating interstitial:', error);
  }
}

/**
 * Show the loaded interstitial ad.
 * Returns true if the ad was shown, false otherwise.
 */
export async function showInterstitial(): Promise<boolean> {
  if (isAdFree()) return false;

  if (interstitialAd && isInterstitialLoaded) {
    try {
      await interstitialAd.show();
      return true;
    } catch (error) {
      console.warn('[Ads] Failed to show interstitial:', error);
      isInterstitialLoaded = false;
      loadInterstitial();
      return false;
    }
  }

  // Ad wasn't ready — try loading for next time
  loadInterstitial();
  return false;
}

/**
 * Check whether the user has purchased ad removal.
 */
export function isAdFree(): boolean {
  return useGameStore.getState().isAdFree;
}

export { BannerAdSize };
