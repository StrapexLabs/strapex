// *************************************************************************
//                              STRAPEX CONTRACT
// *************************************************************************

#[starknet::contract]
pub mod StrapexContract {
    use contract_strapex::interfaces::{IERC20Dispatcher, IERC20DispatcherTrait, IStrapex};
    use contract_strapex::utils::ContractErrors;
    use core::traits::Into;
    use core::box::BoxTrait;
    use core::num::traits::zero::Zero;
    use starknet::{get_caller_address, get_contract_address, ContractAddress, get_execution_info};
    use starknet::storage::{
        Map, StoragePointerWriteAccess, StoragePointerReadAccess, StorageMapReadAccess,
        StorageMapWriteAccess,
    };

    use openzeppelin::access::ownable::interface::IOwnable;
    use openzeppelin::access::ownable::OwnableComponent;
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);


    #[abi(embed_v0)]
    impl OwnableImpl = OwnableComponent::OwnableImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        token: IERC20Dispatcher,
        balance: u256,
        fee_percentage: u256,
        fees_collected: u256,
        taxable_amount: u256,
        number_of_deposits: u128,
        manager: ContractAddress, //Platform manager
        // Allow multiple buys from one address
        // tx_hash -> ( buyer, amount, token, id, refunded)
        payments: Map::<felt252, Payment>,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
    }

    #[derive(Copy, Drop, Serde, starknet::Store)]
    struct Payment {
        buyer: ContractAddress,
        amount: u256,
        token: ContractAddress,
        id: u128,
        refunded: u256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        OwnableEvent: OwnableComponent::Event,
        Deposit: Deposit,
        Withdraw: Withdraw,
        FeeCollection: FeeCollection,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Deposit {
        #[key]
        from: ContractAddress,
        #[key]
        Amount: u256,
        token: ContractAddress,
        #[key]
        id: u128,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Withdraw {
        #[key]
        Amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct FeeCollection {
        #[key]
        Amount: u256,
    }


    #[constructor]
    fn constructor(
        ref self: ContractState,
        manager: ContractAddress,
        _owner: ContractAddress,
        _token: ContractAddress,
    ) {
        assert(!_owner.is_zero(), ContractErrors::Address_Zero_Owner);
        self.ownable.initializer(_owner);
        self.token.write(IERC20Dispatcher { contract_address: _token });
        self.fee_percentage.write(50); // 0.5%
        self.manager.write(manager);
    }

    #[abi(embed_v0)]
    impl piggyBankImpl of IStrapex<ContractState> {
        fn deposit(ref self: ContractState, id: u128, amount: u256) {
            let (caller, this, currentBalance) = self.getImportantAddresses();

            self.token.read().transferFrom(caller, this, amount.into());

            self.balance.write(currentBalance + amount);

            let exec = get_execution_info().unbox();
            let tx_hash = exec.tx_info.unbox().transaction_hash;

            self
                .payments
                .write(
                    tx_hash,
                    Payment {
                        buyer: caller,
                        amount: amount,
                        token: self.token.read().contract_address,
                        id: id,
                        refunded: 0.into(),
                    },
                );

            // Update the taxable amount
            let current_taxable_amount: u256 = self.taxable_amount.read();
            self.taxable_amount.write(current_taxable_amount + amount);

            self
                .emit(
                    Deposit {
                        from: caller,
                        Amount: amount,
                        id: id,
                        token: self.token.read().contract_address,
                    },
                );
        }

        fn withdraw(ref self: ContractState) {
            let caller: ContractAddress = get_caller_address();
            let owner = self.ownable.owner();
            assert(caller == owner, ContractErrors::UnAuthorized_Caller);

            let taxable_amount: u256 = self.taxable_amount.read();
            let fee_percentage = self.fee_percentage.read();
            let fee_amount = taxable_amount * fee_percentage / 100;
            let withdrawal_amount = self.balance.read() - fee_amount;

            // Transfer fee to manager
            let manager = self.manager.read();
            self.token.read().transfer(manager, fee_amount.into());

            // Transfer remaining balance to owner
            self.token.read().transfer(owner, withdrawal_amount.into());

            // Reset balance and taxable amount to zero
            self.balance.write(0);
            self.taxable_amount.write(0);

            // Optionally update fees collected
            let updated_fees_collected = self.fees_collected.read() + fee_amount;
            self.fees_collected.write(updated_fees_collected);

            // Emit Withdraw event
            self.emit(Withdraw { Amount: withdrawal_amount });
            self.emit(FeeCollection { Amount: fee_amount });
        }

        fn withdraw_amount(ref self: ContractState, amount: u256) {
            let caller: ContractAddress = get_caller_address();
            let owner = self.ownable.owner();
            assert(caller == owner, ContractErrors::UnAuthorized_Caller);

            let current_balance: u256 = self.balance.read();
            assert(amount <= current_balance, ContractErrors::Insufficient_Balance);

            let taxable_amount: u256 = self.taxable_amount.read();
            let fee_percentage = self.fee_percentage.read();
            // Calculate fee based on the proportion of the withdrawal amount to the current balance
            let fee_amount = (amount * taxable_amount / current_balance) * fee_percentage / 100;
            let withdrawal_amount = amount - fee_amount;

            // Transfer fee to manager
            let manager = self.manager.read();
            self.token.read().transfer(manager, fee_amount.into());

            // Transfer the specified amount to owner
            self.token.read().transfer(owner, withdrawal_amount.into());

            // Update balance and taxable amount
            self.balance.write(current_balance - amount);
            self.taxable_amount.write(taxable_amount - (amount * taxable_amount / current_balance));

            // Optionally update fees collected
            let updated_fees_collected = self.fees_collected.read() + fee_amount;
            self.fees_collected.write(updated_fees_collected);

            // Emit Withdraw event
            self.emit(Withdraw { Amount: withdrawal_amount });
            self.emit(FeeCollection { Amount: fee_amount });
        }

        fn set_fee(ref self: ContractState, new_fee: u256) {
            let caller: ContractAddress = get_caller_address();
            assert(caller == self.ownable.owner(), ContractErrors::UnAuthorized_Caller);
            self.fee_percentage.write(new_fee);
        }

        fn collect_fees(ref self: ContractState) {
            let caller: ContractAddress = get_caller_address();
            let manager = self.manager.read();
            // Ensure the caller is the manager
            assert(caller == manager, ContractErrors::UnAuthorized_Caller);

            let taxable_amount: u256 = self.taxable_amount.read();
            let fee_percentage = self.fee_percentage.read();
            let fee_amount = taxable_amount * fee_percentage / 100;

            // Transfer the fee amount to the manager
            self.token.read().transfer(manager, fee_amount.into());

            // Reset the taxable amount to zero
            self.taxable_amount.write(0);

            // Optionally update fees collected
            let updated_fees_collected = self.fees_collected.read() + fee_amount;
            self.fees_collected.write(updated_fees_collected);
            // Emit an event if necessary
        }

        fn refund(ref self: ContractState, tx_hash: felt252) {
            let caller: ContractAddress = get_caller_address();
            let owner = self.ownable.owner();
            assert(caller == owner, ContractErrors::UnAuthorized_Caller);

            let (_, _, _) = self.getImportantAddresses();
            let Payment { buyer, amount, token, id, refunded } = self.payments.read(tx_hash);
            assert(refunded == 0.into(), ContractErrors::Already_Refunded);

            // Generalized for future support of multi tokens
            let tokenDispatch = IERC20Dispatcher { contract_address: token };
            tokenDispatch.transfer(buyer, amount.into());

            self.payments.write(tx_hash, Payment { buyer, amount, token, id, refunded: amount });
        }

        fn refund_amount(ref self: ContractState, tx_hash: felt252, amount: u256) {
            let caller: ContractAddress = get_caller_address();
            let owner = self.ownable.owner();
            assert(caller == owner, ContractErrors::UnAuthorized_Caller);

            let (_, _, _) = self.getImportantAddresses();
            let Payment {
                buyer, amount: total_amount, token, id, refunded,
            } = self.payments.read(tx_hash);
            assert(refunded + amount <= total_amount, ContractErrors::Refund_Exceeds_Amount);

            // Generalized for future support of multi tokens
            let tokenDispatch = IERC20Dispatcher { contract_address: token };
            tokenDispatch.transfer(buyer, amount.into());

            self
                .payments
                .write(
                    tx_hash,
                    Payment { buyer, amount: total_amount, token, id, refunded: refunded + amount },
                );
        }

        fn get_fee_percentage(self: @ContractState) -> u256 {
            self.fee_percentage.read()
        }

        fn get_fees_to_collect(self: @ContractState) -> u256 {
            let caller: ContractAddress = get_caller_address();
            let owner = self.ownable.owner();
            assert(
                caller == owner || caller == self.manager.read(),
                ContractErrors::UnAuthorized_Caller,
            );

            let current_balance: u256 = self.balance.read();
            let fee_percentage = self.fee_percentage.read();
            let fee_amount = current_balance * fee_percentage / 100;
            fee_amount
        }

        fn get_manager(self: @ContractState) -> ContractAddress {
            self.manager.read()
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
    }

    #[generate_trait]
    impl Private of PrivateTrait {
        fn getImportantAddresses(self: @ContractState) -> (ContractAddress, ContractAddress, u256) {
            let caller: ContractAddress = get_caller_address();
            let this: ContractAddress = get_contract_address();
            let currentBalance: u256 = self.balance.read();
            (caller, this, currentBalance)
        }
    }
}
