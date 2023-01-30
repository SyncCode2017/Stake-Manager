export const networkConfig: networkConfigInfo = {
    hardhat: {
        paymentInterval: 2592000,
        updateWindow: 604800,
    },
    localhost: {
        paymentInterval: 2592000, // 30 days
        updateWindow: 604800, // 7days
    },
    rinkeby: {
        paymentInterval: 2592000, //30days
        updateWindow: 604800, //7days
        companyTreasury: "company_treasury_address", 
        blockConfirmations: 10,
    },
    goerli: {
        paymentInterval: 2592000, //30days
        updateWindow: 604800, //7days
        companyTreasury: "company_treasury_address", 
        blockConfirmations: 10,
    },
    mainnet: {
        paymentInterval: 2592000,
        updateWindow: 604800, // 7days
    },
}


export const VERIFICATION_BLOCK_CONFIRMATIONS = 6

export interface networkConfigItem {
    paymentInterval?: number
    updateWindow?: number
    companyTreasury?: string
    blockConfirmations?: number
}

export interface networkConfigInfo {
    [key: string]: networkConfigItem
}

export const developmentChains = ["hardhat", "localhost"]
