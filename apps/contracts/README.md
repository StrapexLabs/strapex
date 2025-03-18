# Strapex Contracts Deployment Guide

This guide will walk you through the deployment process for the `Strapex` contracts on both the testnet (Sepolia-Juno) and mainnet using the Starkli CLI.

## Prerequisites
- Starkli CLI installed
- Access to a wallet (`deployer`) with accounts configured in Starkli
- Network RPC endpoints for testnet and mainnet

---

## Contract Addresses and File Paths

- **Factory Contract Address**: `0x03e171d9c4b93dde9a2b2c6658b56dc2b1bf43aad105e7685cb9974f01e13117`
- **Starkli Wallet Path**: `~/.starkli-wallets/deployer/`

## Linting
Make sure to use the following command to lint all Cairo files before raising a PR

#### Lint all Cairo files
```bash
scarb fmt
```

To check if all files are linted, run the following command. If there are any linting errors, it will be displayed in the terminal.

#### Check for linting errors
```bash
scarb fmt --check
```

### 0. Set your wallet locally
Please refer to the [Starknet documentation](https://docs.starknet.io/quick-start/set-up-an-account/#creating_a_keystore_file) to create a keystore file.


### 1. Declare Contracts on Sepolia-Juno Testnet
Use the following commands to declare the `StrapexFactory` and `StrapexChild` contracts.

#### Declare `StrapexFactory` Contract
```bash
starkli declare ./target/dev/contract_strapex_strapex_factory.contract_class.json \
  --account ~/.starkli-wallets/deployer/<your_account>.json \
  --rpc https://free-rpc.nethermind.io/sepolia-juno/ \
  --keystore ~/.starkli-wallets/deployer/<your_keystore>.json
```
#### Declare `StrapexChild` Contract
```bash
starkli declare ./target/dev/contract_strapex_strapex_contract.contract_class.json \
  --account ~/.starkli-wallets/deployer/<your_account>.json \
  --rpc https://free-rpc.nethermind.io/sepolia-juno/ \
  --keystore ~/.starkli-wallets/deployer/<your_keystore>.json
```

### 2. Deploy Contracts
Replace the following values with your own contract addresses and execute the command:

```bash
starkli deploy <factory_contract_address_class_hash> \
   <owner_address> \
  <child_class_hash> \
  <deposit_token> \
  --account ~/.starkli-wallets/deployer/<your_account>.json \
  --rpc https://free-rpc.nethermind.io/sepolia-juno/ \
  --keystore ~/.starkli-wallets/deployer/<your_keystore>.json
```
Constructor Parameters
Factory Contract Constructor:

owner: The contract’s owner address.
childHash: The class hash of the StrapexChild contract.
depositToken: The address of the token used for deposits.
StrapexChild Contract Constructor:

manager: The address of the contract manager.
_owner: The address of the owner.
_token: The token address.
