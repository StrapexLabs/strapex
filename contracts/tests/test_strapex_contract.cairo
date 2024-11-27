use starknet::{ClassHash, ContractAddress, contract_address_const, get_caller_address};

use snforge_std::{
    declare, start_cheat_caller_address, start_cheat_block_timestamp, ContractClassTrait,
    DeclareResultTrait, spy_events, EventSpyAssertionsTrait
};

use contract_strapex::strapex_factory::{
    IStrapexFactory, IStrapexFactoryDispatcher, IStrapexFactoryDispatcherTrait
};

use contract_strapex::strapex_contract::{
    IStrapex, IStrapexDispatcher, IStrapexDispatcherTrait
};

use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};

pub extern fn class_hash_const<const address: felt252>() -> ClassHash nopanic;
pub(crate) extern fn class_hash_to_felt252(address: ClassHash) -> felt252 nopanic;

const USER: felt252 = 'USER';
const OWNER: felt252 = 'OWNER';
const MANAGER: felt252 = 'MANAGER';

fn deploy_factory() -> (ContractAddress,ContractAddress, IStrapexDispatcher)  {

    let token: ContractAddress = 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
        .try_into()
        .unwrap();
    let user:ContractAddress = 0x0590e76a2e65435b7288bf3526cfa5c3ec7748d2f3433a934c931cce62460fc5
        .try_into()
        .unwrap();
    let token_felt: felt252 = token.into();
    let user_felt: felt252 = user.into();

    let factory_class_hash = declare("StrapexFactory").unwrap().contract_class();
    let child_class_hash = declare("StrapexContract").unwrap().contract_class().class_hash;
    let child_hash_felt: felt252 = class_hash_to_felt252(*child_class_hash);
    let constructor_data: Array<felt252> = array![
        user_felt, child_hash_felt, token_felt
    ];
    let (factory_addr, _) = factory_class_hash.deploy(@constructor_data).unwrap();
    let factory_disp = IStrapexFactoryDispatcher {
        contract_address: factory_addr
    };

    start_cheat_caller_address(factory_addr, user);

    let child_addr = factory_disp.create_strapex_contract();
    let child_disp = IStrapexDispatcher {
        contract_address: child_addr
    };

    (child_addr, user, child_disp)
}

fn approve_child_contract(child: ContractAddress, amount: u256) {

    let token: ContractAddress = 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
        .try_into()
        .unwrap();

    let user:ContractAddress = 0x0590e76a2e65435b7288bf3526cfa5c3ec7748d2f3433a934c931cce62460fc5
        .try_into()
        .unwrap();

    let disp = IERC20Dispatcher { contract_address: token };

    start_cheat_caller_address(token, user);
    let res: bool = disp.approve(child, amount);
    assert(res, 'Approval failed');
}

#[test]
#[fork(url: "https://starknet-sepolia.public.blastapi.io/rpc/v0_7", block_tag: latest)]
fn test_deposit() {
    let (strapex_contract_address, user_addr, strapex_contract_disp) = deploy_factory();
    approve_child_contract(strapex_contract_address, 10000);
    
    let id: u128 = 100;
    let amount: u256 = 1000;

    start_cheat_caller_address(strapex_contract_address, user_addr);

    strapex_contract_disp.deposit(id, amount);
}

#[test]
#[fork(url: "https://starknet-sepolia.public.blastapi.io/rpc/v0_7", block_tag: latest)]
fn test_withdraw() {
    let (strapex_contract_address, user_addr, strapex_contract_disp) = deploy_factory();
    approve_child_contract(strapex_contract_address, 10000);

    start_cheat_caller_address(strapex_contract_address, user_addr);

    strapex_contract_disp.withdraw();
}

#[test]
#[fork(url: "https://starknet-sepolia.public.blastapi.io/rpc/v0_7", block_tag: latest)]
fn test_withdraw_amount() {
    let (strapex_contract_address, user_addr, strapex_contract_disp) = deploy_factory();
    approve_child_contract(strapex_contract_address, 10000);

    let amount: u256 = 500;

    start_cheat_caller_address(strapex_contract_address, user_addr);

    strapex_contract_disp.deposit(100, amount);

    strapex_contract_disp.withdraw_amount(amount - 10);
}