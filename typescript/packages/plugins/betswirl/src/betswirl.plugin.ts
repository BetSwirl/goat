import { Chain, PluginBase } from "@goat-sdk/core";
import { EVMWalletClient } from "@goat-sdk/wallet-evm";

import { casinoChains } from "@betswirl/sdk-core";
import { BetSwirlService } from "./betswirl.service";

export class BetSwirlPlugin extends PluginBase<EVMWalletClient> {
    constructor() {
        super("betswirl", [new BetSwirlService()]);
    }

    supportsChain = (chain: Chain) =>
        chain.type === "evm" && casinoChains.some((casinoChain) => casinoChain.id === chain.id);
}

export function betswirl() {
    return new BetSwirlPlugin();
}
