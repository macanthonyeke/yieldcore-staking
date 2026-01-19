import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { getDefaultConfig } from "connectkit";

export const config = createConfig(
  getDefaultConfig({
    chains: [sepolia],
    transports: {
      [sepolia.id]: http(),
    },
    walletConnectProjectId: process.env.d9d4bf138e6a2e15b8f1df9dedb97f19 || "demo",
    appName: "YieldCore",
    appDescription: "Infrastructure-grade staking protocol",
  }),
);

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
