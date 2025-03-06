import { z } from "zod";
import { type Hex } from "viem";
import { createTool } from "@goat-sdk/core";
import { EVMWalletClient } from "@goat-sdk/wallet-evm";

import {
    CASINO_GAME_TYPE,
    Dice,
    DiceNumber,
    MIN_SELECTABLE_DICE_NUMBER,
    MAX_SELECTABLE_DICE_NUMBER,
} from "@betswirl/sdk-core";

import { getBetToken, getBetAmountInWei, placeBet } from "../utils/betswirl";
import { casinoBetParams, getMaxBetCountParam } from "../parameters";

export function createDiceTool(walletClient: EVMWalletClient) {
    return createTool(
        {
            name: "betswirl.dice",
            description:
                "Play the BetSwirl Dice. The player is betting that the rolled number will be above this chosen number.",
            parameters: z.object({
                number: z
                    .number()
                    .gte(MIN_SELECTABLE_DICE_NUMBER)
                    .lte(MAX_SELECTABLE_DICE_NUMBER)
                    .describe("The number to bet on"),
                ...casinoBetParams,
                ...getMaxBetCountParam(CASINO_GAME_TYPE.DICE),
            }),
        },
        async (parameters) => {
            const number = parameters.number as DiceNumber;

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
                CASINO_GAME_TYPE.DICE,
                Dice.encodeInput(number),
                Dice.getMultiplier(number),
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
