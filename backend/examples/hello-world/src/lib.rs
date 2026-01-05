//! Stylus Hello World
//!
//! A simple counter contract that demonstrates basic Stylus development.
//! This is ABI-equivalent with Solidity, meaning you can call it from both Solidity and Rust.

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
#![cfg_attr(not(any(test, feature = "export-abi")), no_std)]

#[macro_use]
extern crate alloc;

use alloc::vec::Vec;
use stylus_sdk::{alloy_primitives::U256, prelude::*};

sol_storage! {
    #[entrypoint]
    pub struct Counter {
        uint256 number;
    }
}

#[public]
impl Counter {
    /// Gets the current number from storage.
    pub fn number(&self) -> U256 {
        self.number.get()
    }

    /// Sets the number in storage to a new value.
    pub fn set_number(&mut self, new_number: U256) {
        self.number.set(new_number);
    }

    /// Increments the number by 1.
    pub fn increment(&mut self) {
        let number = self.number.get();
        self.set_number(number + U256::from(1));
    }

    /// Adds a value to the current number.
    pub fn add_number(&mut self, value: U256) {
        self.number.set(value + self.number.get());
    }

    /// Multiplies the current number by a value.
    pub fn mul_number(&mut self, value: U256) {
        self.number.set(value * self.number.get());
    }
}
