import { NetworkCluster, YieldOpportunity } from '@/types/flume';

export const MIN_PRINCIPAL_USD = 1;
export const MAX_PRINCIPAL_USD = 1_000_000;
export const DEFAULT_PRINCIPAL_USD = 5_000;

export function isDevnetMode(): boolean {
  const serverEnv = process.env.DEVNET;
  const publicEnv = process.env.NEXT_PUBLIC_DEVNET;
  const raw = serverEnv ?? publicEnv ?? 'true';
  return raw.toLowerCase() === 'true' || raw === '1';
}

export function getActiveCluster(): NetworkCluster {
  return isDevnetMode() ? 'devnet' : 'mainnet-beta';
}

export const USDC_MINTS = {
  // Official Circle Devnet USDC Mint (https://faucet.circle.com)
  devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  // Official Circle Mainnet USDC Mint
  mainnet: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
} as const;

export function getActiveUsdcMint(): string {
  return isDevnetMode() ? USDC_MINTS.devnet : USDC_MINTS.mainnet;
}

export const PROTOCOL_PROGRAMS = {
  kamino: 'KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD',
  meteoraVault: '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi',
  meteoraDlmm: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  save: 'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo',
  marginfi: 'MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA',
  drift: 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH',
} as const;

export const CURATED_MARKETS: Omit<
  YieldOpportunity,
  'activeAddresses' | 'assetMint' | 'riskFlags' | 'updatedAt'
>[] = [
  {
    id: 'kamino-main-usdc',
    protocol: 'Kamino Lend',
    protocolSlug: 'kamino',
    market: 'Main Market USDC',
    assetSymbol: 'USDC',
    receiptShareSymbol: 'kUSDC',
    baseApy: 0.0845,
    rewardApy: 0.0045,
    headlineApy: 0.089,
    tvlUsd: 68400000,
    utilization: 0.76,
    withdrawLiquidityUsd: 16416000,
    withdrawalRestrictions: ['Instant withdrawal when utilization < 95%'],
    fees: {
      depositBps: 0,
      withdrawalBps: 0,
    },
    strategyType: 'plain_lending',
    oracleProvider: 'Pyth + Switchboard',
    auditStatus: 'Audited by OtterSec & Offside Labs',
    dataSource: 'fallback_snapshot',
    addresses: {
      devnet: {
        programId: PROTOCOL_PROGRAMS.kamino,
        marketOrVaultAddress: 'DxXdAyU3kCjnyggvHmY5nAwg5cRbbmdyX3npfDMjjMek',
        reserveOrPoolAddress: 'Ga4rZytCpq1unD4DbEJ5bkHeUz9g3oh9AAFEi6vSauXp',
        collateralOrShareMint: 'F8CA65p2c2N25u4C2N7T6G9u68y8R35tF4K5d6j6k7m8',
        reserveLiquiditySupply: 'Bgq7trRgVMeq33yt235zM2onQ4bRDBsY5EWiTetF4qw6',
        lendingMarketAuthority: '9DrvZvyWh1HuAoZxvYWMvkf2XCzryCpGgHqrMjyDWpmo',
        underlyingMint: USDC_MINTS.devnet,
        explorerUrl:
          'https://explorer.solana.com/address/KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD?cluster=devnet',
      },
      mainnet: {
        programId: PROTOCOL_PROGRAMS.kamino,
        marketOrVaultAddress: '7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF',
        reserveOrPoolAddress: 'D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59',
        collateralOrShareMint: 'B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D',
        reserveLiquiditySupply: 'Bgq7trRgVMeq33yt235zM2onQ4bRDBsY5EWiTetF4qw6',
        lendingMarketAuthority: '9DrvZvyWh1HuAoZxvYWMvkf2XCzryCpGgHqrMjyDWpmo',
        underlyingMint: USDC_MINTS.mainnet,
        explorerUrl:
          'https://explorer.solana.com/address/KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD',
      },
    },
  },
  {
    id: 'meteora-dynamic-usdc',
    protocol: 'Meteora',
    protocolSlug: 'meteora',
    market: 'Dynamic USDC Yield Vault',
    assetSymbol: 'USDC',
    receiptShareSymbol: 'vUSDC',
    baseApy: 0.081,
    rewardApy: 0.0065,
    headlineApy: 0.0875,
    tvlUsd: 29500000,
    utilization: 0.74,
    withdrawLiquidityUsd: 21800000,
    withdrawalRestrictions: ['Instant unstake from Dynamic Vault reserve'],
    fees: {
      depositBps: 0,
      withdrawalBps: 3,
    },
    strategyType: 'dynamic_vault',
    oracleProvider: 'Pyth',
    auditStatus: 'Audited by Halborn & Oak Security',
    dataSource: 'fallback_snapshot',
    addresses: {
      devnet: {
        programId: PROTOCOL_PROGRAMS.meteoraVault,
        marketOrVaultAddress: '3ESUFCnRNgZ7Mn2mPPUMmXYaKU8jpnV9VtA17M7t2mHQ',
        reserveOrPoolAddress: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
        collateralOrShareMint: 'FZN7QZ8ZUUAxMPfxYEYkH3cXUASzH8EqA6B4tyCL8f1j',
        reserveLiquiditySupply: '5guD4Uz462GT4Y4gEuqyGsHZ59JGxFN4a3rF6KWguMcJ',
        lendingMarketAuthority: 'HWzXGcGHy4tcpYfaRDCyLNzXqBTv3E6BttpCH2vJxArv',
        underlyingMint: USDC_MINTS.devnet,
        explorerUrl: 'https://devnet.meteora.ag/',
      },
      mainnet: {
        programId: PROTOCOL_PROGRAMS.meteoraVault,
        marketOrVaultAddress: '3ESUFCnRNgZ7Mn2mPPUMmXYaKU8jpnV9VtA17M7t2mHQ',
        reserveOrPoolAddress: '5guD4Uz462GT4Y4gEuqyGsHZ59JGxFN4a3rF6KWguMcJ',
        collateralOrShareMint: 'FZN7QZ8ZUUAxMPfxYEYkH3cXUASzH8EqA6B4tyCL8f1j',
        reserveLiquiditySupply: '5guD4Uz462GT4Y4gEuqyGsHZ59JGxFN4a3rF6KWguMcJ',
        lendingMarketAuthority: 'HWzXGcGHy4tcpYfaRDCyLNzXqBTv3E6BttpCH2vJxArv',
        underlyingMint: USDC_MINTS.mainnet,
        explorerUrl: 'https://app.meteora.ag/vaults',
      },
    },
  },
  {
    id: 'save-main-usdc',
    protocol: 'Save (Solend)',
    protocolSlug: 'save',
    market: 'Main Pool USDC',
    assetSymbol: 'USDC',
    receiptShareSymbol: 'cUSDC',
    baseApy: 0.052,
    rewardApy: 0.002,
    headlineApy: 0.054,
    tvlUsd: 18400000,
    utilization: 0.68,
    withdrawLiquidityUsd: 12500000,
    withdrawalRestrictions: ['Instant if utilization < 95%'],
    fees: {
      depositBps: 0,
      withdrawalBps: 0,
    },
    strategyType: 'plain_lending',
    oracleProvider: 'Pyth + Switchboard',
    auditStatus: 'Audited by Kudelski & OtterSec',
    dataSource: 'fallback_snapshot',
    addresses: {
      devnet: {
        programId: 'ALend7Ketfx5bxh6ghsCDXAoDrhvEmsXT3cynB6aPLgx',
        marketOrVaultAddress: 'GvjoVKNjBvQcFaSKUW1gTE7DxhSpjHbE69umVR5nPuQp',
        reserveOrPoolAddress: 'FNNkz4RCQezSSS71rW2tvqZH1LCkTzaiG7Nd1LeA5x5y',
        collateralOrShareMint: 'E2PSSp3db1111111111111111111111111111111111',
        reserveLiquiditySupply: 'Hix1111111111111111111111111111111111111111',
        lendingMarketAuthority: 'GvjoVKNjBvQcFaSKUW1gTE7DxhSpjHbE69umVR5nPuQp',
        underlyingMint: USDC_MINTS.devnet,
      },
      mainnet: {
        programId: PROTOCOL_PROGRAMS.save,
        marketOrVaultAddress: '4UpD2fh7xH3VP9QQaXtsS1YY3bxzWhtfpks7FatyKvdY',
        reserveOrPoolAddress: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
        collateralOrShareMint: '993dVFL2uXWYeoXuEBFXR4BijeXdTv4s6BzsCjJZuwqk',
        reserveLiquiditySupply: '8SheGtsopRUDzdiD6v6BR9a6bqZ9QwywYQY99Fp5meNf',
        lendingMarketAuthority: 'DdZR6zRFiUt4S5mg7AV1uKB2z1f1WzcNYCaTEEWPAuby',
        underlyingMint: USDC_MINTS.mainnet,
      },
    },
  },
  {
    id: 'marginfi-main-usdc',
    protocol: 'Marginfi',
    protocolSlug: 'marginfi',
    market: 'Main Pool USDC',
    assetSymbol: 'USDC',
    receiptShareSymbol: 'mUSDC',
    baseApy: 0.074,
    rewardApy: 0.0,
    headlineApy: 0.074,
    tvlUsd: 31000000,
    utilization: 0.72,
    withdrawLiquidityUsd: 22320000,
    withdrawalRestrictions: ['Instant if utilization < 90%'],
    fees: {
      depositBps: 0,
      withdrawalBps: 0,
    },
    strategyType: 'plain_lending',
    oracleProvider: 'Pyth + Switchboard',
    auditStatus: 'Audited by OtterSec',
    dataSource: 'fallback_snapshot',
    addresses: {
      devnet: {
        programId: PROTOCOL_PROGRAMS.marginfi,
        marketOrVaultAddress: '4qp6Fx6tnZkY5Wropq9wUYgtFxXKwE6viZxFHg3rdAG8',
        reserveOrPoolAddress: '2s37akK2eyBbp8DZgCm7RtsaEz8eJP3Nxd4urLHQv7yB',
        collateralOrShareMint: '2s37akK2eyBbp8DZgCm7RtsaEz8eJP3Nxd4urLHQv7yB',
        reserveLiquiditySupply: '7jaiZR5Sk8hdYN9MxTpczTcwbWpb5WEoxSANuUwveuat',
        lendingMarketAuthority: '3uxNepDbmkDNq6JhRja5Z8QwbTrfmkKP8AKZV5chYDGG',
        underlyingMint: USDC_MINTS.devnet,
      },
      mainnet: {
        programId: PROTOCOL_PROGRAMS.marginfi,
        marketOrVaultAddress: '4qp6Fx6tnZkY5Wropq9wUYgtFxXKwE6viZxFHg3rdAG8',
        reserveOrPoolAddress: '2s37akK2eyBbp8DZgCm7RtsaEz8eJP3Nxd4urLHQv7yB',
        collateralOrShareMint: '2s37akK2eyBbp8DZgCm7RtsaEz8eJP3Nxd4urLHQv7yB',
        reserveLiquiditySupply: '7jaiZR5Sk8hdYN9MxTpczTcwbWpb5WEoxSANuUwveuat',
        lendingMarketAuthority: '3uxNepDbmkDNq6JhRja5Z8QwbTrfmkKP8AKZV5chYDGG',
        underlyingMint: USDC_MINTS.mainnet,
      },
    },
  },
  {
    id: 'kamino-jlp-loop-usdc',
    protocol: 'Kamino Multiply',
    protocolSlug: 'kamino',
    market: 'JLP-USDC Loop Vault',
    assetSymbol: 'USDC',
    receiptShareSymbol: 'kLOOP',
    baseApy: 0.036,
    rewardApy: 0.072,
    headlineApy: 0.108,
    tvlUsd: 4200000,
    utilization: 0.93,
    withdrawLiquidityUsd: 3500,
    withdrawalRestrictions: [
      'Capped when utilization > 90%',
      'De-leveraging swap slippage applies',
    ],
    fees: {
      depositBps: 10,
      withdrawalBps: 15,
    },
    strategyType: 'leveraged_looping',
    oracleProvider: 'Pyth',
    auditStatus: 'Audited by OtterSec',
    dataSource: 'fallback_snapshot',
    addresses: {
      devnet: {
        programId: PROTOCOL_PROGRAMS.kamino,
        marketOrVaultAddress: 'DxXdAyU3kCjnyggvHmY5nAwg5cRbbmdyX3npfDMjjMek',
        reserveOrPoolAddress: 'Ga4rZytCpq1unD4DbEJ5bkHeUz9g3oh9AAFEi6vSauXp',
        collateralOrShareMint: 'B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D',
        reserveLiquiditySupply: 'Bgq7trRgVMeq33yt235zM2onQ4bRDBsY5EWiTetF4qw6',
        lendingMarketAuthority: '9DrvZvyWh1HuAoZxvYWMvkf2XCzryCpGgHqrMjyDWpmo',
        underlyingMint: USDC_MINTS.devnet,
      },
      mainnet: {
        programId: PROTOCOL_PROGRAMS.kamino,
        marketOrVaultAddress: '7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF',
        reserveOrPoolAddress: 'D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59',
        collateralOrShareMint: 'B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D',
        reserveLiquiditySupply: 'Bgq7trRgVMeq33yt235zM2onQ4bRDBsY5EWiTetF4qw6',
        lendingMarketAuthority: '9DrvZvyWh1HuAoZxvYWMvkf2XCzryCpGgHqrMjyDWpmo',
        underlyingMint: USDC_MINTS.mainnet,
      },
    },
  },
  {
    id: 'drift-earn-usdc',
    protocol: 'Drift Protocol',
    protocolSlug: 'drift',
    market: 'Earn Spot Market USDC',
    assetSymbol: 'USDC',
    receiptShareSymbol: 'dUSDC',
    baseApy: 0.079,
    rewardApy: 0.008,
    headlineApy: 0.087,
    tvlUsd: 12100000,
    utilization: 0.84,
    withdrawLiquidityUsd: 9600000,
    withdrawalRestrictions: ['Subject to spot borrow utilization guards'],
    fees: {
      depositBps: 0,
      withdrawalBps: 10,
    },
    strategyType: 'curated_vault',
    oracleProvider: 'Pyth',
    auditStatus: 'Audited by Trail of Bits & Neodyme',
    dataSource: 'fallback_snapshot',
    addresses: {
      devnet: {
        programId: PROTOCOL_PROGRAMS.drift,
        marketOrVaultAddress: 'JCNCMFXo5M5qwUPg2Utu1u6YWp3MbygxqBsBeXXJfrw',
        reserveOrPoolAddress: '6gMq3mRCKf8aP3ttTyYhuijnyTe3534w14MZ1f7T2F7q',
        collateralOrShareMint: '6gMq3mRCKf8aP3ttTyYhuijnyTe3534w14MZ1f7T2F7q',
        reserveLiquiditySupply: 'GXWqPpjQpdz7KZw9p7f5PX2eGxHAhvpNXiviFkAB8zXg',
        lendingMarketAuthority: 'JCNCMFXo5M5qwUPg2Utu1u6YWp3MbygxqBsBeXXJfrw',
        underlyingMint: USDC_MINTS.devnet,
      },
      mainnet: {
        programId: PROTOCOL_PROGRAMS.drift,
        marketOrVaultAddress: 'JCNCMFXo5M5qwUPg2Utu1u6YWp3MbygxqBsBeXXJfrw',
        reserveOrPoolAddress: 'GXWqPpjQpdz7KZw9p7f5PX2eGxHAhvpNXiviFkAB8zXg',
        collateralOrShareMint: 'GXWqPpjQpdz7KZw9p7f5PX2eGxHAhvpNXiviFkAB8zXg',
        reserveLiquiditySupply: 'GXWqPpjQpdz7KZw9p7f5PX2eGxHAhvpNXiviFkAB8zXg',
        lendingMarketAuthority: 'JCNCMFXo5M5qwUPg2Utu1u6YWp3MbygxqBsBeXXJfrw',
        underlyingMint: USDC_MINTS.mainnet,
      },
    },
  },
];