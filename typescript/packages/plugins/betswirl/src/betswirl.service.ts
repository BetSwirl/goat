import { Tool } from "@goat-sdk/core";
import { EVMWalletClient } from "@goat-sdk/wallet-evm";
// import { ViemEVMWalletClient } from "@goat-sdk/wallet-viem";
import { type Hex } from "viem";

import {
    CASINO_GAME_TYPE,
    type CasinoChainId,
    CoinToss,
    Dice,
    DiceNumber,
    bankAbi,
    casinoChainById,
    casinoGameAbi,
    generatePlayGameFunctionData,
    maxHarcodedBetCountByType,
} from "@betswirl/sdk-core";

import { CoinTossBetParameters, DiceBetParameters, GetBetParameters, gasTokenAddress } from "./parameters";

export class BetSwirlService {
    @Tool({
        name: "betswirl.coinTossBet",
        description: "Flip a coin",
    })
    async coinTossBet(walletClient: EVMWalletClient, parameters: CoinTossBetParameters) {
        const hash = await placeBet(
            walletClient,
            CASINO_GAME_TYPE.COINTOSS,
            [CoinToss.encodeInput(parameters.face)],
            CoinToss.getMultiplier(parameters.face),
            getCasinoGameParameters(walletClient.getAddress(), parameters),
        );

        return hash;
    }

    @Tool({
        name: "betswirl.getCoinTossBet",
        description: "Get the resolved Coin Toss bet",
    })
    async getCoinTossBet(parameters: GetBetParameters) {
        // return fetchCasinoBet(parameters.hash)
    }

    @Tool({
        name: "betswirl.diceBet",
        description: "Roll a dice",
    })
    async diceBet(walletClient: EVMWalletClient, parameters: DiceBetParameters) {
        const cap = parameters.cap as DiceNumber;
        const hash = await placeBet(
            walletClient,
            CASINO_GAME_TYPE.DICE,
            [Dice.encodeInput(cap)],
            Dice.getMultiplier(cap),
            getCasinoGameParameters(walletClient.getAddress(), parameters),
        );

        return hash;
    }

    @Tool({
        name: "betswirl.getDiceBet",
        description: "Get the resolved Dice bet",
    })
    async getDiceBet(parameters: GetBetParameters) {
        // return fetchCasinoBet(parameters.hash)
    }
}

function getCasinoGameParameters(
    accountAddress: string,
    params: {
        token?: string;
        betAmount: bigint;
        betCount?: number;
        receiver?: string;
        stopGain?: bigint;
        stopLoss?: bigint;
    },
) {
    return {
        betAmount: params.betAmount,
        betToken: (params.token as Hex) || gasTokenAddress,
        betCount: params.betCount || 1,
        receiver: (params.receiver || accountAddress) as Hex,
        stopGain: params.stopGain || 0n,
        stopLoss: params.stopLoss || 0n,
    };
}

async function getBetRequirements(
    walletClient: EVMWalletClient,
    game: CASINO_GAME_TYPE,
    betToken: Hex,
    multiplier: number,
) {
    try {
        const { value: rawBetRequirements } = (await walletClient.read({
            address: casinoChainById[walletClient.getChain().id as CasinoChainId].contracts.bank,
            functionName: "getBetRequirements",
            args: [betToken, BigInt(multiplier)],
            abi: bankAbi,
        })) as { value: string[] };
        return {
            maxBetAmount: BigInt(rawBetRequirements[1]),
            maxBetCount: Math.min(Number(rawBetRequirements[2]), maxHarcodedBetCountByType[game]),
        };
    } catch (error) {
        throw new Error(`An error occured while getting the bet requirements: ${error}`);
    }
}

async function getChainlinkVrfCost(walletClient: EVMWalletClient, gameAddress: Hex, betToken: Hex, betCount: number) {
    try {
        const { value: vrfCost } = (await walletClient.read({
            address: gameAddress,
            functionName: "getChainlinkVRFCost",
            args: [betToken, betCount],
            abi: casinoGameAbi,
        })) as { value: string };
        if (!vrfCost) {
            return 0n;
        }
        return BigInt(vrfCost || 0n);
    } catch (error) {
        throw new Error(`An error occured while getting the chainlink vrf cost: ${error}`);
    }
}

async function placeBet(
    walletClient: EVMWalletClient,
    game: CASINO_GAME_TYPE,
    gameParams: Array<DiceNumber | boolean>,
    gameMultiplier: number,
    casinoGameParams: {
        betAmount: bigint;
        betToken: Hex;
        betCount: number;
        receiver: Hex;
        stopGain: bigint;
        stopLoss: bigint;
    },
) {
    const chainId = walletClient.getChain().id as CasinoChainId;
    const gameAddress = casinoChainById[chainId].contracts.games[game]?.address;
    if (!gameAddress) {
        throw new Error(`${game} isn't available on the chain id ${chainId}`);
    }
    const betRequirements = await getBetRequirements(walletClient, game, casinoGameParams.betToken, gameMultiplier);
    if (casinoGameParams.betAmount > betRequirements.maxBetAmount) {
        throw new Error(`Bet amount should be less than ${betRequirements.maxBetAmount}`);
    }
    if (casinoGameParams.betCount > betRequirements.maxBetCount) {
        throw new Error(`Bet count should be less than ${betRequirements.maxBetCount}`);
    }

    const vrfCost = await getChainlinkVrfCost(
        walletClient,
        gameAddress,
        casinoGameParams.betToken,
        casinoGameParams.betCount,
    );
    const functionData = generatePlayGameFunctionData(
        {
            betAmount: casinoGameParams.betAmount,

            game,
            gameEncodedExtraParams: gameParams,
            receiver: casinoGameParams.receiver,

            betCount: casinoGameParams.betCount,
            // token: {
            //     address: casinoGameParams.betToken
            //     symbol
            //     decimals
            // },
            stopGain: casinoGameParams.stopGain,
            stopLoss: casinoGameParams.stopLoss,
        },
        chainId,
    );
    try {
        const { hash: betHash } = await walletClient.sendTransaction({
            to: gameAddress,
            functionName: functionData.data.functionName,
            args: functionData.data.args,
            value: casinoGameParams.betToken === gasTokenAddress ? functionData.totalBetAmount + vrfCost : vrfCost,
            abi: functionData.data.abi,
            data: functionData.encodedData,
        });

        return betHash;
    } catch (error) {
        throw new Error(`An error occured while placing the bet: ${error}`);
    }
}
