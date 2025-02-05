# Access Control System

A complete implementation of Role-Based Access Control (RBAC) optimized for Stylus. Think of it as a security system for your smart contracts where different users have different permissions - like how a company has administrators, managers, and regular employees with different access levels.

::: warning Note
This implementation uses OpenZeppelin's Stylus contracts which are currently in development. Some features like `export-abi` have limitations that will be addressed in v0.2.0. For more information, see [this issue](https://github.com/OpenZeppelin/rust-contracts-stylus/issues/439).
:::

## Features

Learn and implement secure access control functionality:

👑 **Role Management**
  - Define custom roles (like admin, operator, minter)
  - Grant and revoke roles dynamically
  - Hierarchical role structure
  
🔑 **Permission System**
  - Fine-grained access control
  - Role-based function restrictions
  - Custom permission logic
  
👥 **Admin Controls**
  - Default admin role setup
  - Admin role transfer capability
  - Role administrator management
  
🚦 **Access Checks**
  - Role-based authorization
  - Function-level permission checks
  - Secure role validation
  
📝 **Role Administration**
  - Manage role assignments
  - Track role memberships
  - Handle role hierarchies
  
🛡️ **Security Features**
  - Role revocation protection
  - Admin role safeguards
  - Permission inheritance checks
  
⚡ **Gas Optimization**
  - Efficient role checks
  - Optimized storage layout
  - Minimal operation costs

## Implementation

```rust
#![cfg_attr(not(test), no_main)]
extern crate alloc;

use alloc::vec::Vec;

use alloy_primitives::{Address, B256, U256};
use openzeppelin_stylus::{
    access::control::AccessControl,
    token::erc20::{Erc20, IErc20},
};
use stylus_sdk::prelude::{entrypoint, public, storage};

#[entrypoint]
#[storage]
struct AccessControlExample {
    #[borrow]
    pub erc20: Erc20,
    #[borrow]
    pub access: AccessControl,
}

pub const TRANSFER_ROLE: [u8; 32] =
    keccak_const::Keccak256::new().update(b"TRANSFER_ROLE").finalize();

#[public]
#[inherit(Erc20, AccessControl)]
impl AccessControlExample {
    pub fn make_admin(&mut self, account: Address) -> Result<(), Vec<u8>> {
        self.access.only_role(AccessControl::DEFAULT_ADMIN_ROLE.into())?;
        self.access.grant_role(TRANSFER_ROLE.into(), account)?;
        Ok(())
    }

    pub fn transfer_from(
        &mut self,
        from: Address,
        to: Address,
        value: U256,
    ) -> Result<bool, Vec<u8>> {
        self.access.only_role(TRANSFER_ROLE.into())?;
        let transfer_result = self.erc20.transfer_from(from, to, value)?;
        Ok(transfer_result)
    }

    // WARNING: This should not be part of the public API, it's here for testing
    // purposes only.
    pub fn set_role_admin(&mut self, role: B256, new_admin_role: B256) {
        self.access._set_role_admin(role, new_admin_role)
    }
}
```