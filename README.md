# Flume - Yield, risk and cost, all on one screen

Over 500,000+ active wallets lend stablecoins and assets across Solana protocols like Kamino, Meteora, Save, Marginfi, and Drift. Even though Solana transaction fees are fractions of a cent, billions in capital remain stuck in underperforming pools or get lured into "Headline APY traps" bloated by volatile reward tokens and hidden withdrawal fees. Users don't rebalance because calculating true net yield after entry/exit fees, checking pool utilization limits, and manually withdrawing and redepositing across multiple dApps is tedious and opaque. Flume fixes this with a 100% stateless, zero-database architecture that reads live on-chain state directly via Solana RPC, ranks every market by real Net USD Return over your exact holding horizon, and migrates your capital in a single atomic Solana transaction.


### What Flume Does (Overview)
Built with zero external databases, Flume talks directly to the Solana blockchain via RPC to make yield optimization transparent and instant:   

- Direct On-Chain Detection: Reads your live wallet balances and active DeFi lending positions directly via Solana RPC and the Vybe Network API without storing user data.   
- True Net-Yield Ranking: Cuts through misleading Headline APYs by factoring in holding periods (7D–365D), volatile token reward haircuts (0%–100%), and entry/exit fees to show your exact Net USD Return and Break-Even Time.   
- Transparent Risk Checks: Flags real on-chain bottlenecks before you move funds, such as >90% pool utilization, low withdrawal liquidity, or leveraged loop risks.   
- Simulated Atomic Migration: Bundles withdrawing from your old pool and depositing into the new one into a single atomic Solana transaction, running a pre-sign RPC simulation (simulateTransaction) with a minimum-output guard so your capital moves safely in one click.   

### The Problem?

Solana was built for high-speed, sub-cent financial execution, yet DeFi yield depositors behave as if they are still paying $50 Ethereum gas fees. Across Solana’s lending ecosystem, over 500k+ users leave their USDC and SOL parked in legacy or suboptimal lending pools earning 4–5% when top-tier organic markets are paying 8–10%+.   When we looked at why capital wasn't moving despite Solana's near-zero network fees, three core friction points stood out:

- The "Headline APY" Illusion: Protocols advertise flashy headline APYs that bundle organic borrower interest with volatile incentive token emissions. A vault advertising 10.80% APY might actually pay only 3.60% in real USDC while charging 15 bps withdrawal and 10 bps deposit fees—meaning a short-term depositor actually loses money migrating into it.   
- Hidden Liquidity & Utilization Traps: A pool can show a high APY precisely because 93%+ of its liquidity is borrowed out, leaving almost zero withdrawable USDC when a user tries to exit.   
- Multi-Step Execution Friction: Moving a position from one protocol to another traditionally requires visiting Protocol A, unstaking/burning receipt tokens, waiting for confirmation, navigating to Protocol B, approving accounts, and depositing—all without any pre-sign guarantee of the exact net output

### How we solve this

We built Flume to turn Solana’s low-fee advantage into effortless, mathematically verified capital efficiency—without ever relying on a centralized database, custodial backend, or opaque black-box scoring.

- **100% Stateless, Zero-Database Architecture (Direct RPC + On-Chain Indexing)**:
Flume runs with zero PostgreSQL, Redis, or off-chain user databases. The application communicates directly with the Solana blockchain via JSON-RPC (@solana/web3.js) alongside the Vybe Network API and live protocol endpoints (Kamino, Meteora Dynamic Vaults, Save, Marginfi, and Drift). The moment you connect your wallet, Flume reads your live SOL balance, real USDC (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` on Mainnet / `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` on Devnet) balance, and active DeFi receipt positions directly from the chain.

- **Deterministic Net-Yield & Break-Even Engine**:
Instead of sorting markets by naive Headline APY, Flume’s yield engine ranks every protocol by Net USD Return over your exact holding horizon (7D, 30D, 90D, or 365D). Users control an interactive Reward Haircut slider (0%–100%) to discount volatile token incentives. For every route, Flume calculates exact source withdrawal bps, destination deposit bps, Solana base + priority fees, and displays the exact Break-Even Time in days (e.g., "Breaks even in 0.4 days" vs "Exceeds 7D horizon") with an inspectable, step-by-step math modal.

- **Evidence-Based On-Chain Risk Signals**:
Flume replaces arbitrary "safety scores" with transparent, rule-based risk flags derived straight from pool metrics—automatically warning users when pool utilization exceeds 80%–90%, when a user's principal exceeds available pool withdrawal liquidity, or when a strategy relies on leveraged looping.   
flume_ai_agent_build_specification.md

- **Pre-Sign RPC Simulation & One-Click Atomic Migration**:
Once an optimal pool is selected, Flume assembles the entire rebalance—ATA verification, source withdrawal, USDC routing, minimum-output slippage guard (0.05% buffer), and destination protocol deposit—into a single atomic Solana transaction. Before you ever sign in your wallet, Flume runs connection.simulateTransaction directly against the Solana RPC to verify compute units, execution logs, and exact post-transaction balances. If the minimum output guard isn't met, the entire transaction reverts atomically—ensuring zero partial-execution risk.