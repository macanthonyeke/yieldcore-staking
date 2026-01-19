# YieldCore

YieldCore is a production-style ERC20 staking protocol deployed on Ethereum Sepolia. It supports time-locked staking, capped rewards, penalties for early exits, and strict reward pool accounting.

This repository contains:
- The YieldCore staking vault
- The YieldCore ERC20 token
- Foundry tests and invariants
- A frontend for interacting with the protocol

---

## 1. Overview

YieldCore allows users to stake ERC20 tokens for predefined lock periods and earn capped rewards.

**Key properties:**
- Rewards are pre-funded (no minting)
- Each stake has a maximum reward
- Rewards stop accruing once the cap is reached
- Early unstaking applies a penalty
- Expired stakes cannot earn further rewards

YieldCore prioritizes correctness, predictability, and auditability over flexibility.

---

## 2. Architecture

### Contracts
* **YieldCoreToken**
  * Standard ERC20 token
  * Used for both staking and rewards
  * Fixed supply, no minting by the vault
* **YieldCore (Vault)**
  * Holds staked tokens and reward pool
  * Manages stakes, rewards, penalties, and withdrawals
  * Uses OpenZeppelin security primitives

### Fund Flow
1. Users stake tokens into the vault
2. Owner funds the reward pool explicitly
3. Rewards are paid strictly from the reward pool
4. Penalties are recycled back into the reward pool

---

## 3. Staking Mechanics

Users can create multiple stakes. Only predefined lock periods are allowed.

**Each stake records:**
* Amount
* Start time
* Lock period
* Last claim time
* Rewards claimed
* Active/expired status

**Each lock period has:**
* A reward rate
* A penalty rate

---

## 4. Reward Accrual & Caps

Rewards accrue linearly over time.

**Accrual is proportional to:**
* Staked amount
* Time elapsed
* Lock-specific rate

**Each stake has a maximum reward cap:**
* Total rewards claimed + pending rewards can never exceed this cap
* Once the cap is reached, rewards stop accruing permanently

---

## 5. Unstaking Paths

### Normal Unstake
* Allowed only after lock period ends
* Pays principal + remaining rewards (if any)

### Early Unstake
* Allowed before lock ends
* Applies a penalty
* Penalty is added back to the reward pool
* No rewards are paid

### Emergency Withdraw
* Only available when the protocol is paused
* Returns principal only
* Forfeits all rewards

### Expired Stakes
Once expired:
* Rewards stop accruing
* Claims are disabled
* Unstake remains available
* Expired stakes remain visible and must be manually cleaned up by the user

---

## 6. Reward Pool Accounting

Rewards must be explicitly funded by the owner. The pool can never go negative.

**The reward pool:**
* Can only decrease via user reward claims
* Can increase via owner funding or penalties
* Reward payouts are capped by available pool balance

---

## 7. Security Design

* Reentrancy protection on all sensitive flows
* Pausable for emergency response
* No minting of rewards
* Explicit owner powers only

### Owner Permissions

**Owner can:**
* Fund reward pool
* Pause / unpause protocol
* Withdraw excess rewards (never user principal)

**Owner cannot:**
* Steal user principal
* Bypass lock periods
* Inflate rewards
* Modify existing user stakes

---

## 8. Protocol Invariants

The following must always hold (enforced via Foundry tests and fuzzing):

* Total rewards paid ≤ total rewards funded
* User rewards ≤ maximum reward cap
* Reward pool never goes negative
* User principal cannot be stolen by owner
* Expired stakes earn zero rewards
* Emergency withdraw returns principal only

---

## 9. Deployment

**Network:** Ethereum Sepolia

**YieldCore Vault**

```

0x73CA3C548aF404ef800eff739d39e4A18050404B

```

**YieldCoreToken**

```

0xBE8Dd64b99e7AC0477F8b006ae988958C0944CbE

```

*Contracts are verified on Etherscan.*

---

## 10. Testing

This protocol is tested using Foundry with unit tests, fuzzing, and invariants.
See `/test` for details.