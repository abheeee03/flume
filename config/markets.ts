import { NetworkCluster, YieldOpportunity } from '@/types/flume';

/**
 * Reads DEVNET=true or NEXT_PUBLIC_DEVNET=true from environment variables.
 */
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
  // Official Circle Devnet USDC + Flume Devnet Mint fallback
  devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  mainnet: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
} as const;

export const PROTOCOL_PROGRAMS = {
  kamino: {
    // Kamino Lend V2 Program ID (same on Mainnet & Devnet per Kamino docs)
    devnet: 'KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD',
    mainnet: 'KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD',
  },
  meteoraVault: {
    // Meteora Dynamic Yield Vault Program ID (https://devnet.meteora.ag/)
    devnet: '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi',
    mainnet: '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi',
  },
  meteoraDlmm: {
    // Meteora DLMM Program ID (https://devnet.meteora.ag/)
    devnet: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
    mainnet: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  },
  save: {
    devnet: 'ALend7Ketfx5bxh6ghsCDXAoDrhvEmsXT3cynB6aPLgx',
    mainnet: 'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo',
  },
  marginfi: {
    devnet: 'MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA',
    mainnet: 'MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA',
  },
  drift: {
    devnet: 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH',
    mainnet: 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH',
  },
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
    receiptShareSymbol: 'flKMNO',
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
        programId: PROTOCOL_PROGRAMS.kamino.devnet,
        marketOrVaultAddress: 'DxXdAyU3kCjnyggvHmY5nAwg5cRbbmdyX3npfDMjjMek',
        reserveOrPoolAddress: 'Ga4rZytCpq1unD4DbEJ5bkHeUz9g3oh9AAFEi6vSauXp',
        collateralOrShareMint: 'flKMNO', // Resolved deterministically on Devnet
        underlyingMint: USDC_MINTS.devnet,
        explorerUrl:
          'https://explorer.solana.com/address/KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD?cluster=devnet',
      },
      mainnet: {
        programId: PROTOCOL_PROGRAMS.kamino.mainnet,
        marketOrVaultAddress: '7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF',
        reserveOrPoolAddress: 'D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59',
        collateralOrShareMint: 'B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D',
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
    receiptShareSymbol: 'flMET',
    baseApy: 0.081,
    rewardApy: 0.0065,
    headlineApy: 0.0875,
    tvlUsd: 29500000,
    utilization: 0.74,
    withdrawLiquidityUsd: 21800000,
    withdrawalRestrictions: ['Instant unstake from Dynamic Vault reserve'],
    fees: {
      depositBps: 0,
      withdrawalBps: 3, // 0.03% dynamic rebalance guard
    },
    strategyType: 'dynamic_vault',
    oracleProvider: 'Pyth',
    auditStatus: 'Audited by Halborn & Oak Security',
    dataSource: 'fallback_snapshot',
    addresses: {
      devnet: {
        programId: PROTOCOL_PROGRAMS.meteoraVault.devnet,
        marketOrVaultAddress: '3ESUFCnRNgZ7Mn2mPPUMmXYaKU8jpnV9VtA17M7t2mHQ',
        reserveOrPoolAddress: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
        collateralOrShareMint: 'flMET',
        underlyingMint: USDC_MINTS.devnet,
        explorerUrl: 'https://devnet.meteora.ag/',
      },
      mainnet: {
        programId: PROTOCOL_PROGRAMS.meteoraVault.mainnet,
        marketOrVaultAddress: '3ESUFCnRNgZ7Mn2mPPUMmXYaKU8jpnV9VtA17M7t2mHQ',
        reserveOrPoolAddress: '5guD4Uz462GT4Y4gEuqyGsHZ59JGxFN4a3rF6KWguMcJ',
        collateralOrShareMint: 'FZN7QZ8ZUUAxMPfxYEYkH3cXUASzH8EqA6B4tyCL8f1j',
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
    receiptShareSymbol: 'flSAVE',
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
        programId: PROTOCOL_PROGRAMS.save.devnet,
        marketOrVaultAddress: 'GvjoVKNjBvQcFaSKUW1gTE7DxhSpjHbE69umVR5nPuQp',
        reserveOrPoolAddress: 'FNNkz4RCQezSSS71rW2tvqZH1LCkTzaiG7Nd1LeA5x5y',
        collateralOrShareMint: 'flSAVE',
        underlyingMint: USDC_MINTS.devnet,
      },
      mainnet: {
        programId: PROTOCOL_PROGRAMS.save.mainnet,
        marketOrVaultAddress: '4UpD2fh7xH3VP9QQaXtsS1YY3bxzWhtfpks7FatyKvdY',
        reserveOrPoolAddress: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
        collateralOrShareMint: '993dVFL2uXWYeoXuEBFXR4BijeXdTv4s6BzsCjJZuwqk',
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
    receiptShareSymbol: 'flMRGN',
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
        programId: PROTOCOL_PROGRAMS.marginfi.devnet,
        marketOrVaultAddress: '4qp6Fx6tnZkY5Wropq9wUYgtFxXKwE6viZxFHg3rdAG8',
        reserveOrPoolAddress: '2s37akK2eyBbp8DZgCm7RtsaEz8eJP3Nxd4urLHQv7yB',
        collateralOrShareMint: 'flMRGN',
        underlyingMint: USDC_MINTS.devnet,
      },
      mainnet: {
        programId: PROTOCOL_PROGRAMS.marginfi.mainnet,
        marketOrVaultAddress: '4qp6Fx6tnZkY5Wropq9wUYgtFxXKwE6viZxFHg3rdAG8',
        reserveOrPoolAddress: '2s37akK2eyBbp8DZgCm7RtsaEz8eJP3Nxd4urLHQv7yB',
        collateralOrShareMint: '2s37akK2eyBbp8DZgCm7RtsaEz8eJP3Nxd4urLHQv7yB',
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
    receiptShareSymbol: 'flLOOP',
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
        programId: PROTOCOL_PROGRAMS.kamino.devnet,
        marketOrVaultAddress: 'DxXdAyU3kCjnyggvHmY5nAwg5cRbbmdyX3npfDMjjMek',
        reserveOrPoolAddress: 'Ga4rZytCpq1unD4DbEJ5bkHeUz9g3oh9AAFEi6vSauXp',
        collateralOrShareMint: 'flLOOP',
        underlyingMint: USDC_MINTS.devnet,
      },
      mainnet: {
        programId: PROTOCOL_PROGRAMS.kamino.mainnet,
        marketOrVaultAddress: '7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF',
        reserveOrPoolAddress: 'D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59',
        collateralOrShareMint: 'B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D',
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
    receiptShareSymbol: 'flDRFT',
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
        programId: PROTOCOL_PROGRAMS.drift.devnet,
        marketOrVaultAddress: 'JCNCMFXo5M5qwUPg2Utu1u6YWp3MbygxqBsBeXXJfrw',
        reserveOrPoolAddress: '6gMq3mRCKf8aP3ttTyYhuijnyTe3534w14MZ1f7T2F7q',
        collateralOrShareMint: 'flDRFT',
        underlyingMint: USDC_MINTS.devnet,
      },
      mainnet: {
        programId: PROTOCOL_PROGRAMS.drift.mainnet,
        marketOrVaultAddress: 'JCNCMFXo5M5qwUPg2Utu1u6YWp3MbygxqBsBeXXJfrw',
        reserveOrPoolAddress: 'GXWqPpjQpdz7KZw9p7f5PX2eGxHAhvpNXiviFkAB8zXg',
        collateralOrShareMint: 'GXWqPpjQpdz7KZw9p7f5PX2eGxHAhvpNXiviFkAB8zXg',
        underlyingMint: USDC_MINTS.mainnet,
      },
    },
  },
];
