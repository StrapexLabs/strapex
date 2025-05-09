const abi = [
  {
    type: "impl",
    name: "IStrapexFactory",
    interface_name: "contract_strapex::strapex_factory::IStrapexFactory",
  },
  {
    type: "interface",
    name: "contract_strapex::strapex_factory::IStrapexFactory",
    items: [
      {
        type: "function",
        name: "create_strapex_contract",
        inputs: [],
        outputs: [
          {
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "updateStrapexChildHash",
        inputs: [
          {
            name: "newClasHash",
            type: "core::starknet::class_hash::ClassHash",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "getStrapexAccountsNumber",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u128",
          },
        ],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "getUserStrapexAccount",
        inputs: [
          {
            name: "userAddress",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [
          {
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "get_owner",
        inputs: [],
        outputs: [
          {
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "get_childClassHash",
        inputs: [],
        outputs: [
          {
            type: "core::starknet::class_hash::ClassHash",
          },
        ],
        state_mutability: "view",
      },
    ],
  },
  {
    type: "impl",
    name: "OwnableImpl",
    interface_name: "contract_strapex::ownership_component::IOwnable",
  },
  {
    type: "interface",
    name: "contract_strapex::ownership_component::IOwnable",
    items: [
      {
        type: "function",
        name: "owner",
        inputs: [],
        outputs: [
          {
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "transfer_ownership",
        inputs: [
          {
            name: "new_owner",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "renounce_ownership",
        inputs: [],
        outputs: [],
        state_mutability: "external",
      },
    ],
  },
  {
    type: "constructor",
    name: "constructor",
    inputs: [
      {
        name: "_owner",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
  },
  {
    type: "event",
    name: "contract_strapex::ownership_component::ownable_component::OwnershipTransferred",
    kind: "struct",
    members: [
      {
        name: "previous_owner",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "data",
      },
      {
        name: "new_owner",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "data",
      },
    ],
  },
  {
    type: "event",
    name: "contract_strapex::ownership_component::ownable_component::Event",
    kind: "enum",
    variants: [
      {
        name: "OwnershipTransferred",
        type: "contract_strapex::ownership_component::ownable_component::OwnershipTransferred",
        kind: "nested",
      },
    ],
  },
  {
    type: "event",
    name: "contract_strapex::strapex_factory::strapex_factory::HashUpdated",
    kind: "struct",
    members: [
      {
        name: "by",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key",
      },
      {
        name: "oldHash",
        type: "core::starknet::class_hash::ClassHash",
        kind: "key",
      },
      {
        name: "newHash",
        type: "core::starknet::class_hash::ClassHash",
        kind: "key",
      },
    ],
  },
  {
    type: "event",
    name: "contract_strapex::strapex_factory::strapex_factory::Event",
    kind: "enum",
    variants: [
      {
        name: "OwnableEvent",
        type: "contract_strapex::ownership_component::ownable_component::Event",
        kind: "nested",
      },
      {
        name: "HashUpdated",
        type: "contract_strapex::strapex_factory::strapex_factory::HashUpdated",
        kind: "nested",
      },
    ],
  },
] as const;

export default abi;
