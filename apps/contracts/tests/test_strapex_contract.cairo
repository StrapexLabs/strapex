// *************************************************************************
//                              IMPORTS
// *************************************************************************

use starknet::{ClassHash, ContractAddress, contract_address_const};

use snforge_std::{
    declare, start_cheat_caller_address, stop_cheat_caller_address,
    ContractClassTrait, DeclareResultTrait, spy_events, EventSpyAssertionsTrait, EventSpyTrait, EventsFilterTrait 
};

use contract_strapex::interfaces::{
    IStrapexFactoryDispatcher, IStrapexFactoryDispatcherTrait, IStrapexDispatcher,
    IStrapexDispatcherTrait,
};

use contract_strapex::strapex_contract::StrapexContract::{Event, Deposit, Withdraw, FeeCollection};

use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};

pub extern fn class_hash_const<const address: felt252>() -> ClassHash nopanic;
pub(crate) extern fn class_hash_to_felt252(address: ClassHash) -> felt252 nopanic;


// *************************************************************************
//                              ADDRESS DEFINITIONS
// *************************************************************************
fn OWNER() -> ContractAddress {
    contract_address_const::<0x1234>()
}

fn USER() -> ContractAddress {
    contract_address_const::<0x0590e76a2e65435b7288bf3526cfa5c3ec7748d2f3433a934c931cce62460fc5>()
}

fn USER2() -> ContractAddress {
    contract_address_const::<0x5678>()
}


// *************************************************************************
//                              SETUP
// *************************************************************************
fn deploy_test_token() -> ContractAddress {
    let user = USER();
    let initial_supply: u256 = 1000000; // Enough for test deposits (e.g., 1000)
    let test_token_class = declare("MyToken").unwrap().contract_class();
    let constructor_calldata = array![
        initial_supply.try_into().unwrap(), // initial supply
        user.into() // recipient
    ];
    let (token_address, _) = test_token_class.deploy(@constructor_calldata).unwrap();
    token_address
}

fn deploy_only_factory() -> IStrapexFactoryDispatcher {
    let token_address = deploy_test_token();
    let owner = OWNER();
    let factory_class_hash = declare("StrapexFactory").unwrap().contract_class();
    let child_class_hash = declare("StrapexContract").unwrap().contract_class().class_hash;
    let child_hash_felt: felt252 = class_hash_to_felt252(*child_class_hash);
    let constructor_data: Array<felt252> = array![
        owner.into(), // factory owner
        child_hash_felt, // Strapex contract class hash
        token_address.into() // mock token address
    ];
    let (factory_addr, _) = factory_class_hash.deploy(@constructor_data).unwrap();
    IStrapexFactoryDispatcher { contract_address: factory_addr }
}

fn deploy_factory() -> (ContractAddress, ContractAddress, IStrapexDispatcher, ContractAddress) {
    let token_address = deploy_test_token();
    let factory_owner = OWNER();
    let factory_class_hash = declare("StrapexFactory").unwrap().contract_class();
    let child_class_hash = declare("StrapexContract").unwrap().contract_class().class_hash;
    let child_hash_felt: felt252 = class_hash_to_felt252(*child_class_hash);
    let constructor_data: Array<felt252> = array![
        factory_owner.into(), // factory owner
        child_hash_felt, // Strapex contract class hash
        token_address.into() // mock token address
    ];
    //deploy strapex factory
    let (factory_addr, _) = factory_class_hash.deploy(@constructor_data).unwrap();
    let factory_disp = IStrapexFactoryDispatcher { contract_address: factory_addr };

    //deploy strapex
    let user = USER();
    start_cheat_caller_address(factory_addr, user);
    let child_addr = factory_disp.create_strapex_contract();
    stop_cheat_caller_address(factory_addr);
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
//                             DEPOSIT TESTS
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


// *************************************************************************
//                            WITHDRAW  TESTS
// *************************************************************************
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


// *************************************************************************
//                          TEST STRAPEX OWNERSHIP
// *************************************************************************
#[test]
fn test_strapex_set_correct_ownership_at_deploy() {
    let (_, _, strapex_disp, _) = deploy_factory();
    let owner = strapex_disp.get_owner();
    assert!(owner == USER(), "Not correct owner");
}

#[test]
#[should_panic(expected: 'Result::unwrap failed.')]
fn test_strapex_constructor_fails_when_send_zero_address_as_owner() {
    //deploy factory
    let token_address = deploy_test_token();
    let owner_felt: felt252 = contract_address_const::<0x0>().into();
    let factory_class_hash = declare("StrapexFactory").unwrap().contract_class();
    let child_class_hash = declare("StrapexContract").unwrap().contract_class().class_hash;
    let child_hash_felt: felt252 = class_hash_to_felt252(*child_class_hash);
    let constructor_data: Array<felt252> = array![
        owner_felt, child_hash_felt, token_address.into(),
    ];
    let (factory_addr, _) = factory_class_hash.deploy(@constructor_data).unwrap();
    let factory_disp = IStrapexFactoryDispatcher { contract_address: factory_addr };

    //create strapex should fail
    start_cheat_caller_address(factory_addr, contract_address_const::<0x0>());
    factory_disp.create_strapex_contract();
}

#[test]
fn test_strapex_owner_transfer_ownership() {
    let mut spy = spy_events();
    let (_, _, strapex_disp, _) = deploy_factory();
    let previous_owner = strapex_disp.get_owner();

    start_cheat_caller_address(strapex_disp.contract_address, USER());
    strapex_disp._transfer_ownership(USER2());
    stop_cheat_caller_address(strapex_disp.contract_address);

    let new_owner = strapex_disp.get_owner();
    assert!(previous_owner == USER(), "Prev owner is not USER");
    assert!(new_owner == USER2(), "New owner is not USER2");
    let events = spy.get_events().emitted_by(strapex_disp.contract_address);
    let (_, event) = events.events.at(0);
    assert_eq!(event.keys.at(0), @selector!("OwnableEvent"), "OwnableEvent wasn't emitted");
    assert_eq!(
        event.keys.at(1),
        @selector!("OwnershipTransferred"),
        "OwnershipTransferred event wasn't emitted",
    );
    
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_strapex_non_owner_tries_to_transfer_ownership() {
    let (_, _, strapex_disp, _) = deploy_factory();
    start_cheat_caller_address(strapex_disp.contract_address, USER2());
    strapex_disp._transfer_ownership(USER2());
    stop_cheat_caller_address(strapex_disp.contract_address);
}

#[test]
fn test_strapex_owner_renounce_ownership() {
    let (_, _, strapex_disp, _) = deploy_factory();
    let previous_owner = strapex_disp.get_owner();
    start_cheat_caller_address(strapex_disp.contract_address, USER());
    strapex_disp._renounce_ownership();
    stop_cheat_caller_address(strapex_disp.contract_address);
    let new_owner = strapex_disp.get_owner();
    assert!(previous_owner == USER(), "Prev owner is not USER");
    assert!(new_owner == contract_address_const::<0x0>(), "New owner should be zero address");
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_strapex_non_owner_tries_to_renounce_ownership() {
    let (_, _, strapex_disp, _) = deploy_factory();
    start_cheat_caller_address(strapex_disp.contract_address, USER2());
    strapex_disp._renounce_ownership();
    stop_cheat_caller_address(strapex_disp.contract_address);
}


// *************************************************************************
//                          STRAPEX FACTORY OWNERSHIP
// *************************************************************************
#[test]
fn test_strapex_factory_set_correct_ownership_at_deploy() {
    let factory_disp = deploy_only_factory();
    let owner = factory_disp.get_owner();
    assert!(owner == OWNER(), "Not correct owner");
}

#[test]
#[should_panic(expected: 'Result::unwrap failed.')]
fn test_strapex_factory_constructor_fails_when_send_zero_address_as_owner() {
    let token_address = deploy_test_token();
    let owner_felt: felt252 = contract_address_const::<0x0>().into();
    let factory_class_hash = declare("StrapexFactory").unwrap().contract_class();
    let child_class_hash = declare("StrapexContract").unwrap().contract_class().class_hash;
    let child_hash_felt: felt252 = class_hash_to_felt252(*child_class_hash);
    let constructor_data: Array<felt252> = array![
        owner_felt, child_hash_felt, token_address.into(),
    ];
    // deploy should fail
    factory_class_hash.deploy(@constructor_data).unwrap();
}

#[test]
fn test_strapex_factory_owner_transfer_ownership() {
    let mut spy = spy_events();
    let factory_disp = deploy_only_factory();
    let previous_owner = factory_disp.get_owner();

    start_cheat_caller_address(factory_disp.contract_address, OWNER());
    factory_disp._transfer_ownership(USER());
    stop_cheat_caller_address(factory_disp.contract_address);

    assert!(previous_owner == OWNER(), "Prev owner is not OWNER");
    let new_owner = factory_disp.get_owner();
    assert!(new_owner == USER(), "New owner is not USER");

    let events = spy.get_events().emitted_by(factory_disp.contract_address);
    let (_, event) = events.events.at(0);
    assert_eq!(event.keys.at(0), @selector!("OwnableEvent"), "OwnableEvent wasn't emitted");
    assert_eq!(
        event.keys.at(1),
        @selector!("OwnershipTransferred"),
        "OwnershipTransferred event wasn't emitted",
    );
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_strapex_factory_non_owner_tries_to_transfer_ownership() {
    let factory_disp = deploy_only_factory();
    start_cheat_caller_address(factory_disp.contract_address, USER());
    factory_disp._transfer_ownership(USER());
    stop_cheat_caller_address(factory_disp.contract_address);
}

#[test]
fn test_strapex_factory_owner_renounce_ownership() {
    let factory_disp = deploy_only_factory();
    let previous_owner = factory_disp.get_owner();
    start_cheat_caller_address(factory_disp.contract_address, OWNER());
    factory_disp._renounce_ownership();
    stop_cheat_caller_address(factory_disp.contract_address);
    let new_owner = factory_disp.get_owner();
    assert!(previous_owner == OWNER(), "Prev owner is not OWNER");
    assert!(new_owner == contract_address_const::<0x0>(), "New owner should be zero address");
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_strapex_factory_non_owner_tries_to_renounce_ownership() {
    let factory_disp = deploy_only_factory();
    start_cheat_caller_address(factory_disp.contract_address, USER());
    factory_disp._renounce_ownership();
    stop_cheat_caller_address(factory_disp.contract_address);
}
