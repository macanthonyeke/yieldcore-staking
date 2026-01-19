import { VAULT_ABI, TOKEN_ABI } from "./abis";

export const VAULT_ADDRESS = "0x73CA3C548aF404ef800eff739d39e4A18050404B" as const;
export const TOKEN_ADDRESS = "0xBE8Dd64b99e7AC0477F8b006ae988958C0944CbE" as const;

export const CHAIN_ID = 11155111; // Sepolia

// Lock options with exact values from contract
export interface LockOption {
  lockPeriod: bigint;
  label: string;
  dailyRate: bigint;
  penalty: bigint;
}

export const LOCK_OPTIONS: LockOption[] = [
  { lockPeriod: 600n, label: "10 min", dailyRate: 10n, penalty: 5n },
  { lockPeriod: 1200n, label: "20 min", dailyRate: 20n, penalty: 10n },
  { lockPeriod: 1800n, label: "30 min", dailyRate: 30n, penalty: 15n },
  { lockPeriod: 3600n, label: "60 min", dailyRate: 40n, penalty: 20n },
];

export const SECONDS_PER_DAY = 86400n;
export const MAX_REWARD_TIME = 86400n; // 24 hours
export const GRACE_PERIOD = 172800n; // 48 hours
export const DIVISOR = 100n;

export const vaultContract = {
  address: VAULT_ADDRESS,
  abi: VAULT_ABI,
} as const;

export const tokenContract = {
  address: TOKEN_ADDRESS,
  abi: TOKEN_ABI,
} as const;
