import { PortfolioAsset } from '../types/crypto';

export interface PortfolioSummary {
  totalValueUsd: number;
  totalCostBasisUsd: number;
  totalProfitLossUsd: number;
  totalProfitLossPercentage: number;
}

/**
 * Calculates total portfolio USD value strictly for assets with verified market prices.
 * Internal virtual NXR has no market price and is never assigned a fabricated valuation.
 */
export function calculateTotalPortfolioValue(assets: PortfolioAsset[]): number {
  return assets.reduce((sum, a) => {
    if (a.isVirtualOnly || a.currentPrice === null || a.currentPrice === undefined) {
      return sum;
    }
    return sum + a.balance * a.currentPrice;
  }, 0);
}

export function calculateAssetProfitLoss(asset: PortfolioAsset): {
  currentValueUsd: number | null;
  costBasisUsd: number | null;
  profitLossUsd: number | null;
  profitLossPercentage: number | null;
} {
  if (asset.isVirtualOnly || asset.currentPrice === null || asset.currentPrice === undefined) {
    return {
      currentValueUsd: null,
      costBasisUsd: null,
      profitLossUsd: null,
      profitLossPercentage: null,
    };
  }

  const currentValueUsd = asset.balance * asset.currentPrice;
  const averageBuy = asset.averageBuyPrice ?? asset.currentPrice;
  const costBasisUsd = asset.balance * averageBuy;
  const profitLossUsd = currentValueUsd - costBasisUsd;
  const profitLossPercentage = costBasisUsd > 0 ? (profitLossUsd / costBasisUsd) * 100 : 0;

  return {
    currentValueUsd: Number(currentValueUsd.toFixed(2)),
    costBasisUsd: Number(costBasisUsd.toFixed(2)),
    profitLossUsd: Number(profitLossUsd.toFixed(2)),
    profitLossPercentage: Number(profitLossPercentage.toFixed(2)),
  };
}

export function calculatePortfolioSummary(assets: PortfolioAsset[]): PortfolioSummary {
  let totalValue = 0;
  let totalCost = 0;

  for (const asset of assets) {
    if (asset.isVirtualOnly || asset.currentPrice === null || asset.currentPrice === undefined) {
      continue;
    }
    totalValue += asset.balance * asset.currentPrice;
    const averageBuy = asset.averageBuyPrice ?? asset.currentPrice;
    totalCost += asset.balance * averageBuy;
  }

  const pnl = totalValue - totalCost;
  const pnlPercentage = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

  return {
    totalValueUsd: Number(totalValue.toFixed(2)),
    totalCostBasisUsd: Number(totalCost.toFixed(2)),
    totalProfitLossUsd: Number(pnl.toFixed(2)),
    totalProfitLossPercentage: Number(pnlPercentage.toFixed(2)),
  };
}

export function calculateAllocations(
  assets: PortfolioAsset[]
): Array<PortfolioAsset & { allocationPercentage: number }> {
  const total = calculateTotalPortfolioValue(assets);
  return assets.map(asset => {
    if (asset.isVirtualOnly || asset.currentPrice === null || asset.currentPrice === undefined || total <= 0) {
      return {
        ...asset,
        allocationPercentage: 0,
      };
    }
    const value = asset.balance * asset.currentPrice;
    const allocationPercentage = Number(((value / total) * 100).toFixed(1));
    return {
      ...asset,
      allocationPercentage,
    };
  });
}

/**
 * Validates virtual NXR transfer inputs:
 * - Checks recipient address format
 * - Checks amount is positive and non-zero
 * - Checks sufficient available virtual balance
 * - Prevents self-transfers
 */
export function validateTransactionInputs(
  availableBalance: number,
  sendAmount: number,
  recipientAddress: string,
  senderAddress?: string,
  estimatedFee = 0.0
): { valid: boolean; error?: string } {
  const trimmedAddress = (recipientAddress || '').trim();
  if (!trimmedAddress) {
    return { valid: false, error: 'Recipient account address or username is required.' };
  }

  if (trimmedAddress.length < 5) {
    return { valid: false, error: 'Recipient identifier must be at least 5 characters.' };
  }

  if (senderAddress && trimmedAddress.toLowerCase() === senderAddress.toLowerCase()) {
    return { valid: false, error: 'You cannot send virtual coins to your own account address.' };
  }

  if (isNaN(sendAmount) || sendAmount <= 0) {
    return { valid: false, error: 'Transfer amount must be greater than 0.00000 NXR.' };
  }

  const totalRequired = sendAmount + estimatedFee;
  if (totalRequired > availableBalance) {
    return {
      valid: false,
      error: `Insufficient virtual balance. Available: ${availableBalance.toFixed(5)} NXR, Required: ${totalRequired.toFixed(5)} NXR.`,
    };
  }

  return { valid: true };
}

export function formatUsd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: amount < 1 && amount > 0 ? 4 : 2,
  }).format(amount);
}

export function formatCrypto(amount: number, symbol: string, decimals = 5): string {
  return `${amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} ${symbol}`;
}
