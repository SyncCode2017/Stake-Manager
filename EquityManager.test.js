const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} = require("./helper-hardhat-config")
//const { keccak256 } = require("keccak256")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Equity Manager Unit Tests", function () {
          let deployer,
              accounts,
              manager,
              i3Account,
              stakeholder1,
              stakeholder2,
              stakeholder3,
              stakeholder4,
              fundsToShare,
              stake1,
              stake2

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              const chainId = network.config.chainId
              deployer = accounts[0] //await getNamedAccounts()
              manager = accounts[0]
              i3Account = accounts[1]
              stakeholder1 = accounts[2]
              stakeholder2 = accounts[3]
              stakeholder3 = accounts[4]
              stakeholder4 = accounts[5]
              stake1 = ethers.BigNumber.toString(0.1)
              stake2 = ethers.BigNumber.toString(0.05) //ethers.utils.parseEther("0.05")
              const args = [
                  i3Account.address,
                  networkConfig[chainId]["equityInterval"],
              ]

              await deployments.fixture(["all"], { args: args })
              equityManagerContract = await ethers.getContract("EquityManager")
              equityManager = equityManagerContract.connect(deployer)
              fundsToShare = ethers.utils.parseEther("100")
          })

          describe("constructor", function () {
              it("intitiallizes the interval correctly", async () => {
                  const interval = (
                      await equityManager.intervalMilliseconds()
                  ).toString()
                  assert.equal(interval, "10000")
              })
              it("intitiallizes the impact3 account correctly", async () => {
                  const impact3Account = (
                      await equityManager.impact3FundAddress()
                  ).toString()
                  assert.equal(impact3Account, i3Account.address)
              })
          })
          describe("stakeholders and their stakes", function () {
              it("allows only manager role to add stakeholder", async () => {
                  const equityManagerConnected =
                      equityManagerContract.connect(stakeholder1)

                  await expect(
                      equityManagerConnected.addHolder(
                          stakeholder1.address,
                          stake1
                      )
                  ).to.be.revertedWith("AccessControl")
              })
              it("can add stakeholders addHolder", async () => {
                  const trans = await equityManager.addHolder(
                      stakeholder1.address,
                      stake1
                  )
                  await trans.wait(1)
                  const stakeholder = await equityManager.currentStakeHolders()
                  const holder = stakeholder[0].toString()
                  assert.equal(holder, stakeholder1.address)
              })
              it("emits an event after adding stakeholder", async function () {
                  expect(
                      await equityManager.addHolder(
                          stakeholder1.address,
                          stake1
                      )
                  ).to.emit("NewStakeHolderAdded")
              })
              it("reverts when stake-is-greater than 100", async () => {
                  const stake3 = ethers.BigNumber.from(60) //ethers.utils.parseEther("60")
                  const stake4 = ethers.BigNumber.from(50)
                  await equityManager.addStakeHolder(
                      stakeholder3.address,
                      stake3
                  )

                  await expect(
                      equityManager.addStakeHolder(stakeholder4.address, stake4)
                  ).to.be.revertedWith(
                      "EquityManager__TotalValueGreaterThan100()"
                  )
              })
              it("reverts stake is zero", async () => {
                  const stake5 = ethers.utils.parseEther("0")

                  await expect(
                      equityManager.addStakeHolder(stakeholder4.address, stake5)
                  ).to.be.revertedWith("EquityManager__StakeIsZero()")
              })
          })
          describe("Funds distribution", function () {
              it("only pauser_role can pause the contract", async () => {
                  const equityManagerConnected =
                      equityManagerContract.connect(stakeholder2)

                  await expect(
                      equityManagerConnected.pause()
                  ).to.be.revertedWith("AccessControl")
              })
              it("only pauser_role can unpause the contract", async () => {
                  await equityManager.pause()
                  const equityManagerConnected =
                      equityManagerContract.connect(stakeholder1)

                  await expect(
                      equityManagerConnected.unpause()
                  ).to.be.revertedWith("AccessControl")
              })
              it("can receive fund", async () => {
                  const equityManagerConnected =
                      equityManagerContract.connect(stakeholder2)
                  await equityManagerConnected.deposit({
                      value: fundsToShare,
                  })
                  const response = await equityManager.contractBalance()
                  assert.equal(response.toString(), fundsToShare.toString())
              })
              it("emits fund_received event", async function () {
                  const equityManagerConnected =
                      equityManagerContract.connect(stakeholder3)
                  expect(
                      await equityManagerConnected.deposit({
                          value: fundsToShare,
                      })
                  ).to.emit("FundsReceived")
              })
              it("cannot distribute fund when paused", async () => {
                  await equityManager.pause()
                  const equityManagerConnected =
                      equityManagerContract.connect(stakeholder2)
                  await equityManagerConnected.deposit({
                      value: fundsToShare,
                  })
                  await expect(
                      equityManager.distributeFunds()
                  ).to.be.revertedWith("Pausable: paused")
              })
              it("can distribute_fund", async () => {
                  //await equityManager.unpause()
                  const stake3 = ethers.utils.parseEther("1")
                  const stake4 = ethers.utils.parseEther("0.5")
                  const equityManagerConnected =
                      equityManagerContract.connect(stakeholder2)
                  const trans = await equityManagerConnected.deposit({
                      value: fundsToShare,
                  })
                  await trans.wait(1)
                  const startingBalance = await equityManager.contractBalance()
                  const tx1 = await equityManager.addHolder(
                      stakeholder1.address,
                      stake1
                  )
                  await tx1.wait(1)
                  const tx2 = await equityManager.addHolder(
                      stakeholder2.address,
                      stake2
                  )
                  await tx2.wait(1)
                  const tx3 = await equityManager.addHolder(
                      stakeholder3.address,
                      stake3
                  )
                  await tx3.wait(1)
                  const tx4 = await equityManager.addHolder(
                      stakeholder4.address,
                      stake4
                  )
                  await tx4.wait(1)
                  const trans2 = await equityManager.distributeFunds()
                  await trans2.wait()
                  const endingBalance = await equityManager.contractBalance()
                  const diff = startingBalance.sub(fundsToShare)
                  assert.equal(endingBalance.toString(), "0")
                  assert.equal(diff, "0")
              })
          })
      })
