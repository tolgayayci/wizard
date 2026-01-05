#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::vec::Vec;

use openzeppelin_stylus::token::erc721::{
    self,
    extensions::{enumerable, Erc721Enumerable, IErc721Enumerable, IErc721Burnable},
    Erc721, IErc721,
};
use openzeppelin_stylus::utils::introspection::erc165::IErc165;
use stylus_sdk::{
    abi::Bytes,
    alloy_primitives::{Address, FixedBytes, U256},
    prelude::*,
};

#[derive(SolidityError, Debug)]
pub enum Error {
    OutOfBoundsIndex(enumerable::ERC721OutOfBoundsIndex),
    EnumerableForbiddenBatchMint(enumerable::ERC721EnumerableForbiddenBatchMint),
    InvalidOwner(erc721::ERC721InvalidOwner),
    NonexistentToken(erc721::ERC721NonexistentToken),
    IncorrectOwner(erc721::ERC721IncorrectOwner),
    InvalidSender(erc721::ERC721InvalidSender),
    InvalidReceiver(erc721::ERC721InvalidReceiver),
    InvalidReceiverWithReason(erc721::InvalidReceiverWithReason),
    InsufficientApproval(erc721::ERC721InsufficientApproval),
    InvalidApprover(erc721::ERC721InvalidApprover),
    InvalidOperator(erc721::ERC721InvalidOperator),
}

impl From<enumerable::Error> for Error {
    fn from(value: enumerable::Error) -> Self {
        match value {
            enumerable::Error::OutOfBoundsIndex(e) => Error::OutOfBoundsIndex(e),
            enumerable::Error::EnumerableForbiddenBatchMint(e) => Error::EnumerableForbiddenBatchMint(e),
        }
    }
}

impl From<erc721::Error> for Error {
    fn from(value: erc721::Error) -> Self {
        match value {
            erc721::Error::InvalidOwner(e) => Error::InvalidOwner(e),
            erc721::Error::NonexistentToken(e) => Error::NonexistentToken(e),
            erc721::Error::IncorrectOwner(e) => Error::IncorrectOwner(e),
            erc721::Error::InvalidSender(e) => Error::InvalidSender(e),
            erc721::Error::InvalidReceiver(e) => Error::InvalidReceiver(e),
            erc721::Error::InvalidReceiverWithReason(e) => Error::InvalidReceiverWithReason(e),
            erc721::Error::InsufficientApproval(e) => Error::InsufficientApproval(e),
            erc721::Error::InvalidApprover(e) => Error::InvalidApprover(e),
            erc721::Error::InvalidOperator(e) => Error::InvalidOperator(e),
        }
    }
}

#[entrypoint]
#[storage]
struct Erc721Example {
    erc721: Erc721,
    enumerable: Erc721Enumerable,
}

#[public]
impl Erc721Example {
    // Mint functions
    pub fn mint(&mut self, to: Address, token_id: U256) -> Result<(), Error> {
        self.erc721._mint(to, token_id)?;
        self.enumerable._add_token_to_all_tokens_enumeration(token_id);
        self.enumerable._add_token_to_owner_enumeration(to, token_id, &self.erc721)?;
        Ok(())
    }

    pub fn safe_mint(&mut self, to: Address, token_id: U256, data: Bytes) -> Result<(), Error> {
        self.erc721._safe_mint(to, token_id, &data)?;
        self.enumerable._add_token_to_all_tokens_enumeration(token_id);
        self.enumerable._add_token_to_owner_enumeration(to, token_id, &self.erc721)?;
        Ok(())
    }

    // ERC721 interface
    pub fn balance_of(&self, owner: Address) -> Result<U256, Error> {
        Ok(IErc721::balance_of(&self.erc721, owner)?)
    }

    pub fn owner_of(&self, token_id: U256) -> Result<Address, Error> {
        Ok(IErc721::owner_of(&self.erc721, token_id)?)
    }

    pub fn safe_transfer_from(&mut self, from: Address, to: Address, token_id: U256) -> Result<(), Error> {
        let previous_owner = IErc721::owner_of(&self.erc721, token_id)?;
        IErc721::safe_transfer_from(&mut self.erc721, from, to, token_id)?;
        self.enumerable._remove_token_from_owner_enumeration(previous_owner, token_id, &self.erc721)?;
        self.enumerable._add_token_to_owner_enumeration(to, token_id, &self.erc721)?;
        Ok(())
    }

    #[selector(name = "safeTransferFrom")]
    pub fn safe_transfer_from_with_data(&mut self, from: Address, to: Address, token_id: U256, data: Bytes) -> Result<(), Error> {
        let previous_owner = IErc721::owner_of(&self.erc721, token_id)?;
        IErc721::safe_transfer_from_with_data(&mut self.erc721, from, to, token_id, data)?;
        self.enumerable._remove_token_from_owner_enumeration(previous_owner, token_id, &self.erc721)?;
        self.enumerable._add_token_to_owner_enumeration(to, token_id, &self.erc721)?;
        Ok(())
    }

    pub fn transfer_from(&mut self, from: Address, to: Address, token_id: U256) -> Result<(), Error> {
        let previous_owner = IErc721::owner_of(&self.erc721, token_id)?;
        IErc721::transfer_from(&mut self.erc721, from, to, token_id)?;
        self.enumerable._remove_token_from_owner_enumeration(previous_owner, token_id, &self.erc721)?;
        self.enumerable._add_token_to_owner_enumeration(to, token_id, &self.erc721)?;
        Ok(())
    }

    pub fn approve(&mut self, to: Address, token_id: U256) -> Result<(), Error> {
        Ok(IErc721::approve(&mut self.erc721, to, token_id)?)
    }

    pub fn set_approval_for_all(&mut self, to: Address, approved: bool) -> Result<(), Error> {
        Ok(IErc721::set_approval_for_all(&mut self.erc721, to, approved)?)
    }

    pub fn get_approved(&self, token_id: U256) -> Result<Address, Error> {
        Ok(IErc721::get_approved(&self.erc721, token_id)?)
    }

    pub fn is_approved_for_all(&self, owner: Address, operator: Address) -> bool {
        IErc721::is_approved_for_all(&self.erc721, owner, operator)
    }

    // Burnable extension
    pub fn burn(&mut self, token_id: U256) -> Result<(), Error> {
        let owner = IErc721::owner_of(&self.erc721, token_id)?;
        IErc721Burnable::burn(&mut self.erc721, token_id)?;
        self.enumerable._remove_token_from_owner_enumeration(owner, token_id, &self.erc721)?;
        self.enumerable._remove_token_from_all_tokens_enumeration(token_id);
        Ok(())
    }

    // Enumerable extension
    pub fn total_supply(&self) -> U256 {
        IErc721Enumerable::total_supply(&self.enumerable)
    }

    pub fn token_by_index(&self, index: U256) -> Result<U256, Error> {
        Ok(IErc721Enumerable::token_by_index(&self.enumerable, index)?)
    }

    pub fn token_of_owner_by_index(&self, owner: Address, index: U256) -> Result<U256, Error> {
        Ok(IErc721Enumerable::token_of_owner_by_index(&self.enumerable, owner, index)?)
    }

    // ERC165 interface
    pub fn supports_interface(&self, interface_id: FixedBytes<4>) -> bool {
        IErc165::supports_interface(&self.erc721, interface_id)
            || IErc165::supports_interface(&self.enumerable, interface_id)
    }
}
