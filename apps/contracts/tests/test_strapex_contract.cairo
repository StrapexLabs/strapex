// *************************************************************************
//                              FACTORY TEST
// *************************************************************************

use starknet::{ClassHash, ContractAddress, contract_address_const, get_caller_address};

use snforge_std::{
    declare, start_cheat_caller_address, stop_cheat_caller_address, start_cheat_block_timestamp,
    ContractClassTrait, DeclareResultTrait, spy_events, EventSpyAssertionsTrait,
};

use contract_strapex::interfaces::{
    IStrapexFactoryDispatcher, IStrapexFactoryDispatcherTrait, IStrapexDispatcher,
    IStrapexDispatcherTrait,
};

use contract_strapex::strapex_contract::StrapexContract::{Event, Deposit, Withdraw, FeeCollection};

use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};

pub extern fn class_hash_const<const address: felt252>() -> ClassHash nopanic;
pub(crate) extern fn class_hash_to_felt252(address: ClassHash) -> felt252 nopanic;

const USER: felt252 = 'USER';
const OWNER: felt252 = 'OWNER';
const MANAGER: felt252 = 'MANAGER';
const INITIAL_SUPPLY: u256 = 1000000;
const TOKEN: felt252 = 'TOKEN';
const SYMBOL: felt252 = 'TT';


// *************************************************************************
//                              SETUP
// *************************************************************************
fn deploy_factory() -> (ContractAddress, ContractAddress, IStrapexDispatcher, ContractAddress) {
    // Deploy test token first
    let test_token_class = declare("TestToken").unwrap().contract_class();
    let user: ContractAddress = contract_address_const::<USER>();
    let constructor_calldata = array![
        TOKEN, SYMBOL, INITIAL_SUPPLY.try_into().unwrap(), user.into(),
    ];
    let (token_address, _) = test_token_class.deploy(@constructor_calldata).unwrap();

    // Deploy factory with test token
    let factory_class_hash = declare("StrapexFactory").unwrap().contract_class();
    let child_class_hash = declare("StrapexContract").unwrap().contract_class().class_hash;
    let child_hash_felt: felt252 = class_hash_to_felt252(*child_class_hash);
    let constructor_data: Array<felt252> = array![
        user.into(), child_hash_felt, token_address.into(),
    ];
    let (factory_addr, _) = factory_class_hash.deploy(@constructor_data).unwrap();
    let factory_disp = IStrapexFactoryDispatcher { contract_address: factory_addr };

    start_cheat_caller_address(factory_addr, user);

    let child_addr = factory_disp.create_strapex_contract();
    let child_disp = IStrapexDispatcher { contract_address: child_addr };

    (child_addr, user, child_disp, token_address)
}

fn deposit_workflow(
    user: ContractAddress,
    child: ContractAddress,
    child_disp: IStrapexDispatcher,
    token: ContractAddress,
    amount: u256,
    id: u128,
    approve: u256,
) {
    let disp = IERC20Dispatcher { contract_address: token };

    start_cheat_caller_address(token, user);
    disp.approve(child, approve);
    stop_cheat_caller_address(token);

    start_cheat_caller_address(child, user);
    child_disp.deposit(id, amount);
    stop_cheat_caller_address(child);
}

// *************************************************************************
//                              TESTS
// *************************************************************************
#[test]
fn test_deposit() {
    let (strapex_contract_address, user_addr, strapex_contract_disp, token_address) =
        deploy_factory();
    let mut spy = spy_events();

    deposit_workflow(
        user_addr, strapex_contract_address, strapex_contract_disp, token_address, 1000, 100, 1000,
    );

    spy
        .assert_emitted(
            @array![
                (
                    strapex_contract_address,
                    Event::Deposit(
                        Deposit { id: 100, Amount: 1000, from: user_addr, token: token_address },
                    ),
                ),
            ],
        );
}

#[test]
#[should_panic(expected: 'u256_sub Overflow')]
fn test_deposit_no_approval() {
    let (strapex_contract_address, user_addr, strapex_contract_disp, _) = deploy_factory();

    start_cheat_caller_address(strapex_contract_address, user_addr);
    strapex_contract_disp.deposit(101, 1000);
}

#[test]
#[should_panic(expected: 'u256_sub Overflow')]
fn test_deposit_less_approval_than_amount() {
    let (strapex_contract_address, user_addr, strapex_contract_disp, token_address) =
        deploy_factory();

    deposit_workflow(
        user_addr, strapex_contract_address, strapex_contract_disp, token_address, 1000, 100, 100,
    );
}

#[test]
fn test_withdraw() {
    let (strapex_contract_address, user_addr, strapex_contract_disp, token_address) =
        deploy_factory();
    let mut spy = spy_events();

    deposit_workflow(
        user_addr, strapex_contract_address, strapex_contract_disp, token_address, 1000, 100, 1000,
    );

    start_cheat_caller_address(strapex_contract_address, user_addr);
    strapex_contract_disp.withdraw();

    spy
        .assert_emitted(
            @array![(strapex_contract_address, Event::Withdraw(Withdraw { Amount: 500 }))],
        );

    spy
        .assert_emitted(
            @array![
                (strapex_contract_address, Event::FeeCollection(FeeCollection { Amount: 500 })),
            ],
        );
}

#[test]
#[should_panic(expected: 'UnAuthorized caller')]
fn test_withdraw_unauthorized() {
    let (_, _, strapex_contract_disp, _) = deploy_factory();
    strapex_contract_disp.withdraw();
}

#[test]
fn test_withdraw_amount() {
    let (strapex_contract_address, user_addr, strapex_contract_disp, token_address) =
        deploy_factory();
    let mut spy = spy_events();

    deposit_workflow(
        user_addr, strapex_contract_address, strapex_contract_disp, token_address, 1000, 100, 1000,
    );

    start_cheat_caller_address(strapex_contract_address, user_addr);
    strapex_contract_disp.withdraw_amount(500);

    spy
        .assert_emitted(
            @array![(strapex_contract_address, Event::Withdraw(Withdraw { Amount: 250 }))],
        );

    spy
        .assert_emitted(
            @array![
                (strapex_contract_address, Event::FeeCollection(FeeCollection { Amount: 250 })),
            ],
        );
}

#[test]
#[should_panic(expected: 'Insufficient balance')]
fn test_withdraw_amount_more_than_deposited() {
    let (strapex_contract_address, user_addr, strapex_contract_disp, token_address) =
        deploy_factory();

    deposit_workflow(
        user_addr, strapex_contract_address, strapex_contract_disp, token_address, 1000, 100, 1000,
    );

    start_cheat_caller_address(strapex_contract_address, user_addr);
    strapex_contract_disp.withdraw_amount(1100);
}

#[test]
#[should_panic(expected: 'UnAuthorized caller')]
fn test_withdraw_amount_unauthorized() {
    let (strapex_contract_address, user_addr, strapex_contract_disp, token_address) =
        deploy_factory();

    deposit_workflow(
        user_addr, strapex_contract_address, strapex_contract_disp, token_address, 1000, 100, 1000,
    );

    strapex_contract_disp.withdraw_amount(1100);
}
