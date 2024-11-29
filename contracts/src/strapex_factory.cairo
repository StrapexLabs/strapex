use starknet::{ContractAddress, ClassHash};
// This contract implements a factory pattern for creating and managing Strapex contracts.

#[starknet::interface]
trait IStrapexFactory<TContractState> {
    fn create_strapex_contract(ref self: TContractState) -> ContractAddress;
    fn updateStrapexChildHash(ref self: TContractState, newClassHash: ClassHash);
    fn updateDepositToken(ref self: TContractState, newDepositToken: ContractAddress);
    fn getStrapexAccountsNumber(self: @TContractState) -> u128;
    fn getUserStrapexAccount(
        self: @TContractState, userAddress: ContractAddress
    ) -> ContractAddress;
    fn get_owner(self: @TContractState) -> ContractAddress;
    fn get_childClassHash(self: @TContractState) -> ClassHash;
}

#[starknet::contract]
pub mod StrapexFactory {
    use starknet::storage::Map;
    use core::traits::Into;
    use core::array::ArrayTrait;
    // Core StarkNet and contract utilities.
    use starknet::deploy_syscall;
    use starknet::{
        ContractAddress, ClassHash, Zeroable, get_caller_address, contract_address_const
    };
    use core::starknet::event::EventEmitter;
    use contract_strapex::ownership_component::IOwnable;
    use contract_strapex::ownership_component::ownable_component;
    use starknet::storage::Map;
    component!(path: ownable_component, storage: ownable, event: OwnableEvent);

    #[abi(embed_v0)]
    impl OwnableImpl = ownable_component::Ownable<ContractState>;
    impl OwnableInternalImpl = ownable_component::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        strapexChildHash: ClassHash,
        strapexChildOwner: Map<ContractAddress, ContractAddress>,
        totalStrapexAccountsNo: u128,
        depositToken: ContractAddress,
        #[substorage(v0)]
        ownable: ownable_component::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        OwnableEvent: ownable_component::Event,
        HashUpdated: HashUpdated,
        AccountCreated: AccountCreated,
        DepositTokenUpdated: DepositTokenUpdated,
    }

    #[derive(Drop, starknet::Event)]
    struct HashUpdated {
        #[key]
        by: ContractAddress,
        #[key]
        oldHash: ClassHash,
        #[key]
        newHash: ClassHash,
    }

    #[derive(Drop, starknet::Event)]
    struct AccountCreated {
        #[key]
        by: ContractAddress,
        #[key]
        user: ContractAddress,
        #[key]
        strapexContract: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct DepositTokenUpdated {
        #[key]
        by: ContractAddress,
        #[key]
        oldToken: ContractAddress,
        #[key]
        newToken: ContractAddress,
    }

    mod Errors {
        const Address_Zero_Owner: felt252 = 'Address cannot be zero own';
    }

    #[constructor]
    // Constructor to initialize the contract with an owner.
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        childHash: ClassHash,
        depositToken: ContractAddress
    ) {
        self.totalStrapexAccountsNo.write(0);
        self.strapexChildHash.write(childHash);
        self.depositToken.write(depositToken);
        self.ownable.owner.write(owner);
    }

    #[abi(embed_v0)]
    // Implementation of IStrapexFactory interface for contract functionality.
    impl IStrapexFactory of super::IStrapexFactory<ContractState> {
        fn create_strapex_contract(ref self: ContractState) -> ContractAddress {
            let token_addr: ContractAddress = self.depositToken.read();

            let mut constructor_calldata = ArrayTrait::new();
            self.ownable.owner.read().serialize(ref constructor_calldata);
            get_caller_address().serialize(ref constructor_calldata);
            token_addr.serialize(ref constructor_calldata);

            let (deployed_address, _) = deploy_syscall(
                self.strapexChildHash.read(),
                self
                    .totalStrapexAccountsNo
                    .read()
                    .into(), //Using the total number of accounts as the nonce
                constructor_calldata.span(),
                false
            )
                .expect('failed to deploy contract');

            self.strapexChildOwner.write(get_caller_address(), deployed_address);
            self.totalStrapexAccountsNo.write(self.totalStrapexAccountsNo.read() + 1);

            self
                .emit(
                    AccountCreated {
                        by: self.ownable.owner(),
                        user: get_caller_address(),
                        strapexContract: deployed_address
                    }
                );

            deployed_address
        }

        fn updateStrapexChildHash(ref self: ContractState, newClassHash: ClassHash) {
            // Updates the class hash of the child Strapex contracts.
            self.ownable.assert_only_owner();
            let oldHash = self.strapexChildHash.read();
            self.strapexChildHash.write(newClassHash);
            self
                .emit(
                    HashUpdated {
                        by: self.ownable.owner(), oldHash: oldHash, newHash: newClassHash
                    }
                );
        }

        fn updateDepositToken(ref self: ContractState, newDepositToken: ContractAddress) {
            // Updates the deposit token of the contract.
            self.ownable.assert_only_owner();
            let oldToken = self.depositToken.read();
            self.depositToken.write(newDepositToken);
            self
                .emit(
                    DepositTokenUpdated {
                        by: self.ownable.owner(), oldToken: oldToken, newToken: newDepositToken
                    }
                );
        }

        fn getStrapexAccountsNumber(self: @ContractState) -> u128 {
            // Retrieves the total number of Strapex accounts created.
            self.ownable.assert_only_owner();
            self.totalStrapexAccountsNo.read()
        }
        fn getUserStrapexAccount(
            // Retrieves the Strapex account associated with a user address.
            self: @ContractState, userAddress: ContractAddress
        ) -> ContractAddress {
            assert(!userAddress.is_zero(), Errors::Address_Zero_Owner);
            self.strapexChildOwner.read(userAddress)
        }


        fn get_owner(self: @ContractState) -> ContractAddress {
            // Returns the owner of the contract.
            self.ownable.owner()
        }

        fn get_childClassHash(self: @ContractState) -> ClassHash {
            let currentHash = self.strapexChildHash.read();
            assert!(!currentHash.is_zero(), "Child class hash is zero");
            currentHash
        }
    }
}
