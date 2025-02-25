import { createToolParameters } from "@goat-sdk/core";
import { z } from "zod";

import {
    COINTOSS_FACE,
    GAS_TOKEN_ADDRESS,
    MAX_SELECTABLE_DICE_NUMBER,
    MAX_SELECTABLE_ROULETTE_NUMBER,
    MIN_SELECTABLE_DICE_NUMBER,
    MIN_SELECTABLE_ROULETTE_NUMBER,
} from "@betswirl/sdk-core";

const hexAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "The address must be a valid EVM address");

const casinoBetParams = {
    betAmount: z.bigint().positive().describe("The bet amount"),
    betCount: z.number().positive().default(1).optional().describe("The number of bets to place"),
    token: hexAddress
        .default(GAS_TOKEN_ADDRESS)
        .describe("Token address")
        .optional()
        .describe("The token to bet with, by default the gas token."),
    stopGain: z.bigint().positive().optional().describe("The profit amount to stop betting"),
    stopLoss: z.bigint().positive().optional().describe("The loss amount to stop betting"),
    receiver: hexAddress.optional().describe("The payout receiver address"),
};

export class CoinTossBetParameters extends createToolParameters(
    z.object({
        face: z.nativeEnum(COINTOSS_FACE).describe("The face of the coin"),
        ...casinoBetParams,
    }),
) {}

export class DiceBetParameters extends createToolParameters(
    z.object({
        cap: z
            .number()
            .positive()
            .min(MIN_SELECTABLE_DICE_NUMBER)
            .max(MAX_SELECTABLE_DICE_NUMBER)
            .describe("The number above which you win"),
        ...casinoBetParams,
    }),
) {}

export class RouletteBetParameters extends createToolParameters(
    z.object({
        numbers: z
            .number()
            .positive()
            .min(MIN_SELECTABLE_ROULETTE_NUMBER)
            .max(MAX_SELECTABLE_ROULETTE_NUMBER)
            .array()
            .describe("The roulette numbers"),
        ...casinoBetParams,
    }),
) {}

export class GetBetParameters extends createToolParameters(
    z.object({
        hash: z
            .string()
            .regex(/^0x[a-fA-F0-9]{64}$/, "Transaction hash must be a valid hex string")
            .describe("Transaction hash to check status for (hash got when placing the bet)"),
    }),
) {}
