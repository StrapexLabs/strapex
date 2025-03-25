pub mod FactoryErrors {
    pub const Address_Zero_Owner: felt252 = 1;
    pub const Unauthorized_Caller: felt252 = 2;
    pub const Deployment_Failed: felt252 = 3;
    pub const Invalid_Hash: felt252 = 4;
    pub const Invalid_Token: felt252 = 5;
}
pub mod ContractErrors {
    pub const Address_Zero_Owner: felt252 = 'Invalid owner';
    pub const Address_Zero_Token: felt252 = 'Invalid Token';
    pub const UnAuthorized_Caller: felt252 = 'UnAuthorized caller';
    pub const Insufficient_Balance: felt252 = 'Insufficient balance';
    pub const Already_Refunded: felt252 = 'Already refunded';
    pub const Refund_Exceeds_Amount: felt252 = 'Refund exceeds amount';
}