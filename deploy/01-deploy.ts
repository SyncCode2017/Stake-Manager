import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction, DeployResult, Address } from "hardhat-deploy/types"
import verify from "../helper-functions"
import { developmentChains, networkConfig } from "../helper-hardhat-config"
import { ethers } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

const deployStakeManager: DeployFunction = async function (
    hre: HardhatRuntimeEnvironment
) {
    const { getNamedAccounts, deployments, network } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const accounts: SignerWithAddress[] = await ethers.getSigners()

    let companyTreasury: Address, waitBlockConfirmations: number
    if (developmentChains.includes(network.name)) {
        companyTreasury = accounts[5].address
        waitBlockConfirmations = 1
    } else {
        companyTreasury = networkConfig[network.name].companyTreasury!
        waitBlockConfirmations = networkConfig[network.name].blockConfirmations!
    }

    log("----------------------------------------------------")
    const args: [string, number, number] = [
        companyTreasury,
        networkConfig[network.name].paymentInterval!,
        networkConfig[network.name].updateWindow!,
    ]

    const stakeManager: DeployResult = await deploy("StakeManager", {
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
        await verify(stakeManager.address, args)
    }
    log("----------------------------------------------------")
}

export default deployStakeManager
deployStakeManager.tags = ["all", "stakeManager"]
