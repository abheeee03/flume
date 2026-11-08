import { PublicKey } from "@solana/web3.js";
import { marketById } from "@/config/markets";
import { getDevnetMints, mintDemoTokens } from "@/lib/solana/devnet-mint-manager";
import { demoUsdcMint, shareMintAddress } from "@/lib/solana/demo-mints";

const MINT_USDC = 10_000;
const SEED_SAVE = 5_000;

export async function POST(request: Request) {
  let body: { walletAddress?: string; action?: string };
  try {
    body = (await request.json()) as { walletAddress?: string; action?: string };
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const action = body.action;
  if (action !== "mint_usdc" && action !== "seed_save_position") {
    return Response.json(
      { error: "Action must be mint_usdc or seed_save_position." },
      { status: 400 },
    );
  }

  let wallet: PublicKey;
  try {
    wallet = new PublicKey(body.walletAddress ?? "");
  } catch {
    return Response.json({ error: "Wallet address is not a public key." }, { status: 400 });
  }

  try {
    const mints = await getDevnetMints();
    const mint =
      action === "mint_usdc"
        ? mints.usdcMint
        : (shareMintAddress("save-main-usdc") ?? demoUsdcMint());
    const amountUi = action === "mint_usdc" ? MINT_USDC : SEED_SAVE;
    const result = await mintDemoTokens({ wallet, mint, amountUi });
    const market = marketById("save-main-usdc");

    return Response.json({
      signature: result.signature,
      action,
      amountUi,
      mint: mint.toBase58(),
      ata: result.ata.toBase58(),
      symbol: action === "mint_usdc" ? "flUSDC" : market?.receiptShareSymbol,
      explorerUrl: `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Devnet faucet failed.";
    return Response.json({ error: message }, { status: 502 });
  }
}
