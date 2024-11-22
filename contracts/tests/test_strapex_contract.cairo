use starknet::{ContractAddress, contract_address_const, get_caller_address};

use snforge_std as snf;
use snforge_std::{
    ContractClassTrait, EventSpy, start_cheat_caller_address, stop_cheat_caller_address, spy_events,
    cheatcodes::events::{EventSpyAssertionsTrait, EventSpyTrait, EventsFilterTrait}
};

use contract_strapex::strapex_factory::{
    IStrapexFactory, IStrapexFactoryDispatcher, IStrapexFactoryDispatcherTrait, strapex_factory
};

use contract_strapex::strapex_contract::{
    IStrapex, IStrapexDispatcher, IStrapexDispatcherTrait, strapex_contract
};

fn deploy_factory() -> ContractAddress {
    let contract = snf::declare("strapex_factory").expect('Declaration failed');
}