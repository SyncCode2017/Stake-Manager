import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { BigNumber, ContractTransaction } from "ethers"
import { network, deployments, ethers, getNamedAccounts } from "hardhat"
import { networkConfig } from "../helper-hardhat-config"
import { StakeManager as StakeManagerType } from "../typechain-types"
import { setupUser } from "../utils/helper-functions"
import { moveTime } from "../utils/move-time"


const setup = deployments.createFixture(async () => {
    const { deployer, alice, bob, charlie } = await getNamedAccounts()

    const contracts = {
        stakeManager  : <StakeManagerType> await ethers.getContract("StakeManager")
    }

    return {
        ...contracts,
        deployer : await setupUser(deployer, contracts),
        alice    : await setupUser(alice, contracts),
        bob      : await setupUser(bob, contracts),
        charlie  : await setupUser(charlie, contracts),
    }
})

type TestAccount = {
    address: string,
    signer: SignerWithAddress
} & {
    stakeManager: StakeManagerType
}

async function main() {
    let deployer: TestAccount,
        alice: TestAccount,
        bob: TestAccount,
        charlie: TestAccount,
        accounts: SignerWithAddress[],
        companyTreasury: SignerWithAddress,
        fundsToShareInEth: number,
        fundsToShareInWei: BigNumber,
        stake1: number,
        stake2: number,
        stakeManager: StakeManagerType,
        paymentInterval: number,
        updateWindow: number

    ({ deployer, alice, bob, charlie, stakeManager }  = await setup())
    accounts = await ethers.getSigners()
    const chainId: number = network.config.chainId!
    companyTreasury = accounts[5]
    stake1 = 50000000 
    stake2 = 20000000 
    paymentInterval = networkConfig[network.name].paymentInterval!
    updateWindow = networkConfig[network.name].updateWindow!
    fundsToShareInEth = 1000
    fundsToShareInWei = ethers.utils.parseEther(String(fundsToShareInEth))
    
    const trx1: ContractTransaction = await deployer.signer.sendTransaction({
        from: deployer.address,
        to: stakeManager.address,
        value: fundsToShareInWei,
    })
    await trx1.wait()
    const stake3 = 500 * 10 ** 6 //50000000
    await moveTime(100) // after 5 days

    // add beneficiaries 
    const trx2: ContractTransaction = await deployer.stakeManager.addBeneficiary(alice.address, stake3)
    await trx2.wait()

    var startingBalance = await (
        await alice.signer.getBalance()
    ).toString()
    startingBalance = ethers.utils
        .formatEther(startingBalance)
        .toString()

    await moveTime(2595010) // after 30 days

    // distribute funds 
    const trx3: ContractTransaction = await deployer.stakeManager.distributeFunds()
    await trx3.wait()

    var endingBalance = await (
        await alice.signer.getBalance()
    ).toString()
    endingBalance = ethers.utils
        .formatEther(endingBalance)
        .toString()
    const bal = Number(endingBalance) - Number(startingBalance)
    
    console.log(`The starting balance is ${startingBalance}`)
    console.log(`The ending balance is ${endingBalance}`)
    console.log(`The received amount is ${bal}`)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
