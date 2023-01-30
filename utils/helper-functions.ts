import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { BigNumber, Contract, ContractTransaction,  Transaction } from "ethers"
import { getContractAddress, Interface, Result } from "ethers/lib/utils"
import { run, ethers } from "hardhat"
import { HardhatRuntimeEnvironment, Network } from "hardhat/types"
import { StakeManager } from "../typechain-types"


export const setupUsers = async <ContractTypeArray extends {[contractName: string] : Contract}>(
    addresses: string[],
    contracts: ContractTypeArray
): Promise<({address: string, signer: SignerWithAddress} & ContractTypeArray)[]> => {
    const users: ({address: string, signer: SignerWithAddress} & ContractTypeArray)[] = []
    for (const address of addresses) {
        users.push(await setupUser(address, contracts))
    }
    return users
}


export const setupUser = async <ContractTypeArray extends {[contractName: string]: Contract}>(
    address: string,
    contracts: ContractTypeArray
): Promise<{address: string, signer: SignerWithAddress} & ContractTypeArray> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = { address: address, signer: await ethers.getSigner(address) }
    for (const key of Object.keys(contracts)) {
        user[key] = contracts[key].connect(await ethers.getSigner(address))
    }
    return user as {address: string, signer: SignerWithAddress} & ContractTypeArray
}