use starknet::{ContractAddress, ClassHash};

#[starknet::interface]
trait IStrapexFactory<TContractState> {
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

#[starknet::contract]
mod StrapexFactory {
    use core::traits::Into;
    use core::array::ArrayTrait;
    use starknet::deploy_syscall;
    use starknet::{ContractAddress, ClassHash, Zeroable, get_caller_address};
    use core::starknet::event::EventEmitter;
    use openzeppelin::access::ownable::OwnableComponent;
    use openzeppelin::access::ownable::interface::IOwnable;
    use starknet::storage::Map;
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    #[abi(embed_v0)]
    impl OwnableImpl = OwnableComponent::OwnableImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        strapexChildHash: ClassHash,
        strapexChildOwner: Map<ContractAddress, ContractAddress>,
        totalStrapexAccountsNo: u128,
        depositToken: ContractAddress,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        OwnableEvent: OwnableComponent::Event,
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
        const Address_Zero_Owner: felt252 = 1;
        const Unauthorized_Caller: felt252 = 2;
        const Deployment_Failed: felt252 = 3;
        const Invalid_Hash: felt252 = 4;
        const Invalid_Token: felt252 = 5;
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        childHash: ClassHash,
        depositToken: ContractAddress,
    ) {
        assert(!owner.is_zero(), Errors::Address_Zero_Owner);
        assert(!childHash.is_zero(), Errors::Invalid_Hash);
        assert(!depositToken.is_zero(), Errors::Invalid_Token);

        self.totalStrapexAccountsNo.write(0);
        self.strapexChildHash.write(childHash);
        self.depositToken.write(depositToken);
        self.ownable.initializer(owner);
    }

    #[abi(embed_v0)]
    impl IStrapexFactory of super::IStrapexFactory<ContractState> {
        fn create_strapex_contract(ref self: ContractState) -> ContractAddress {
            let token_addr: ContractAddress = self.depositToken.read();
            let mut constructor_calldata = ArrayTrait::new();
            self.ownable.owner().serialize(ref constructor_calldata);
            get_caller_address().serialize(ref constructor_calldata);
            token_addr.serialize(ref constructor_calldata);

            let deploy_result = deploy_syscall(
                self.strapexChildHash.read(),
                self.totalStrapexAccountsNo.read().into(),
                constructor_calldata.span(),
                false,
            );

            assert(deploy_result.is_ok(), Errors::Deployment_Failed);
            let (deployed_address, _) = deploy_result.unwrap();

            self.strapexChildOwner.write(get_caller_address(), deployed_address);
            self.totalStrapexAccountsNo.write(self.totalStrapexAccountsNo.read() + 1);

            self
                .emit(
                    AccountCreated {
                        by: self.ownable.owner(),
                        user: get_caller_address(),
                        strapexContract: deployed_address,
                    },
                );

            deployed_address
        }

        fn updateStrapexChildHash(ref self: ContractState, newClassHash: ClassHash) {
            self.ownable.assert_only_owner();
            assert(!newClassHash.is_zero(), Errors::Invalid_Hash);
            let oldHash = self.strapexChildHash.read();
            self.strapexChildHash.write(newClassHash);
            self.emit(HashUpdated { by: self.ownable.owner(), oldHash, newHash: newClassHash });
        }

        fn updateDepositToken(ref self: ContractState, newDepositToken: ContractAddress) {
            self.ownable.assert_only_owner();
            assert(!newDepositToken.is_zero(), Errors::Invalid_Token);
            let oldToken = self.depositToken.read();
            self.depositToken.write(newDepositToken);
            self
                .emit(
                    DepositTokenUpdated {
                        by: self.ownable.owner(), oldToken, newToken: newDepositToken,
                    },
                );
        }

        fn getStrapexAccountsNumber(self: @ContractState) -> u128 {
            self.totalStrapexAccountsNo.read()
        }

        fn getUserStrapexAccount(
            self: @ContractState, userAddress: ContractAddress,
        ) -> ContractAddress {
            assert(!userAddress.is_zero(), Errors::Address_Zero_Owner);
            self.strapexChildOwner.read(userAddress)
        }

        fn get_owner(self: @ContractState) -> ContractAddress {
            self.ownable.owner()
        }

        fn _transfer_ownership(ref self: ContractState, newOwner: ContractAddress) {
            self.ownable.transfer_ownership(newOwner);
        }

        fn _renounce_ownership(ref self: ContractState) {
            self.ownable.renounce_ownership();
        }

        fn get_childClassHash(self: @ContractState) -> ClassHash {
            let currentHash = self.strapexChildHash.read();
            assert(!currentHash.is_zero(), Errors::Invalid_Hash);
            currentHash
        }
    }
}
