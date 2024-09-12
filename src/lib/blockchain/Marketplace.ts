import { CONFIG } from "lib/config";
import MarketplaceABI from "./abis/Marketplace";
import { getNextSessionId } from "./Session";
import { waitForTransactionReceipt, writeContract } from "@wagmi/core";
import { config } from "features/wallet/WalletProvider";
import { saveTxHash } from "features/game/types/transactions";

const address = CONFIG.MARKETPLACE_CONTRACT;

export type AcceptOfferParams = {
  signature: string;
  sessionId: string;
  nextSessionId: string;
  deadline: number;
  sender: string;
  farmId: number;
  fee: number | string;
  offer: {
    tradeId: string;
    signature: string;
    farmId: number;
    id: number;
    sfl: number;
    collection: "collectibles" | "buds" | "wearables" | "resources";
    name: string;
  };
};

export async function acceptOfferTransaction({
  sender,
  signature,
  sessionId,
  nextSessionId,
  deadline,
  farmId,
  offer,
  fee,
}: AcceptOfferParams): Promise<string> {
  const oldSessionId = sessionId;

  const hash = await writeContract(config, {
    abi: MarketplaceABI,
    address: address as `0x${string}`,
    functionName: "acceptOffer",
    args: [
      signature,
      sessionId,
      nextSessionId,
      BigInt(deadline),
      BigInt(farmId),
      BigInt(fee),
      offer,
    ],
    account: sender as `0x${string}`,
  });

  saveTxHash({ event: "transaction.offerAccepted", hash, sessionId, deadline });
  await waitForTransactionReceipt(config, { hash });

  return await getNextSessionId(sender, farmId, oldSessionId);
}