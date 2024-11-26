use starknet::{ContractAddress, contract_address_const, get_caller_address};

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

const USER: felt252 = 'USER';
const OWNER: felt252 = 'OWNER';

fn deploy_factory() {
    
    // let factory_contract = declare("StrapexFactory").unwrap().contract_class();
    // let child_contract = declare("StrapexContract").unwrap().contract_class();
    // let mut calldata: Array<felt252> = array![
    //     contract_address_const::<'OWNER'>().into(),
    //     child_contract_felt,
    //     contract_address_const::<'DEPOSIT_TOKEN'>().into()
    // ];
    // let contract_address = factory_contract.deploy(@calldata).expect('Deployment failed');

    // contract_address

    let factory_class_hash = declare("StrapexFactory").unwrap().contract_class();
    let child_class_hash = declare("StrapexContract").unwrap().contract_class().class_hash;
    let child_hash_felt: felt252 = child_class_hash.into();
    let constructor_data: Array<felt252> = array![];    
}

#[test]
fn test_strapex_factory() {
    let _factory_contract_address = deploy_factory();
    
}