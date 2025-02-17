import { createToolParameters } from "@goat-sdk/core";
import { type Hex } from "viem";
import { z } from "zod";

import { COINTOSS_FACE } from "@betswirl/sdk-core";

const hexAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "The address must be a valid EVM address");

export const gasTokenAddress: Hex = "0x0000000000000000000000000000000000000000";

const casinoBetParams = {
    betAmount: z.bigint().positive().describe("The bet amount"),
    betCount: z.number().positive().default(1).optional().describe("The number of bets to place"),
    token: hexAddress
        .default(gasTokenAddress)
        .describe("Token address")
        .optional()
        .describe("The token to bet with, by default the gas token."),
    stopGain: z.bigint().positive().optional().describe("The profit amount to stop betting"),
    stopLoss: z.bigint().positive().optional().describe("The loss amount to stop betting"),
    receiver: hexAddress.optional().describe("The payout receiver address"),
    affiliate: hexAddress.optional().describe("The payout receiver address"),
};

export class CoinTossBetParameters extends createToolParameters(
    z.object({
        face: z.nativeEnum(COINTOSS_FACE).describe("The face of the coin"),
        ...casinoBetParams,
    }),
) {}

export class DiceBetParameters extends createToolParameters(
    z.object({
        cap: z.number().positive().max(99).describe("The number above which you win"),
        ...casinoBetParams,
    }),
) {}

export class GetBetParameters extends createToolParameters(
    z.object({
        hash: z
            .string()
            .regex(/^0x[a-fA-F0-9]{64}$/, "Transaction hash must be a valid hex string")
            .describe("Transaction hash to check status for"),
    }),
) {}
