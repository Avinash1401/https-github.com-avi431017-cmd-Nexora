import { CryptoCoin } from '../types/crypto';
import { INITIAL_COINS } from '../data/mockCrypto';

export interface MarketFetchResult {
  coins: CryptoCoin[];
  isLive: boolean;
  isCached?: boolean;
  lastUpdated: number;
  source: string;
  error?: string;
  rateLimited?: boolean;
}

const GECKO_ID_TO_SYMBOL: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  solana: 'SOL',
  ripple: 'XRP',
  cardano: 'ADA',
  'avalanche-2': 'AVAX',
  dogecoin: 'DOGE',
  chainlink: 'LINK',
};

/**
 * Fetches real-time cryptocurrency market data via server-side cached endpoint (/api/market)
 * or fallback to direct CoinGecko public API with transparent error handling.
 * NXR is strictly protected from fabricated market prices.
 */
export async function fetchMarketData(): Promise<MarketFetchResult> {
  // 1. Try our server-side cached proxy first (avoids CORS & handles rate-limits)
  try {
    const res = await fetch('/api/market');
    if (res.ok) {
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        const liveMap = new Map<string, any>();
        result.data.forEach((c: any) => liveMap.set(c.id, c));

        const updatedCoins: CryptoCoin[] = INITIAL_COINS.map(coin => {
          if (coin.isNexora) {
            return {
              ...coin,
              priceUsd: null,
              change24h: null,
              marketCapUsd: null,
              volume24hUsd: null,
              statusNotice: 'Internal Virtual Coin • No established market price',
            };
          }

          const liveData = liveMap.get(coin.id);
          if (liveData) {
            return {
              ...coin,
              priceUsd: liveData.priceUsd,
              change24h: liveData.change24h,
              marketCapUsd: liveData.marketCapUsd,
              volume24hUsd: liveData.volume24hUsd,
              high24h: liveData.high24h,
              low24h: liveData.low24h,
              circulatingSupply: liveData.circulatingSupply,
              sparkline: liveData.sparkline || [],
              lastUpdated: result.lastUpdated,
            };
          }

          return coin;
        });

        return {
          coins: updatedCoins,
          isLive: Boolean(result.isLive),
          isCached: Boolean(result.isCached),
          lastUpdated: result.lastUpdated || Date.now(),
          source: result.source || 'CoinGecko Live API',
          rateLimited: Boolean(result.rateLimited),
        };
      }
    }
  } catch (err) {
    // Fall through to direct public query if server proxy unreachable
  }

  // 2. Direct CoinGecko Public Query
  try {
    const ids = Object.keys(GECKO_ID_TO_SYMBOL).join(',');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=true&price_change_percentage=24h`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.status === 429) {
      return {
        coins: INITIAL_COINS,
        isLive: false,
        lastUpdated: Date.now(),
        source: 'CoinGecko (Rate-limited, awaiting cooling period)',
        rateLimited: true,
        error: 'CoinGecko public rate limit reached. Retrying automatically in 30s.',
      };
    }

    if (!res.ok) {
      throw new Error(`CoinGecko HTTP status ${res.status}`);
    }

    const data = await res.json();
    const liveMap = new Map<string, any>();
    data.forEach((c: any) => liveMap.set(c.id, c));

    const updatedCoins: CryptoCoin[] = INITIAL_COINS.map(coin => {
      if (coin.isNexora) {
        return {
          ...coin,
          priceUsd: null,
          change24h: null,
          statusNotice: 'Internal Virtual Coin • No established market price',
        };
      }

      const live = liveMap.get(coin.id);
      if (live) {
        return {
          ...coin,
          priceUsd: live.current_price,
          change24h: Number((live.price_change_percentage_24h || 0).toFixed(2)),
          marketCapUsd: live.market_cap,
          volume24hUsd: live.total_volume,
          high24h: live.high_24h,
          low24h: live.low_24h,
          sparkline: live.sparkline_in_7d?.price?.slice(-12) || [],
          lastUpdated: Date.now(),
        };
      }

      return coin;
    });

    return {
      coins: updatedCoins,
      isLive: true,
      lastUpdated: Date.now(),
      source: 'CoinGecko Public API',
    };
  } catch (err: any) {
    return {
      coins: INITIAL_COINS,
      isLive: false,
      lastUpdated: Date.now(),
      source: 'External Market Feed Unreachable',
      error: err?.message || 'Failed to connect to CoinGecko. No fictional prices will be shown.',
    };
  }
}
