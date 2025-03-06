import { z } from "zod";
import { type Hex } from "viem";
import { createTool } from "@goat-sdk/core";
import { EVMWalletClient } from "@goat-sdk/wallet-evm";

import {
    CASINO_GAME_TYPE,
    Roulette,
    RouletteNumber,
    MIN_SELECTABLE_ROULETTE_NUMBER,
    MAX_SELECTABLE_ROULETTE_NUMBER,
} from "@betswirl/sdk-core";

import { getBetToken, getBetAmountInWei, placeBet } from "../utils/betswirl";
import { casinoBetParams, getMaxBetCountParam } from "../parameters";

export function createRouletteTool(walletClient: EVMWalletClient) {
    return createTool(
        {
            name: "betswirl.roulette",
            description:
                "Play the BetSwirl Roulette. The player is betting that the rolled number will be one of the chosen numbers.",
            parameters: z.object({
                numbers: z
                    .number()
                    .gte(MIN_SELECTABLE_ROULETTE_NUMBER)
                    .lte(MAX_SELECTABLE_ROULETTE_NUMBER)
                    .array()
                    .min(MIN_SELECTABLE_ROULETTE_NUMBER)
                    .max(MAX_SELECTABLE_ROULETTE_NUMBER)
                    .describe("The numbers to bet on"),
                ...casinoBetParams,
                ...getMaxBetCountParam(CASINO_GAME_TYPE.ROULETTE),
            }),
        },
        async (parameters) => {
            const numbers = parameters.numbers as RouletteNumber[];

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
                CASINO_GAME_TYPE.ROULETTE,
                Roulette.encodeInput(numbers),
                Roulette.getMultiplier(numbers),
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
