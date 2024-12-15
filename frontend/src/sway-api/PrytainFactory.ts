/* Autogenerated file. Do not edit manually. */

/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/consistent-type-imports */

/*
  Fuels version: 0.96.1
*/

import { Contract, ContractFactory, decompressBytecode } from "fuels";
import type { Provider, Account, DeployContractOptions, DeployContractResult } from "fuels";

import { Prytain } from "./Prytain";

const bytecode = decompressBytecode("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");

export class PrytainFactory extends ContractFactory {

  static readonly bytecode = bytecode;

  constructor(accountOrProvider: Account | Provider) {
    super(bytecode, Prytain.abi, accountOrProvider);
  }

  override deploy<TContract extends Contract = Contract>(
    deployOptions?: DeployContractOptions
  ): Promise<DeployContractResult<TContract>> {
    return super.deploy({
      storageSlots: Prytain.storageSlots,
      ...deployOptions,
    });
  }

  static async deploy (
    wallet: Account,
    options: DeployContractOptions = {}
  ): Promise<DeployContractResult<Prytain>> {
    const factory = new PrytainFactory(wallet);
    return factory.deploy(options);
  }
}
