import { z } from "zod";
import { type Hex } from "viem";
import { createTool } from "@goat-sdk/core";
import { EVMWalletClient } from "@goat-sdk/wallet-evm";

import { CASINO_GAME_TYPE, CoinToss, COINTOSS_FACE } from "@betswirl/sdk-core";

import { getBetToken, getBetAmountInWei, placeBet } from "../utils/betswirl";
import { casinoBetParams, getMaxBetCountParam } from "../parameters";

export function createCoinTossTool(walletClient: EVMWalletClient) {
    return createTool(
        {
            name: "betswirl.coinToss",
            description:
                "Flip a coin on BetSwirl. The player is betting that the rolled face will be the one chosen.",
            parameters: z.object({
                face: z
                    .nativeEnum(COINTOSS_FACE)
                    .describe("The face of the coin"),
                ...casinoBetParams,
                ...getMaxBetCountParam(CASINO_GAME_TYPE.COINTOSS),
            }),
        },
        async (parameters) => {
            const face = parameters.face as COINTOSS_FACE;

            // Get the bet token from the user input
            const selectedToken = await getBetToken(
                walletClient,
                parameters.token
            );

            // Validate the bet amount
            const betAmountInWei = getBetAmountInWei(
                parameters.betAmount,
                selectedToken
            );

            const hash = await placeBet(
                walletClient,
                CASINO_GAME_TYPE.COINTOSS,
                CoinToss.encodeInput(face),
                CoinToss.getMultiplier(face),
                {
                    betAmount: betAmountInWei,
                    betToken: selectedToken,
                    betCount: 1,
                    receiver: walletClient.getAddress() as Hex,
                    stopGain: 0n,
                    stopLoss: 0n,
                }
            );

            return hash;
        }
    );
}
