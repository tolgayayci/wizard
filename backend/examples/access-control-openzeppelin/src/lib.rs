#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::vec::Vec;

use openzeppelin_stylus::{
    access::control::{self, AccessControl, IAccessControl},
    token::erc20::{self, Erc20, IErc20},
};
use stylus_sdk::{
    alloy_primitives::{Address, B256, U256},
    prelude::*,
};

#[derive(SolidityError, Debug)]
enum Error {
    UnauthorizedAccount(control::AccessControlUnauthorizedAccount),
    BadConfirmation(control::AccessControlBadConfirmation),
    InsufficientBalance(erc20::ERC20InsufficientBalance),
    InvalidSender(erc20::ERC20InvalidSender),
    InvalidReceiver(erc20::ERC20InvalidReceiver),
    InsufficientAllowance(erc20::ERC20InsufficientAllowance),
    InvalidSpender(erc20::ERC20InvalidSpender),
    InvalidApprover(erc20::ERC20InvalidApprover),
}

impl From<control::Error> for Error {
    fn from(value: control::Error) -> Self {
        match value {
            control::Error::UnauthorizedAccount(e) => Error::UnauthorizedAccount(e),
            control::Error::BadConfirmation(e) => Error::BadConfirmation(e),
        }
    }
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

#[entrypoint]
#[storage]
struct AccessControlExample {
    erc20: Erc20,
    access: AccessControl,
}

pub const TRANSFER_ROLE: [u8; 32] =
    keccak_const::Keccak256::new().update(b"TRANSFER_ROLE").finalize();

#[public]
impl AccessControlExample {
    // Constructor
    #[constructor]
    pub fn constructor(&mut self, admin: Address) {
        self.access._grant_role(AccessControl::DEFAULT_ADMIN_ROLE.into(), admin);
    }

    // Custom admin function
    pub fn make_admin(&mut self, account: Address) -> Result<(), Error> {
        IAccessControl::only_role(&self.access, AccessControl::DEFAULT_ADMIN_ROLE.into())?;
        IAccessControl::grant_role(&mut self.access, TRANSFER_ROLE.into(), account)?;
        Ok(())
    }

    // ERC20 interface
    pub fn total_supply(&self) -> U256 {
        IErc20::total_supply(&self.erc20)
    }

    pub fn balance_of(&self, account: Address) -> U256 {
        IErc20::balance_of(&self.erc20, account)
    }

    pub fn transfer(&mut self, to: Address, value: U256) -> Result<bool, Error> {
        Ok(IErc20::transfer(&mut self.erc20, to, value)?)
    }

    pub fn allowance(&self, owner: Address, spender: Address) -> U256 {
        IErc20::allowance(&self.erc20, owner, spender)
    }

    pub fn approve(&mut self, spender: Address, value: U256) -> Result<bool, Error> {
        Ok(IErc20::approve(&mut self.erc20, spender, value)?)
    }

    pub fn transfer_from(&mut self, from: Address, to: Address, value: U256) -> Result<bool, Error> {
        IAccessControl::only_role(&self.access, TRANSFER_ROLE.into())?;
        Ok(IErc20::transfer_from(&mut self.erc20, from, to, value)?)
    }

    // Access Control interface
    pub fn has_role(&self, role: B256, account: Address) -> bool {
        IAccessControl::has_role(&self.access, role, account)
    }

    pub fn only_role(&self, role: B256) -> Result<(), Error> {
        Ok(IAccessControl::only_role(&self.access, role)?)
    }

    pub fn get_role_admin(&self, role: B256) -> B256 {
        IAccessControl::get_role_admin(&self.access, role)
    }

    pub fn grant_role(&mut self, role: B256, account: Address) -> Result<(), Error> {
        Ok(IAccessControl::grant_role(&mut self.access, role, account)?)
    }

    pub fn revoke_role(&mut self, role: B256, account: Address) -> Result<(), Error> {
        Ok(IAccessControl::revoke_role(&mut self.access, role, account)?)
    }

    pub fn renounce_role(&mut self, role: B256, confirmation: Address) -> Result<(), Error> {
        Ok(IAccessControl::renounce_role(&mut self.access, role, confirmation)?)
    }
}
