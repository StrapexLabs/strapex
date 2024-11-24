use starknet::{ContractAddress, contract_address_const, get_caller_address};

use snforge_std::{
    declare, ContractClassTrait
};

use contract_strapex::strapex_factory::{
    IStrapexFactory, IStrapexFactoryDispatcher, IStrapexFactoryDispatcherTrait, strapex_factory
};

use contract_strapex::strapex_contract::{
    IStrapex, IStrapexDispatcher, IStrapexDispatcherTrait, strapex_contract
};

fn deploy_factory() -> ContractAddress {
    
    let factory_contract = declare('strapex_factory');
    let child_contract = declare('strapex_contract');
    let child_contract_felt: felt252 = child_contract.class_hash.into();
    let mut calldata: Array<felt252> = array![
        contract_address_const::<'OWNER'>().into(),
        child_contract_felt,
        contract_address_const::<'DEPOSIT_TOKEN'>().into()
    ];
    let contract_address = factory_contract.deploy(@calldata).expect('Deployment failed');

    contract_address
}

#[test]
fn test_strapex_factory() {
    let _factory_contract_address = deploy_factory();
    
}