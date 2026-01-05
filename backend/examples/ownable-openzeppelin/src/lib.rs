#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::vec::Vec;

use alloy_primitives::{Address, U256};
use openzeppelin_stylus::{
    access::ownable::{self, IOwnable, Ownable},
    token::erc20::{self, Erc20, IErc20},
};
use stylus_sdk::prelude::*;

#[derive(SolidityError, Debug)]
enum Error {
    InsufficientBalance(erc20::ERC20InsufficientBalance),
    InvalidSender(erc20::ERC20InvalidSender),
    InvalidReceiver(erc20::ERC20InvalidReceiver),
    InsufficientAllowance(erc20::ERC20InsufficientAllowance),
    InvalidSpender(erc20::ERC20InvalidSpender),
    InvalidApprover(erc20::ERC20InvalidApprover),
    UnauthorizedAccount(ownable::OwnableUnauthorizedAccount),
    InvalidOwner(ownable::OwnableInvalidOwner),
}

impl From<erc20::Error> for Error {
    fn from(value: erc20::Error) -> Self {
        match value {
            erc20::Error::InsufficientBalance(e) => Error::InsufficientBalance(e),
            erc20::Error::InvalidSender(e) => Error::InvalidSender(e),
            erc20::Error::InvalidReceiver(e) => Error::InvalidReceiver(e),
            erc20::Error::InsufficientAllowance(e) => Error::InsufficientAllowance(e),
            erc20::Error::InvalidSpender(e) => Error::InvalidSpender(e),
            erc20::Error::InvalidApprover(e) => Error::InvalidApprover(e),
        }
    }
}

impl From<ownable::Error> for Error {
    fn from(value: ownable::Error) -> Self {
        match value {
            ownable::Error::UnauthorizedAccount(e) => Error::UnauthorizedAccount(e),
            ownable::Error::InvalidOwner(e) => Error::InvalidOwner(e),
        }
    }
}

#[entrypoint]
#[storage]
struct OwnableExample {
    erc20: Erc20,
    ownable: Ownable,
}

#[public]
impl OwnableExample {
    // Constructor
    #[constructor]
    pub fn constructor(&mut self, initial_owner: Address) -> Result<(), Error> {
        Ok(self.ownable.constructor(initial_owner)?)
    }

    // ERC20 interface
    pub fn total_supply(&self) -> U256 {
        IErc20::total_supply(&self.erc20)
    }

    pub fn balance_of(&self, account: Address) -> U256 {
        IErc20::balance_of(&self.erc20, account)
    }

    pub fn transfer(&mut self, to: Address, value: U256) -> Result<bool, Error> {
        self.ownable.only_owner()?;
        Ok(IErc20::transfer(&mut self.erc20, to, value)?)
    }

    pub fn allowance(&self, owner: Address, spender: Address) -> U256 {
        IErc20::allowance(&self.erc20, owner, spender)
    }

    pub fn approve(&mut self, spender: Address, value: U256) -> Result<bool, Error> {
        Ok(IErc20::approve(&mut self.erc20, spender, value)?)
    }

    pub fn transfer_from(&mut self, from: Address, to: Address, value: U256) -> Result<bool, Error> {
        Ok(IErc20::transfer_from(&mut self.erc20, from, to, value)?)
    }

    // Ownable interface
    pub fn owner(&self) -> Address {
        IOwnable::owner(&self.ownable)
    }

    pub fn transfer_ownership(&mut self, new_owner: Address) -> Result<(), Error> {
        Ok(IOwnable::transfer_ownership(&mut self.ownable, new_owner)?)
    }

    pub fn renounce_ownership(&mut self) -> Result<(), Error> {
        Ok(IOwnable::renounce_ownership(&mut self.ownable)?)
    }
}
