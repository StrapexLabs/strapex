export const escrowABI = [
  {
    type: "impl",
    name: "escrowImpl",
    interface_name: "escrow::escrow::escrowTrait",
  },
  {
    type: "interface",
    name: "escrow::escrow::escrowTrait",
    items: [
      {
        type: "function",
        name: "deposit",
        inputs: [
          { name: "_amount", type: "core::integer::u128" },
          {
            name: "freelancer",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "withdraw",
        inputs: [{ name: "dealId", type: "core::integer::u128" }],
        outputs: [],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "release_funds",
        inputs: [{ name: "dealId", type: "core::integer::u128" }],
        outputs: [],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "get_balance",
        inputs: [],
        outputs: [{ type: "core::integer::u128" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "get_owner",
        inputs: [],
        outputs: [
          { type: "core::starknet::contract_address::ContractAddress" },
        ],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "get_token",
        inputs: [],
        outputs: [
          { type: "core::starknet::contract_address::ContractAddress" },
        ],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "get_deal_freelancer",
        inputs: [{ name: "dealId", type: "core::integer::u128" }],
        outputs: [
          { type: "core::starknet::contract_address::ContractAddress" },
        ],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "get_deal_client",
        inputs: [{ name: "dealId", type: "core::integer::u128" }],
        outputs: [
          { type: "core::starknet::contract_address::ContractAddress" },
        ],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "get_deal_amount",
        inputs: [{ name: "dealId", type: "core::integer::u128" }],
        outputs: [{ type: "core::integer::u128" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "get_dealId",
        inputs: [],
        outputs: [{ type: "core::integer::u128" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "get_deals_balance",
        inputs: [],
        outputs: [{ type: "core::integer::u128" }],
        state_mutability: "view",
      },
    ],
  },
  {
    type: "impl",
    name: "OwnableImpl",
    interface_name: "escrow::ownership_component::IOwnable",
  },
  {
    type: "interface",
    name: "escrow::ownership_component::IOwnable",
    items: [
      {
        type: "function",
        name: "owner",
        inputs: [],
        outputs: [
          { type: "core::starknet::contract_address::ContractAddress" },
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
        name: "_arbiter",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        name: "_token",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
  },
  {
    type: "event",
    name: "escrow::escrow::escrow::Deposit",
    kind: "struct",
    members: [
      {
        name: "from",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key",
      },
      { name: "Amount", type: "core::integer::u128", kind: "key" },
      { name: "dealId", type: "core::integer::u128", kind: "key" },
    ],
  },
  {
    type: "event",
    name: "escrow::escrow::escrow::Withdraw",
    kind: "struct",
    members: [
      {
        name: "to",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key",
      },
      { name: "Amount", type: "core::integer::u128", kind: "key" },
      { name: "ActualAmount", type: "core::integer::u128", kind: "key" },
    ],
  },
  {
    type: "event",
    name: "escrow::escrow::escrow::ReleaseFunds",
    kind: "struct",
    members: [
      {
        name: "to",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key",
      },
      { name: "Amount", type: "core::integer::u128", kind: "key" },
    ],
  },
  {
    type: "event",
    name: "escrow::escrow::escrow::PaidProcessingFee",
    kind: "struct",
    members: [
      {
        name: "from",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key",
      },
      { name: "Amount", type: "core::integer::u128", kind: "key" },
    ],
  },
  {
    type: "event",
    name: "escrow::ownership_component::ownable_component::OwnershipTransferred",
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
    name: "escrow::ownership_component::ownable_component::Event",
    kind: "enum",
    variants: [
      {
        name: "OwnershipTransferred",
        type: "escrow::ownership_component::ownable_component::OwnershipTransferred",
        kind: "nested",
      },
    ],
  },
  {
    type: "event",
    name: "escrow::escrow::escrow::Event",
    kind: "enum",
    variants: [
      {
        name: "Deposit",
        type: "escrow::escrow::escrow::Deposit",
        kind: "nested",
      },
      {
        name: "Withdraw",
        type: "escrow::escrow::escrow::Withdraw",
        kind: "nested",
      },
      {
        name: "ReleaseFunds",
        type: "escrow::escrow::escrow::ReleaseFunds",
        kind: "nested",
      },
      {
        name: "PaidProcessingFee",
        type: "escrow::escrow::escrow::PaidProcessingFee",
        kind: "nested",
      },
      {
        name: "OwnableEvent",
        type: "escrow::ownership_component::ownable_component::Event",
        kind: "nested",
      },
    ],
  },
] as const;
