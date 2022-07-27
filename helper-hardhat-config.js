const networkConfig = {
    default: {
        name: "hardhat",
        equityInterval: "1000",
    },
    31337: {
        name: "localhost",
        equityInterval: "10000", //10seconds
        updateWindow: "500", //0.5seconds
    },
    4: {
        name: "rinkeby",
        equityInterval: "2592000000", //30days
        updateWindow: "604800000", //7days
        i3Account: "0x0b9412DF2c8802E7fCc2D000392f16fD0df2bfEE", // 0.1 ETH
    },
    1: {
        name: "mainnet",
        equityInterval: "1000",
        updateWindow: "500", //0.5seconds
    },
}

const developmentChains = ["hardhat", "localhost"]
const VERIFICATION_BLOCK_CONFIRMATIONS = 6

module.exports = {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
}
