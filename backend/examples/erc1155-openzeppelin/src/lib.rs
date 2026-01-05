#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
#![allow(clippy::result_large_err)]
extern crate alloc;

use alloc::vec::Vec;

use openzeppelin_stylus::token::erc1155::{self, Erc1155, IErc1155};
use openzeppelin_stylus::token::erc1155::extensions::IErc1155Burnable;
use openzeppelin_stylus::utils::introspection::erc165::IErc165;
use stylus_sdk::{
    abi::Bytes,
    alloy_primitives::{Address, FixedBytes, U256},
    prelude::*,
};

#[entrypoint]
#[storage]
struct Erc1155Example {
    erc1155: Erc1155,
}

#[public]
impl Erc1155Example {
    // Mint functions
    pub fn mint(&mut self, to: Address, token_id: U256, amount: U256, data: Bytes) -> Result<(), erc1155::Error> {
        self.erc1155._mint(to, token_id, amount, &data)
    }

    pub fn mint_batch(&mut self, to: Address, token_ids: Vec<U256>, amounts: Vec<U256>, data: Bytes) -> Result<(), erc1155::Error> {
        self.erc1155._mint_batch(to, token_ids, amounts, &data)
    }

    // ERC1155 interface
    pub fn balance_of(&self, account: Address, id: U256) -> U256 {
        IErc1155::balance_of(&self.erc1155, account, id)
    }

    pub fn balance_of_batch(&self, accounts: Vec<Address>, ids: Vec<U256>) -> Result<Vec<U256>, erc1155::Error> {
        IErc1155::balance_of_batch(&self.erc1155, accounts, ids)
    }

    pub fn set_approval_for_all(&mut self, operator: Address, approved: bool) -> Result<(), erc1155::Error> {
        IErc1155::set_approval_for_all(&mut self.erc1155, operator, approved)
    }

    pub fn is_approved_for_all(&self, account: Address, operator: Address) -> bool {
        IErc1155::is_approved_for_all(&self.erc1155, account, operator)
    }

    pub fn safe_transfer_from(&mut self, from: Address, to: Address, id: U256, value: U256, data: Bytes) -> Result<(), erc1155::Error> {
        IErc1155::safe_transfer_from(&mut self.erc1155, from, to, id, value, data)
    }

    pub fn safe_batch_transfer_from(&mut self, from: Address, to: Address, ids: Vec<U256>, values: Vec<U256>, data: Bytes) -> Result<(), erc1155::Error> {
        IErc1155::safe_batch_transfer_from(&mut self.erc1155, from, to, ids, values, data)
    }

    // Burnable extension
    pub fn burn(&mut self, account: Address, token_id: U256, value: U256) -> Result<(), erc1155::Error> {
        IErc1155Burnable::burn(&mut self.erc1155, account, token_id, value)
    }

    pub fn burn_batch(&mut self, account: Address, token_ids: Vec<U256>, values: Vec<U256>) -> Result<(), erc1155::Error> {
        IErc1155Burnable::burn_batch(&mut self.erc1155, account, token_ids, values)
    }

    // ERC165 interface
    pub fn supports_interface(&self, interface_id: FixedBytes<4>) -> bool {
        IErc165::supports_interface(&self.erc1155, interface_id)
    }
}
