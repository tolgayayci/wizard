# Counter Smart Contract

A simple but powerful smart contract for learning Stylus development. Think of it as a digital counter that can be incremented, set to specific values, and perform basic math operations - perfect for understanding how state management works in blockchain applications.

## Features

Learn and implement fundamental smart contract concepts:

🔢 **Basic Operations**
  - Get current counter value
  - Set counter to specific number
  - Increment counter by one
  
➗ **Math Functions**
  - Add numbers to counter
  - Multiply counter value
  - Basic arithmetic operations
  
💾 **State Management**
  - Persistent storage handling
  - State updates and reads
  - Data type management
  
🔄 **Contract Interactions**
  - Public function calls
  - State modifications
  - Return value handling
  
⚡ **Gas Optimization**
  - Efficient storage usage
  - Minimal operation costs
  - Optimized state updates

## Implementation

```rust
extern crate alloc;

/// Import items from the SDK. The prelude contains common traits and macros.
use stylus_sdk::{alloy_primitives::U256, prelude::*};

// Define some persistent storage using the Solidity ABI.
// Counter will be the entrypoint.
sol_storage! {
    #[entrypoint]
    pub struct Counter {
        uint256 number;
    }
}

/// Declare that Counter is a contract with the following external methods.
#[public]
impl Counter {
    /// Gets the number from storage.
    pub fn number(&self) -> U256 {
        self.number.get()
    }

    /// Sets a number in storage to a user-specified value.
    pub fn set_number(&mut self, new_number: U256) {
        self.number.set(new_number);
    }

    /// Sets a number in storage to a user-specified value.
    pub fn mul_number(&mut self, new_number: U256) {
        self.number.set(new_number * self.number.get());
    }

    /// Sets a number in storage to a user-specified value.
    pub fn add_number(&mut self, new_number: U256) {
        self.number.set(new_number + self.number.get());
    }

    /// Increments `number` and updates its value in storage.
    pub fn increment(&mut self) {
        let number = self.number.get();
        self.set_number(number + U256::from(1));
    }
}
```