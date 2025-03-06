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
    GAS_TOKEN_ADDRESS,
    GameEncodedInput,
    RawBetRequirements,
    type RawCasinoToken,
    Roulette,
    RouletteNumber,
    Token,
    casinoChainById,
    fetchBetByHash,
    getBetRequirementsFunctionData,
    getCasinoTokensFunctionData,
    getPlaceBetFunctionData,
    maxHarcodedBetCountByType,
} from "@betswirl/sdk-core";

import { CoinTossBetParameters, DiceBetParameters, GetBetParameters, RouletteBetParameters } from "./parameters";
// Should be exported from the sdk in the future
const BETSWIRL_API_URL = "https://api.betswirl.com";
export class BetSwirlService {
    @Tool({
        name: "betswirl.getCasinoGames",
        description: "List games available for betting on the chain",
    })
    async getCasinoGames(walletClient: EVMWalletClient) {
        return; // for each games walletClient.read(game.paused)
    }

    @Tool({
        name: "betswirl.getBetRequirements",
        description: "List games available for betting on the chain",
    })
    async getBetRequirements(walletClient: EVMWalletClient) {
        return; // walletClient.read(game.paused)
    }

    @Tool({
        name: "betswirl.getBetTokens",
        description: "List tokens available for betting on the games",
    })
    async getBetTokens(walletClient: EVMWalletClient): Promise<Token[]> {
        const chainId = walletClient.getChain().id as CasinoChainId;
        const casinoChain = casinoChainById[chainId];
        // You theorically not need to do it if you if you restrict the usable chains in the plugin from the start with supportsChain
        if (!casinoChain) {
            throw new Error(`Chain id ${chainId} not found`);
        }
        try {
            const { data: casinoTokensFunctionData } = getCasinoTokensFunctionData(chainId);
            const { value: rawTokens } = (await walletClient.read({
                address: casinoTokensFunctionData.to,
                functionName: casinoTokensFunctionData.functionName,
                abi: casinoTokensFunctionData.abi,
            })) as { value: RawCasinoToken[] };

            return rawTokens
                .filter((rawToken) => rawToken.token.allowed && !rawToken.token.paused)
                .map((rawToken) => ({
                    address: rawToken.tokenAddress,
                    symbol:
                        rawToken.tokenAddress === GAS_TOKEN_ADDRESS
                            ? casinoChain.viemChain.nativeCurrency.symbol
                            : rawToken.symbol,
                    decimals: rawToken.decimals,
                }));
        } catch (error) {
            throw new Error(`Error getting bankroll tokens: ${error}`);
        }
    }

    @Tool({
        name: "betswirl.coinTossBet",
        description: "Flip a coin",
    })
    async coinTossBet(walletClient: EVMWalletClient, parameters: CoinTossBetParameters) {
        const hash = await placeBet(
            walletClient,
            CASINO_GAME_TYPE.COINTOSS,
            CoinToss.encodeInput(parameters.face),
            CoinToss.getMultiplier(parameters.face),
            getCasinoGameParameters(walletClient.getAddress(), parameters),
        );

        return hash;
    }

    @Tool({
        name: "betswirl.getBet",
        description:
            "Get the placed bet. If it returns null, it means the bet is not yet saved in subgraph or the bet doesn't exist.",
    })
    async getBet(walletClient: EVMWalletClient, parameters: GetBetParameters) {
        const chainId = walletClient.getChain().id as CasinoChainId;
        const betData = await fetchBetByHash({ chainId }, parameters.hash as Hex);
        if (betData.bet) return betData.bet;
        if (betData.error) {
            throw new Error(`[${betData.error.code}] Error fetching bet: ${betData.error.message}`);
        }
        return null;
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
            Dice.encodeInput(cap),
            Dice.getMultiplier(cap),
            getCasinoGameParameters(walletClient.getAddress(), parameters),
        );

        return hash;
    }

    @Tool({
        name: "betswirl.rouletteBet",
        description: "Bet on roulette outcomes",
    })
    async rouletteBet(walletClient: EVMWalletClient, parameters: RouletteBetParameters) {
        const numbers = parameters.numbers as RouletteNumber[];
        const hash = await placeBet(
            walletClient,
            CASINO_GAME_TYPE.ROULETTE,
            Roulette.encodeInput(numbers),
            Roulette.getMultiplier(numbers),
            getCasinoGameParameters(walletClient.getAddress(), parameters),
        );

        return hash;
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
        betToken: (params.token as Hex) || GAS_TOKEN_ADDRESS,
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
        const { data: betRequirementsFunctionData } = getBetRequirementsFunctionData(
            betToken,
            multiplier,
            walletClient.getChain().id as CasinoChainId,
        );
        const { value: rawBetRequirements } = (await walletClient.read({
            address: betRequirementsFunctionData.to,
            functionName: betRequirementsFunctionData.functionName,
            args: betRequirementsFunctionData.args as unknown as unknown[],
            abi: betRequirementsFunctionData.abi,
        })) as { value: RawBetRequirements };
        return {
            maxBetAmount: BigInt(rawBetRequirements[1]),
            maxBetCount: Math.min(Number(rawBetRequirements[2]), maxHarcodedBetCountByType[game]),
        };
    } catch (error) {
        throw new Error(`An error occured while getting the bet requirements: ${error}`);
    }
}

/* WORKAROUND: We don't have a way to read the chainlink vrf cost because we cannot pass gasPrice in walletClient.read, so we fetch it from the api.
        The issue is the gasPrice used to estimate the VRF fees on API side can be different from the one used while calling walletClient.sendTransaction. It means the placeBet call function may fail...
        To avoid that, we ideally need gasPrice both in the read and in the sendTransaction call, but at least gasPrice in the sendTransaction call.
    */
async function getChainlinkVrfCost(
    walletClient: EVMWalletClient,
    game: CASINO_GAME_TYPE,
    betToken: Hex,
    betCount: number,
) {
    const chainId = walletClient.getChain().id as CasinoChainId;
    try {
        /*const { data: chainlinkVRFCostFunctionData } = getChainlinkVrfCostFunctionData(
            game,
            betToken,
            betCount,
            chainId
        );
        const { value: vrfCost } = (await walletClient.read({
            address: chainlinkVRFCostFunctionData.to,
            functionName: chainlinkVRFCostFunctionData.functionName,
            args: chainlinkVRFCostFunctionData.args as unknown as unknown[],
            abi: chainlinkVRFCostFunctionData.abi,
            gasPrice // to make it work, we need to precise a gas price
        })) as { value: string };*/

        const params = new URLSearchParams({
            game: game.toString(),
            tokenAddress: betToken,
            betCount: betCount.toString(),
            chainId: chainId.toString(),
        });
        const response = await fetch(`${BETSWIRL_API_URL}/vrfFees?${params}`, {});

        if (!response.ok) {
            throw new Error(`An error occured while fetching the chainlink vrf cost from API: ${response.statusText}`);
        }

        const vrfCost = await response.json();

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
    gameEncodedInput: GameEncodedInput,
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

    const betRequirements = await getBetRequirements(walletClient, game, casinoGameParams.betToken, gameMultiplier);
    if (casinoGameParams.betAmount > betRequirements.maxBetAmount) {
        throw new Error(`Bet amount should be less than ${betRequirements.maxBetAmount}`);
    }
    if (casinoGameParams.betCount > betRequirements.maxBetCount) {
        throw new Error(`Bet count should be less than ${betRequirements.maxBetCount}`);
    }

    const vrfCost = await getChainlinkVrfCost(walletClient, game, casinoGameParams.betToken, casinoGameParams.betCount);
    const functionData = getPlaceBetFunctionData(
        {
            betAmount: casinoGameParams.betAmount,

            game,
            gameEncodedInput: gameEncodedInput,
            receiver: casinoGameParams.receiver,
            betCount: casinoGameParams.betCount,
            tokenAddress: casinoGameParams.betToken,
            stopGain: casinoGameParams.stopGain,
            stopLoss: casinoGameParams.stopLoss,
        },
        chainId,
    );
    try {
        const { hash: betHash } = await walletClient.sendTransaction({
            to: functionData.data.to,
            functionName: functionData.data.functionName,
            args: functionData.data.args as unknown as unknown[],
            value:
                casinoGameParams.betToken === GAS_TOKEN_ADDRESS
                    ? functionData.formattedData.totalBetAmount + vrfCost
                    : vrfCost,
            abi: functionData.data.abi,
        });

        return betHash;
    } catch (error) {
        throw new Error(`An error occured while placing the bet: ${error}`);
    }
}
