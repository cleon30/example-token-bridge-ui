import {
  ChainId,
  ChainName,
  getGovernorIsVAAEnqueued,
  getSignedVAA,
} from "@0xcleon/wormhole-sdk";
import { WORMHOLE_RPC_HOSTS } from "./consts";

export interface GetSignedVAAWithRetryResult {
  vaaBytes: Uint8Array | undefined;
  isPending: boolean;
}

export const getSignedVAAWithRetry = async (
  emitterChain: ChainId | ChainName,
  emitterAddress: string,
  sequence: string,
  retryAttempts: number = 3000,
  delay: number = 1000,
  timeout: number = 600000
): Promise<GetSignedVAAWithRetryResult> => {
  const startTime = Date.now();
  const rpcHost = WORMHOLE_RPC_HOSTS[0]; // Always use the first host
  console.log("emitterChain", emitterChain);
  console.log("emitterAddress", emitterAddress);
  console.log("sequence", sequence);
  let attempts = 0;

  while (true) {
    attempts++;
    if (Date.now() - startTime > timeout) {
      throw new Error(`Operation timed out after ${attempts} attempts`);
    }

    try {
      const [signedVAAResult, isEnqueuedResult] = await Promise.all([
        getSignedVAA(rpcHost, emitterChain, emitterAddress, sequence),
        getGovernorIsVAAEnqueued(rpcHost, emitterChain, emitterAddress, sequence),
      ]);

      if (signedVAAResult.vaaBytes) {
        console.log(`Successfully retrieved VAA on attempt ${attempts}`);
        return { vaaBytes: signedVAAResult.vaaBytes, isPending: false };
      }

      if (isEnqueuedResult.isEnqueued) {
        console.log(`VAA is enqueued (attempt ${attempts})`);
        return { vaaBytes: undefined, isPending: true };
      }

      console.warn(`Attempt ${attempts} failed: VAA not found and not enqueued`);
    } catch (error) {
      console.error(`Error on attempt ${attempts}:`, error);
    }

    if (attempts >= retryAttempts) {
      throw new Error(`Failed to get signed VAA after ${attempts} attempts`);
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
  }
};