import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

export const OMNIMANDATE_CONTRACT_ADDRESS = "0x04c1E361ec0Da96a263794F1f582989c2419267C" as const;

export const genlayerReadClient = createClient({
  chain: testnetBradbury,
});

export { testnetBradbury };
