/* Autogenerated file. Do not edit manually. */

/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/consistent-type-imports */

/*
  Fuels version: 0.97.2
*/

import { ContractFactory, decompressBytecode } from "fuels";
import type { Provider, Account, DeployContractOptions } from "fuels";

import { Prytain } from "./Prytain";

const bytecode = decompressBytecode("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");

export class PrytainFactory extends ContractFactory<Prytain> {

  static readonly bytecode = bytecode;

  constructor(accountOrProvider: Account | Provider) {
    super(
      bytecode,
      Prytain.abi,
      accountOrProvider,
      Prytain.storageSlots
    );
  }

  static deploy (
    wallet: Account,
    options: DeployContractOptions = {}
  ) {
    const factory = new PrytainFactory(wallet);
    return factory.deploy(options);
  }
}
