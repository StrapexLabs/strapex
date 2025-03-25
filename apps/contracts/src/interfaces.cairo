// *************************************************************************
//                              INTERFACES
// *************************************************************************

use starknet::{ContractAddress, ClassHash};

#[starknet::interface]
pub trait IStrapex<TContractState> {
    fn deposit(ref self: TContractState, id: u128, amount: u256);
    fn withdraw(ref self: TContractState);
    fn withdraw_amount(ref self: TContractState, amount: u256);
    fn set_fee(ref self: TContractState, new_fee: u256);
    fn get_fee_percentage(self: @TContractState) -> u256;
    fn collect_fees(ref self: TContractState);
    fn get_fees_to_collect(self: @TContractState) -> u256;
    fn get_manager(self: @TContractState) -> ContractAddress;
    fn refund(ref self: TContractState, tx_hash: felt252);
    fn refund_amount(ref self: TContractState, tx_hash: felt252, amount: u256);
    fn get_owner(self: @TContractState) -> ContractAddress;
    fn _transfer_ownership(ref self: TContractState, newOwner: ContractAddress);
    fn _renounce_ownership(ref self: TContractState);
}

#[starknet::interface]
pub trait IStrapexFactory<TContractState> {
    fn create_strapex_contract(ref self: TContractState) -> ContractAddress;
    fn updateStrapexChildHash(ref self: TContractState, newClassHash: ClassHash);
    fn updateDepositToken(ref self: TContractState, newDepositToken: ContractAddress);
    fn getStrapexAccountsNumber(self: @TContractState) -> u128;
    fn getUserStrapexAccount(
        self: @TContractState, userAddress: ContractAddress,
    ) -> ContractAddress;
    fn get_owner(self: @TContractState) -> ContractAddress;
    fn _transfer_ownership(ref self: TContractState, newOwner: ContractAddress);
    fn _renounce_ownership(ref self: TContractState);
    fn get_childClassHash(self: @TContractState) -> ClassHash;
}

#[starknet::interface]
pub trait IERC20<TContractState> {
    fn name(self: @TContractState) -> felt252;
    fn symbol(self: @TContractState) -> felt252;
    fn decimals(self: @TContractState) -> u8;
    fn total_supply(self: @TContractState) -> u256;
    fn balanceOf(self: @TContractState, account: ContractAddress) -> u256;
    fn allowance(self: @TContractState, owner: ContractAddress, spender: ContractAddress) -> u256;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transferFrom(
        ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256,
    ) -> bool;
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
}