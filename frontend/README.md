# YieldCore Frontend

A clarity-first staking interface for the YieldCore protocol.

This frontend is intentionally designed to reflect on-chain truth only. It contains no APR projections, no optimistic UI updates, and no hidden state. If the blockchain has not confirmed it, the UI does not show it.

---

## Design Philosophy

**Financial UI is not Marketing UI.**

This application follows three strict principles:

1.  **Blockchain is the single source of truth**
    All stake data, rewards, and activity are derived strictly from on-chain state and events.

2.  **Correctness over speed**
    The UI updates only after confirmed transactions. There are no optimistic mutations or guessed states.

3.  **Clarity over hype**
    There are no APR, APY, "yield" projections, or animated counters.

If the UI is ever wrong—even briefly—trust is broken.

---

## Tech Stack

* **Framework:** React, Vite, TypeScript
* **Web3:** Wagmi, Viem, ConnectKit (Ethers.js is intentionally excluded)
* **Styling:** Tailwind CSS, shadcn/ui
* **Animation:** Framer Motion (used sparingly for confirmation states only)
* **Network:** Ethereum Sepolia

---

## Contracts

**YieldCore Vault**

```

0x73CA3C548aF404ef800eff739d39e4A18050404B

```

**$YLD Token**

```

0xBE8Dd64b99e7AC0477F8b006ae988958C0944CbE

```

*ABIs are sourced directly from Etherscan and are located in `src/lib/abis.ts`.*

---

## Reward Logic & UI Model

* Rewards accrue linearly over time.
* Accrual is capped at 24 hours (1 day).
* Rewards can be claimed before the unlock period ends.
* Early unstaking applies a penalty.
* Expired stakes forfeit future rewards.

**Frontend Derivation**

The UI calculates available rewards using the following logic to ensure safety:

```typescript
availableToClaim = totalEarned - rewardsClaimed

```

There are no timers, no guessing, and no annualization of rates.

---

## Key UI Behaviors

### Stake Cards

* Rendered purely from contract reads.
* No local stake state is stored.
* No manual mutation of data.
* Cards are removed only when on-chain state marks them inactive.

### Activity Log

* Derived entirely from on-chain events.
* Persists across page reloads.
* Persists across wallet disconnects and reconnects.
* Never stored as local UI memory.

### Transactions

* Explicit states: Pending → Confirmed → Failed.
* The UI updates only after confirmation.
* Write hooks reset immediately after success to prevent sticky states.

### Loading & Sync

* Skeleton loaders appear during genuine data fetching only.
* Explicit empty states are provided.
* A passive "Syncing..." indicator appears during background refetches.
* Automatic read retries occur on network reconnection.

---

## Accessibility

* Full keyboard navigation support.
* Visible focus states for all interactive elements.
* Screen-reader friendly status messages.
* Sufficient color contrast ratios.
* Respects `prefers-reduced-motion` settings.
* Touch-friendly targets for mobile users.

---

## Design Constraints

To maintain integrity, this UI will never:

* Show APR or APY.
* Animate "earning" numbers.
* Count rewards upward over time without block confirmations.
* Optimistically mutate balances.
* Require a page refresh for correctness.
* Hide errors behind loading spinners.

If a feature looks exciting but cannot be proven correct via on-chain data, it is excluded.

---

## Testing Philosophy

Tests focus on behavioral correctness rather than snapshot matching.

**Core Test Coverage:**

* Stake card updates following stake, claim, or unstake actions.
* Activity log persistence across reloads.
* Resilience during wallet disconnect/reconnect cycles.
* Validation that chain-derived state is the sole source of truth.

*If removing a contract read allows a test to pass, the test is considered invalid.*

---

## UI Freeze Policy

The UI is considered feature-complete. Further changes are allowed only if they:

1. Fix correctness bugs.
2. Improve clarity.
3. Improve accessibility.

No new features or aesthetic tweaks are permitted.

---

## Project Motivation

Most DeFi UIs fail not because the underlying protocol is broken, but because the frontend misrepresents the state.

YieldCore’s frontend is an experiment in discipline: it asks what happens when the UI refuses to be clever and simply displays the truth.

---

## Author

**MacAnthony Eke**
*Junior Smart Contract Engineer*

Focused on Solidity, protocol design, and correctness-first Web3 UX.