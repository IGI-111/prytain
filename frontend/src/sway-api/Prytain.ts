/* Autogenerated file. Do not edit manually. */

/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/consistent-type-imports */

/*
  Fuels version: 0.97.2
*/

import { Contract, Interface } from "fuels";
import type {
  Provider,
  Account,
  StorageSlot,
  AbstractAddress,
  BigNumberish,
  BN,
  FunctionFragment,
  InvokeFunction,
  StrSlice,
} from 'fuels';

import type { Option, Enum, Vec } from "./common";

export type OrderInput = Enum<{ Goto: [BigNumberish, BigNumberish] }>;
export type OrderOutput = Enum<{ Goto: [number, number] }>;

const abi = {
  "encoding": "1",
  "types": [
    {
      "typeId": 0,
      "type": "()",
      "components": [],
      "typeParameters": null
    },
    {
      "typeId": 1,
      "type": "(_, _)",
      "components": [
        {
          "name": "__tuple_element",
          "type": 11,
          "typeArguments": null
        },
        {
          "name": "__tuple_element",
          "type": 11,
          "typeArguments": null
        }
      ],
      "typeParameters": null
    },
    {
      "typeId": 2,
      "type": "[_; 4]",
      "components": [
        {
          "name": "__array_element",
          "type": 13,
          "typeArguments": null
        }
      ],
      "typeParameters": null
    },
    {
      "typeId": 3,
      "type": "bool",
      "components": null,
      "typeParameters": null
    },
    {
      "typeId": 4,
      "type": "enum Option",
      "components": [
        {
          "name": "None",
          "type": 0,
          "typeArguments": null
        },
        {
          "name": "Some",
          "type": 6,
          "typeArguments": null
        }
      ],
      "typeParameters": [
        6
      ]
    },
    {
      "typeId": 5,
      "type": "enum Order",
      "components": [
        {
          "name": "Goto",
          "type": 1,
          "typeArguments": null
        }
      ],
      "typeParameters": null
    },
    {
      "typeId": 6,
      "type": "generic T",
      "components": null,
      "typeParameters": null
    },
    {
      "typeId": 7,
      "type": "raw untyped ptr",
      "components": null,
      "typeParameters": null
    },
    {
      "typeId": 8,
      "type": "str",
      "components": null,
      "typeParameters": null
    },
    {
      "typeId": 9,
      "type": "struct RawVec",
      "components": [
        {
          "name": "ptr",
          "type": 7,
          "typeArguments": null
        },
        {
          "name": "cap",
          "type": 12,
          "typeArguments": null
        }
      ],
      "typeParameters": [
        6
      ]
    },
    {
      "typeId": 10,
      "type": "struct std::vec::Vec",
      "components": [
        {
          "name": "buf",
          "type": 9,
          "typeArguments": [
            {
              "name": "",
              "type": 6,
              "typeArguments": null
            }
          ]
        },
        {
          "name": "len",
          "type": 12,
          "typeArguments": null
        }
      ],
      "typeParameters": [
        6
      ]
    },
    {
      "typeId": 11,
      "type": "u32",
      "components": null,
      "typeParameters": null
    },
    {
      "typeId": 12,
      "type": "u64",
      "components": null,
      "typeParameters": null
    },
    {
      "typeId": 13,
      "type": "u8",
      "components": null,
      "typeParameters": null
    }
  ],
  "functions": [
    {
      "inputs": [
        {
          "name": "item",
          "type": 13,
          "typeArguments": null
        },
        {
          "name": "amount",
          "type": 13,
          "typeArguments": null
        }
      ],
      "name": "buy_item",
      "output": {
        "name": "",
        "type": 0,
        "typeArguments": null
      },
      "attributes": [
        {
          "name": "storage",
          "arguments": [
            "read",
            "write"
          ]
        }
      ]
    },
    {
      "inputs": [
        {
          "name": "coords",
          "type": 10,
          "typeArguments": [
            {
              "name": "",
              "type": 1,
              "typeArguments": null
            }
          ]
        }
      ],
      "name": "check_islands",
      "output": {
        "name": "",
        "type": 10,
        "typeArguments": [
          {
            "name": "",
            "type": 3,
            "typeArguments": null
          }
        ]
      },
      "attributes": null
    },
    {
      "inputs": [],
      "name": "disembark",
      "output": {
        "name": "",
        "type": 0,
        "typeArguments": null
      },
      "attributes": [
        {
          "name": "storage",
          "arguments": [
            "read",
            "write"
          ]
        }
      ]
    },
    {
      "inputs": [
        {
          "name": "order",
          "type": 5,
          "typeArguments": null
        }
      ],
      "name": "embark",
      "output": {
        "name": "",
        "type": 0,
        "typeArguments": null
      },
      "attributes": [
        {
          "name": "storage",
          "arguments": [
            "read",
            "write"
          ]
        }
      ]
    },
    {
      "inputs": [
        {
          "name": "x",
          "type": 11,
          "typeArguments": null
        },
        {
          "name": "y",
          "type": 11,
          "typeArguments": null
        }
      ],
      "name": "island_prices",
      "output": {
        "name": "",
        "type": 4,
        "typeArguments": [
          {
            "name": "",
            "type": 2,
            "typeArguments": null
          }
        ]
      },
      "attributes": [
        {
          "name": "storage",
          "arguments": [
            "read"
          ]
        }
      ]
    },
    {
      "inputs": [
        {
          "name": "item",
          "type": 13,
          "typeArguments": null
        },
        {
          "name": "amount",
          "type": 13,
          "typeArguments": null
        }
      ],
      "name": "sell_item",
      "output": {
        "name": "",
        "type": 0,
        "typeArguments": null
      },
      "attributes": [
        {
          "name": "storage",
          "arguments": [
            "read",
            "write"
          ]
        }
      ]
    },
    {
      "inputs": [
        {
          "name": "x",
          "type": 11,
          "typeArguments": null
        },
        {
          "name": "y",
          "type": 11,
          "typeArguments": null
        }
      ],
      "name": "spawn",
      "output": {
        "name": "",
        "type": 0,
        "typeArguments": null
      },
      "attributes": [
        {
          "name": "storage",
          "arguments": [
            "read",
            "write"
          ]
        }
      ]
    }
  ],
  "loggedTypes": [
    {
      "logId": "10098701174489624218",
      "loggedType": {
        "name": "",
        "type": 8,
        "typeArguments": null
      }
    }
  ],
  "messagesTypes": [],
  "configurables": []
};

const storageSlots: StorageSlot[] = [];

export class PrytainInterface extends Interface {
  constructor() {
    super(abi);
  }

  declare functions: {
    buy_item: FunctionFragment;
    check_islands: FunctionFragment;
    disembark: FunctionFragment;
    embark: FunctionFragment;
    island_prices: FunctionFragment;
    sell_item: FunctionFragment;
    spawn: FunctionFragment;
  };
}

export class Prytain extends Contract {
  static readonly abi = abi;
  static readonly storageSlots = storageSlots;

  declare interface: PrytainInterface;
  declare functions: {
    buy_item: InvokeFunction<[item: BigNumberish, amount: BigNumberish], void>;
    check_islands: InvokeFunction<[coords: Vec<[BigNumberish, BigNumberish]>], Vec<boolean>>;
    disembark: InvokeFunction<[], void>;
    embark: InvokeFunction<[order: OrderInput], void>;
    island_prices: InvokeFunction<[x: BigNumberish, y: BigNumberish], Option<[number, number, number, number]>>;
    sell_item: InvokeFunction<[item: BigNumberish, amount: BigNumberish], void>;
    spawn: InvokeFunction<[x: BigNumberish, y: BigNumberish], void>;
  };

  constructor(
    id: string | AbstractAddress,
    accountOrProvider: Account | Provider,
  ) {
    super(id, abi, accountOrProvider);
  }
}
