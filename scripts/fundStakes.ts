// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
// import { assert, expect } from "chai"
// import { BigNumber, FixedNumber } from "ethers"
// //@ts-ignore
// import { network, deployments, ethers } from "hardhat"
// import {
//     developmentChains,
//     networkConfig,
//     mngWindow,
//     updateInterval,
// } from "../helper-hardhat-config"
// //@ts-ignore
// //import { EquityManager } from "../../typechain-types"
// //@ts-ignore
// import { moveTime } from "../utils/move-time"
// import { moveBlocks } from "../utils/move-blocks"

// async function main() {
//     let deployer: SignerWithAddress
//     let accounts: SignerWithAddress[]
//     let manager: SignerWithAddress
//     let i3Account: SignerWithAddress
//     let stakeholder1: SignerWithAddress
//     let stakeholder2: SignerWithAddress
//     let stakeholder3: SignerWithAddress
//     let stakeholder4: SignerWithAddress
//     let fundsToShare: BigNumber
//     let stake1: number
//     let stake2: number
//     // let equityManagerContract: EquityManager
//     // let equityManager: EquityManager

//     accounts = await ethers.getSigners()
//     const chainId: number = network.config.chainId!
//     deployer = accounts[0] //await getNamedAccounts()
//     manager = accounts[0]
//     i3Account = accounts[1]
//     stakeholder1 = accounts[2]
//     stakeholder2 = accounts[3]
//     stakeholder3 = accounts[4]
//     stakeholder4 = accounts[5]
//     stake1 = 500000
//     stake2 = 200000 //ethers.BigNumber.from(0.05) //ethers.utils.parseEther("0.05")
//     //   const { deploy, log } = deployments
//     // const args: any[] = [
//     //     i3Account,
//     //     networkConfig[network.config.chainId!]["equityInterval"],
//     //     networkConfig[network.config.chainId!]["updateWindow"],
//     // ]
//     await deployments.fixture(["all"])
//     const equityManagerContract = await ethers.getContract("EquityManager")
//     const equityManager = equityManagerContract.connect(deployer)
//     fundsToShare = ethers.utils.parseEther("2000")

//     stakeholder1 = accounts[2]
//     //stake1 = 10000

//     // await moveTime(10100) //(updateInterval + 5)

//     // const trans = await equityManager.addStakeHolder(
//     //     stakeholder1.address,
//     //     stake1
//     // )
//     // //await moveBlocks(1)
//     // await trans.wait(1)
//     // const stakeholder: any[] = await equityManager.getStakeHolders()
//     // const holder = stakeholder[0].toString()
//     // //const stak = stakeholder[1].toString()
//     // console.log(`The newly added stakeholder: ${holder}`)

//     // const trx = await stakeholder3.sendTransaction({
//     //     from: stakeholder3.address,
//     //     to: equityManager.address,
//     //     value: fundsToShare,
//     // })

//     // await trx.wait(1)

//     // Distribute funds ////
//     const trx1 = await stakeholder3.sendTransaction({
//         from: stakeholder3.address,
//         to: equityManager.address,
//         value: fundsToShare,
//     })
//     await trx1.wait(1)
//     const stake3 = 50 * 10 ** 6 //50000000
//     await moveTime(10100)
//     await equityManager.addStakeHolder(stakeholder1.address, stake3)

//     var startingBalance = await (await stakeholder1.getBalance()).toString()
//     startingBalance = ethers.utils.formatEther(startingBalance).toString()

//     await moveTime(1000)
//     const trans1 = await equityManager.distributeFunds()
//     await trans1.wait(1)

//     var endingBalance = await (await stakeholder1.getBalance()).toString()
//     endingBalance = ethers.utils.formatEther(endingBalance).toString()
//     const bal = Number(endingBalance) - Number(startingBalance)
//     //const sharedFund = endingBalance - startingBalance
//     console.log(`The starting balance is ${startingBalance}`)
//     console.log(`The ending balance is ${endingBalance}`)
//     console.log(`The received amount is ${bal}`)
// }

// main()
//     .then(() => process.exit(0))
//     .catch((error) => {
//         console.error(error)
//         process.exit(1)
//     })
