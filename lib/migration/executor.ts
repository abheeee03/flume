import { Connection, Transaction } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { getExplorerTxUrl } from '@/lib/solana/connection';
import { NetworkCluster } from '@/types/flume';

export function explorerTxUrl(
  signature: string,
  cluster?: NetworkCluster
): string {
  return getExplorerTxUrl(signature, cluster);
}

export async function executeMigrationTransaction(params: {
  connection: Connection;
  wallet: WalletContextState;
  base64Transaction: string;
  blockhash: string;
  lastValidBlockHeight: number;
}): Promise<{ signature: string }> {
  const {
    connection,
    wallet,
    base64Transaction,
    blockhash,
    lastValidBlockHeight,
  } = params;

  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Please connect a Solana wallet before signing.');
  }

  const txBuffer = Buffer.from(base64Transaction, 'base64');
  const transaction = Transaction.from(txBuffer);

  const signature = await wallet.sendTransaction(transaction, connection, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  await connection.confirmTransaction(
    {
      signature,
      blockhash,
      lastValidBlockHeight,
    },
    'confirmed'
  );

  return { signature };
}