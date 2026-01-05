#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::vec::Vec;

use openzeppelin_stylus::{
    token::erc20::{
        self,
        extensions::{
            capped, Capped, Erc20Metadata, ICapped, IErc20Burnable, IErc20Metadata,
        },
        Erc20, IErc20,
    },
    utils::{introspection::erc165::IErc165, pausable, IPausable, Pausable},
};
use stylus_sdk::{
    alloy_primitives::{uint, Address, FixedBytes, U256, U8},
    prelude::*,
};

const DECIMALS: U8 = uint!(10_U8);

#[derive(SolidityError, Debug)]
enum Error {
    ExceededCap(capped::ERC20ExceededCap),
    InvalidCap(capped::ERC20InvalidCap),
    InsufficientBalance(erc20::ERC20InsufficientBalance),
    InvalidSender(erc20::ERC20InvalidSender),
    InvalidReceiver(erc20::ERC20InvalidReceiver),
    InsufficientAllowance(erc20::ERC20InsufficientAllowance),
    InvalidSpender(erc20::ERC20InvalidSpender),
    InvalidApprover(erc20::ERC20InvalidApprover),
    EnforcedPause(pausable::EnforcedPause),
    ExpectedPause(pausable::ExpectedPause),
}

impl From<capped::Error> for Error {
    fn from(value: capped::Error) -> Self {
        match value {
            capped::Error::ExceededCap(e) => Error::ExceededCap(e),
            capped::Error::InvalidCap(e) => Error::InvalidCap(e),
        }
    }
}

impl From<erc20::Error> for Error {
    fn from(value: erc20::Error) -> Self {
        match value {
            erc20::Error::InsufficientBalance(e) => {
                Error::InsufficientBalance(e)
            }
            erc20::Error::InvalidSender(e) => Error::InvalidSender(e),
            erc20::Error::InvalidReceiver(e) => Error::InvalidReceiver(e),
            erc20::Error::InsufficientAllowance(e) => {
                Error::InsufficientAllowance(e)
            }
            erc20::Error::InvalidSpender(e) => Error::InvalidSpender(e),
            erc20::Error::InvalidApprover(e) => Error::InvalidApprover(e),
        }
    }
}

impl From<pausable::Error> for Error {
    fn from(value: pausable::Error) -> Self {
        match value {
            pausable::Error::EnforcedPause(e) => Error::EnforcedPause(e),
            pausable::Error::ExpectedPause(e) => Error::ExpectedPause(e),
        }
    }
}

#[entrypoint]
#[storage]
struct Erc20Example {
    erc20: Erc20,
    metadata: Erc20Metadata,
    capped: Capped,
    pausable: Pausable,
}

#[public]
impl Erc20Example {
    // Constructor
    #[constructor]
    pub fn constructor(
        &mut self,
        name: String,
        symbol: String,
        cap: U256,
    ) -> Result<(), Error> {
        self.metadata.constructor(name, symbol);
        self.capped.constructor(cap)?;
        Ok(())
    }

    // Mint function (only owner should call in production)
    pub fn mint(&mut self, account: Address, value: U256) -> Result<(), Error> {
        self.pausable.when_not_paused()?;
        let max_supply = ICapped::cap(&self.capped);

        let supply = IErc20::total_supply(&self.erc20)
            .checked_add(value)
            .expect("new supply should not exceed `U256::MAX`");

        if supply > max_supply {
            return Err(capped::Error::ExceededCap(
                capped::ERC20ExceededCap {
                    increased_supply: supply,
                    cap: max_supply,
                },
            ))?;
        }

        self.erc20._mint(account, value)?;
        Ok(())
    }

    // Pausable functions
    pub fn pause(&mut self) -> Result<(), Error> {
        Ok(self.pausable.pause()?)
    }

    pub fn unpause(&mut self) -> Result<(), Error> {
        Ok(self.pausable.unpause()?)
    }

    // ERC20 interface
    pub fn total_supply(&self) -> U256 {
        IErc20::total_supply(&self.erc20)
    }

    pub fn balance_of(&self, account: Address) -> U256 {
        IErc20::balance_of(&self.erc20, account)
    }

    pub fn transfer(&mut self, to: Address, value: U256) -> Result<bool, Error> {
        self.pausable.when_not_paused()?;
        Ok(IErc20::transfer(&mut self.erc20, to, value)?)
    }

    pub fn allowance(&self, owner: Address, spender: Address) -> U256 {
        IErc20::allowance(&self.erc20, owner, spender)
    }

    pub fn approve(&mut self, spender: Address, value: U256) -> Result<bool, Error> {
        Ok(IErc20::approve(&mut self.erc20, spender, value)?)
    }

    pub fn transfer_from(&mut self, from: Address, to: Address, value: U256) -> Result<bool, Error> {
        self.pausable.when_not_paused()?;
        Ok(IErc20::transfer_from(&mut self.erc20, from, to, value)?)
    }

    // ERC20 Metadata interface
    pub fn name(&self) -> String {
        IErc20Metadata::name(&self.metadata)
    }

    pub fn symbol(&self) -> String {
        IErc20Metadata::symbol(&self.metadata)
    }

    pub fn decimals(&self) -> U8 {
        DECIMALS
    }

    // ERC165 interface
    pub fn supports_interface(&self, interface_id: FixedBytes<4>) -> bool {
        Erc20::supports_interface(&self.erc20, interface_id)
            || Erc20Metadata::supports_interface(&self.metadata, interface_id)
    }

    // Burnable extension
    pub fn burn(&mut self, value: U256) -> Result<(), Error> {
        self.pausable.when_not_paused()?;
        Ok(IErc20Burnable::burn(&mut self.erc20, value)?)
    }

    pub fn burn_from(&mut self, account: Address, value: U256) -> Result<(), Error> {
        self.pausable.when_not_paused()?;
        Ok(IErc20Burnable::burn_from(&mut self.erc20, account, value)?)
    }

    // Capped extension
    pub fn cap(&self) -> U256 {
        ICapped::cap(&self.capped)
    }

    // Pausable extension
    pub fn paused(&self) -> bool {
        IPausable::paused(&self.pausable)
    }
}
