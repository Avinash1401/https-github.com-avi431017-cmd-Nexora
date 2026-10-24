import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTotalPortfolioValue,
  calculateAssetProfitLoss,
  calculatePortfolioSummary,
  calculateAllocations,
  validateTransactionInputs,
} from './portfolioCalculations.ts';
import { PortfolioAsset } from '../types/crypto.ts';

const SAMPLE_ASSETS: PortfolioAsset[] = [
  {
    coinId: 'nexora',
    symbol: 'NXR',
    name: 'NEXORA COIN',
    balance: 10.0,
    currentPrice: null, // Virtual only, no fake price
    isVirtualOnly: true,
  },
  {
    coinId: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    balance: 0.1,
    averageBuyPrice: 60000,
    currentPrice: 70000,
  },
  {
    coinId: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    balance: 1.0,
    averageBuyPrice: 3000,
    currentPrice: 3500,
  },
];

test('Portfolio Calculations - calculateTotalPortfolioValue ignores virtual coins with null prices', () => {
  // 0.1 * 70000 (BTC) + 1.0 * 3500 (ETH) = 7000 + 3500 = 10500. NXR is skipped.
  const total = calculateTotalPortfolioValue(SAMPLE_ASSETS);
  assert.equal(total, 10500);
});

test('Portfolio Calculations - calculateAssetProfitLoss returns null for virtual-only coins', () => {
  const nxrResult = calculateAssetProfitLoss(SAMPLE_ASSETS[0]);
  assert.equal(nxrResult.currentValueUsd, null);
  assert.equal(nxrResult.profitLossUsd, null);

  const btcResult = calculateAssetProfitLoss(SAMPLE_ASSETS[1]);
  assert.equal(btcResult.currentValueUsd, 7000);
  assert.equal(btcResult.costBasisUsd, 6000);
  assert.equal(btcResult.profitLossUsd, 1000);
});

test('Portfolio Calculations - calculatePortfolioSummary aggregates overall stats', () => {
  const summary = calculatePortfolioSummary(SAMPLE_ASSETS);
  assert.equal(summary.totalValueUsd, 10500);
  assert.equal(summary.totalCostBasisUsd, 9000); // 6000 + 3000
  assert.equal(summary.totalProfitLossUsd, 1500);
});

test('Portfolio Calculations - calculateAllocations sets virtual coins to 0% allocation', () => {
  const allocations = calculateAllocations(SAMPLE_ASSETS);
  const nxr = allocations.find(a => a.symbol === 'NXR');
  assert.equal(nxr?.allocationPercentage, 0);

  const btc = allocations.find(a => a.symbol === 'BTC');
  // 7000 / 10500 = 66.7%
  assert.equal(btc?.allocationPercentage, 66.7);
});

test('Portfolio Calculations - validateTransactionInputs validates balances, prevents self transfers', () => {
  // Insufficient balance
  const res1 = validateTransactionInputs(0.00010, 0.00050, 'NXR-RECIPIENT-ADDR');
  assert.equal(res1.valid, false);
  assert.match(res1.error || '', /Insufficient/i);

  // Self transfer
  const res2 = validateTransactionInputs(1.0, 0.5, 'NXR-MY-ADDR', 'NXR-MY-ADDR');
  assert.equal(res2.valid, false);
  assert.match(res2.error || '', /own account/i);

  // Valid transfer
  const res3 = validateTransactionInputs(1.0, 0.00024, 'NXR-VALID-RECIPIENT-99');
  assert.equal(res3.valid, true);

  // Zero or negative amount
  const res4 = validateTransactionInputs(1.0, 0, 'NXR-VALID-RECIPIENT-99');
  assert.equal(res4.valid, false);
});
