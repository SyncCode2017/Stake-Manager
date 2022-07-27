const { network, deployments, getNamedAccounts, ethers } = require("hardhat")
const {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} = require("../helper-hardhat-config")

async function main() {
    //const { deployer } = await getNamedAccounts()
    accounts = await ethers.getSigners()
    const chainId = network.config.chainId
    deployer = accounts[0] //await getNamedAccounts()
    const manager = accounts[0]
    const i3Account = accounts[1]
    const stakeholder1 = accounts[2]
    const stakeholder2 = accounts[3]
    const stakeholder3 = accounts[4]
    const stakeholder4 = accounts[5]
    const stake1 = ethers.utils.parseEther("0.1")
    const stake2 = ethers.utils.parseEther("0.05")
    //const args = [i3Account.address, networkConfig[chainId]["equityInterval"]]

    //await deployments.fixture(["all"], { args: args })
    const equityManagerContract = await ethers.getContract("EquityManager")
    const equityManager = equityManagerContract.connect(deployer)
    const fundsToShare = ethers.utils.parseEther("100")

    const trans = await equityManager.addHolder(stakeholder1.address, stake1)
    await trans.wait(1)
    //await equityManager.addHolder(stakeholder2.address, stake2)
    const stakeholder = await equityManager.currentStakeHolders()
    const holder = stakeholder[0].toString()
    console.log(holder)
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
