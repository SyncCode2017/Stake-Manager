const { network } = require("hardhat")
const {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const chainId = network.config.chainId
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const accounts = await ethers.getSigners()
    const i3Account = developmentChains.includes(network.name)
        ? accounts[1].address
        : networkConfig[chainId]["i3Account"]
    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS

    log("----------------------------------------------------")
    const args = [
        i3Account,
        networkConfig[chainId]["equityInterval"],
        networkConfig[chainId]["updateWindow"],
    ]
    const equityManager = await deploy("EquityManager", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: waitBlockConfirmations,
    })

    // Verify the deployment
    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        log("Verifying...")
        await verify(equityManager.address, args)
    }
    log("----------------------------------------------------")
}

module.exports.tags = ["all", "equityManager"]
