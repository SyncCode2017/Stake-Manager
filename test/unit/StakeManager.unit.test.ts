import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { assert, expect } from "chai"
import { BigNumber, ContractTransaction } from "ethers"
import { network, deployments, ethers, getNamedAccounts } from "hardhat"
import { networkConfig } from "../../helper-hardhat-config"
import { StakeManager as StakeManagerType } from "../../typechain-types"
import { setupUser } from "../../utils/helper-functions"
import { moveTime } from "../../utils/move-time"

const setup = deployments.createFixture(async () => {
    await deployments.fixture()
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

describe("Stake Manager Unit Tests", function () {
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

    beforeEach("Set up accounts and contract", async () => {
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
    })

    describe("constructor", function () {

        it("Check stake manager is deployed", async () => {
            expect(stakeManager.address).to.be.not.empty
        })
        it("initiallizes the interval correctly", async () => {
            const interval = Number(await stakeManager.intervalSeconds())     
            assert.equal(interval, paymentInterval)
        })
        it("initiallizes the window correctly", async () => {
            const window = Number(await stakeManager.updateWindowSeconds())
            assert.equal(window, updateWindow)
        })
        it("initiallizes the company treasury address correctly", async () => {
            const companyAccount = (
                await stakeManager.companyTreasuryAddress()
            ).toString()
            assert.equal(companyAccount, companyTreasury.address)
        })
    })

    describe("Adding new beneficiaries and their stakes", function () {
        it("allows only manager role to add beneficiary", async () => {
            await moveTime(1000) 
            await expect(
                alice.stakeManager.addBeneficiary(
                    alice.address,
                    stake1
                )
            ).to.be.revertedWith("AccessControl")
        })
        it("can add beneficiary in the first month", async () => {
            await moveTime(1000)
            const trans: ContractTransaction = await deployer.stakeManager.addBeneficiary(
                alice.address,
                stake1
            )
            await trans.wait()
            const stakeholder: [string[], BigNumber[]] = await stakeManager.getBeneficiariesAddresses()
            const holder = stakeholder[0].toString()

            assert.equal(holder, alice.address)
        })
        it("can add beneficiary in the first update window", async () => {
            await moveTime(5356800) // 62 days
            const trans: ContractTransaction = await deployer.stakeManager.addBeneficiary(
                alice.address,
                stake1
            )
            await trans.wait()
            const stakeholder: [string[], BigNumber[]] = await stakeManager.getBeneficiariesAddresses()
            const holder = stakeholder[0].toString()

            assert.equal(holder, alice.address)
        })
        it("emits an event after adding beneficiary", async function () {
            await moveTime(5356800) // 62 days
            await expect(
                 deployer.stakeManager.addBeneficiary(
                    alice.address,
                    stake1
                )
            ).to.emit(stakeManager, "BeneficiariesAdded")
        })
        it("reverts when stake-is-greater than 1B", async () => {
            await moveTime(1000)
            const stake3 = 600000000
            const stake4 = 500000000
            const tx1: ContractTransaction = await deployer.stakeManager.addBeneficiary(
                bob.address,
                stake3
            )
            await tx1.wait()
            await expect(
                deployer.stakeManager.addBeneficiary(charlie.address, stake4)
            ).to.be.revertedWith(
                "StakeManager__StakeLimitExceeded()"
            )
        })
        it("reverts stake is zero", async () => {
            const stake5 = 0
            await moveTime(1000)
            await expect(
                deployer.stakeManager.addBeneficiary(bob.address, stake5)
            ).to.be.revertedWith("StakeManager__StakeIsZero()")
        })
        it("reverts when beneficiary is added outside the update window", async () => {
            const stake5 = 1000000
            await moveTime(2592005)
            await expect(
                deployer.stakeManager.addBeneficiary(bob.address, stake5)
            ).to.be.revertedWith("StakeManager__ContractUpdateWindowIsNotOpen()")
        })
    })
    describe("Updating existing stakeholders and their stakes", function () {
        it("allows only manager to update-stake", async () => {
            await moveTime(10)
            const tx1: ContractTransaction = await deployer.stakeManager.addBeneficiary(
                alice.address,
                stake1
            )
            await tx1.wait()

            await expect(
                bob.stakeManager.updateBeneficiariesStake(
                    alice.address,
                    stake1
                )
            ).to.be.revertedWith("AccessControl")
        })
        it("updates_equities", async () => {
            await moveTime(1000)
            const trans1: ContractTransaction = await deployer.stakeManager.addBeneficiary(
                alice.address,
                stake1
            )
            await trans1.wait()
            await moveTime(5356800) // 62 days
            const trans2: ContractTransaction = await deployer.stakeManager.updateBeneficiariesStake(
                alice.address,
                stake1
            )
            await trans2.wait()
            stake1 = 2 * stake1

            const stakeholder = await stakeManager.getBeneficiariesAddresses()
            const equity = stakeholder[1].toString()

            assert.equal(equity, stake1.toString())
        })
        it("emits StakeHolderStakeIncreased event", async () => {
            await moveTime(1000)
            await deployer.stakeManager.addBeneficiary(
                bob.address,
                stake1
            )
            await moveTime(5356800) // 62 days
            await expect(
                 stakeManager.updateBeneficiariesStake(
                    bob.address,
                    stake1
                )
            ).to.emit(stakeManager, "BeneficiaryStakeIncreased")
        })
    })
    describe("Fund Distribution", function () {
        it("distributes fund", async () => {
            const trx1: ContractTransaction = await deployer.signer.sendTransaction({
                from: deployer.address,
                to: stakeManager.address,
                value: fundsToShareInWei,
            })
            await trx1.wait()
            const stake3 = 500 * 10 ** 6 //50000000
            await moveTime(1000)
            const trx2: ContractTransaction = await stakeManager.addBeneficiary(
                alice.address,
                stake3
            )
            await trx2.wait()

            var startingBalance = await (
                await alice.signer.getBalance()
            ).toString()
            startingBalance = ethers.utils
                .formatEther(startingBalance)
                .toString()

            await moveTime(2595010)
            const trx3: ContractTransaction = await deployer.stakeManager.distributeFunds()
            await trx3.wait()

            var endingBalance = await (
                await alice.signer.getBalance()
            ).toString()
            endingBalance = ethers.utils
                .formatEther(endingBalance)
                .toString()
            const bal = Number(endingBalance) - Number(startingBalance)
            const sharedFund =
                (stake3 * fundsToShareInEth) / (10 ** 9)
            assert.equal(sharedFund, bal)
        })
        it("allows anyone to distribute fund", async () => {
            const trx1: ContractTransaction = await deployer.signer.sendTransaction({
                from: deployer.address,
                to: stakeManager.address,
                value: fundsToShareInWei,
            })
            await trx1.wait()
            const stake3 = 500 * 10 ** 6 //50000000
            await moveTime(1000)
            const trx2: ContractTransaction = await stakeManager.addBeneficiary(
                alice.address,
                stake3
            )
            await trx2.wait()

            var startingBalance = await (
                await alice.signer.getBalance()
            ).toString()
            startingBalance = ethers.utils
                .formatEther(startingBalance)
                .toString()

            await moveTime(2595010)
            const trx3: ContractTransaction = await bob.stakeManager.distributeFunds()
            await trx3.wait()

            var endingBalance = await (
                await alice.signer.getBalance()
            ).toString()
            endingBalance = ethers.utils
                .formatEther(endingBalance)
                .toString()
            const bal = Number(endingBalance) - Number(startingBalance)
            const sharedFund =
                (stake3 * fundsToShareInEth) / (10 ** 9)
            assert.equal(sharedFund, bal)
        })
        it("emits FundsDistributed event", async () => {
            const trx1: ContractTransaction = await deployer.signer.sendTransaction({
                from: deployer.address,
                to: stakeManager.address,
                value: fundsToShareInWei,
            })
            await trx1.wait()
            const stake3 = 50 * 10 ** 6 //50000000
            await moveTime(10100)
            const trx2: ContractTransaction = await deployer.stakeManager.addBeneficiary(
                alice.address,
                stake3
            )
            await trx2.wait()

            await moveTime(2595000)

            await expect(deployer.stakeManager.distributeFunds()).to.emit(
                stakeManager,
                "FundsDistributed"
            )
        })
        it("can confirm whether an address is a beneficiary", async () => {
            await moveTime(1000)
            const holderBob: boolean = await stakeManager.isABeneficiary(bob.address)
            assert.equal(holderBob, false)
            
            const trx1: ContractTransaction = await deployer.stakeManager.addBeneficiary(
                alice.address,
                stake1
            )
            await trx1.wait()
            const holderAlice: boolean = await stakeManager.isABeneficiary(alice.address)
            assert.equal(holderAlice, true)
        })
    })
})


