import { 
  Code2, 
  Coins, 
  ImageIcon, 
  Layers, 
  ShieldCheck, 
  KeyRound,
  Clock,
  Users,
  Gift,
  Lock,
  Gamepad2
} from 'lucide-react';

const COUNTER_CODE = `// Simple Counter Contract - Perfect for beginners
// Dependencies: stylus-sdk = "0.9.0"

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
    /// Gets the current counter value
    pub fn number(&self) -> U256 {
        self.number.get()
    }

    /// Sets a number in storage to a user-specified value
    pub fn set_number(&mut self, new_number: U256) {
        self.number.set(new_number);
    }

    /// Multiplies the current number by the input
    pub fn mul_number(&mut self, multiplier: U256) {
        self.number.set(multiplier * self.number.get());
    }

    /// Adds the input to the current number
    pub fn add_number(&mut self, add_amount: U256) {
        self.number.set(add_amount + self.number.get());
    }

    /// Increments the counter by 1
    pub fn increment(&mut self) {
        let number = self.number.get();
        self.set_number(number + U256::from(1));
    }

    /// Decrements the counter by 1
    pub fn decrement(&mut self) {
        let number = self.number.get();
        if number > U256::from(0) {
            self.set_number(number - U256::from(1));
        }
    }

    /// Resets the counter to zero
    pub fn reset(&mut self) {
        self.number.set(U256::from(0));
    }
}`;

const ERC20_CODE = `// OpenZeppelin ERC-20 Token Implementation
// Dependencies: stylus-sdk = "0.6.0", openzeppelin-stylus = "0.3.0-alpha.1"

extern crate alloc;

use stylus_sdk::{alloy_primitives::U256, prelude::*};
use openzeppelin_stylus::token::erc20::{Erc20, IErc20};

// Storage for our ERC-20 token using OpenZeppelin's implementation
sol_storage! {
    #[entrypoint]
    pub struct MyToken {
        #[borrow]
        erc20: Erc20,
        owner: Address,
        paused: bool,
    }
}

// Implement the ERC-20 interface
#[public]
impl IErc20 for MyToken {
    fn name(&self) -> String {
        self.erc20.name()
    }

    fn symbol(&self) -> String {
        self.erc20.symbol()
    }

    fn decimals(&self) -> u8 {
        self.erc20.decimals()
    }

    fn total_supply(&self) -> U256 {
        self.erc20.total_supply()
    }

    fn balance_of(&self, account: Address) -> U256 {
        self.erc20.balance_of(account)
    }

    fn transfer(&mut self, to: Address, amount: U256) -> bool {
        require!(!self.paused.get(), "Token transfers are paused");
        self.erc20.transfer(to, amount)
    }

    fn transfer_from(&mut self, from: Address, to: Address, amount: U256) -> bool {
        require!(!self.paused.get(), "Token transfers are paused");
        self.erc20.transfer_from(from, to, amount)
    }

    fn approve(&mut self, spender: Address, amount: U256) -> bool {
        self.erc20.approve(spender, amount)
    }

    fn allowance(&self, owner: Address, spender: Address) -> U256 {
        self.erc20.allowance(owner, spender)
    }
}

// Additional functionality beyond ERC-20
#[public]
impl MyToken {
    // Initialize the token with name, symbol, and initial supply
    pub fn init(&mut self, name: String, symbol: String, initial_supply: U256) {
        self.erc20._mint(msg::sender(), initial_supply);
        self.owner.set(msg::sender());
        self.paused.set(false);
    }

    // Mint new tokens (only owner)
    pub fn mint(&mut self, to: Address, amount: U256) {
        require!(msg::sender() == self.owner.get(), "Only owner can mint");
        require!(!self.paused.get(), "Minting is paused");
        self.erc20._mint(to, amount);
    }

    // Burn tokens from caller's balance
    pub fn burn(&mut self, amount: U256) {
        require!(!self.paused.get(), "Burning is paused");
        self.erc20._burn(msg::sender(), amount);
    }

    // Pause/unpause the contract (only owner)
    pub fn pause(&mut self) {
        require!(msg::sender() == self.owner.get(), "Only owner can pause");
        self.paused.set(true);
    }

    pub fn unpause(&mut self) {
        require!(msg::sender() == self.owner.get(), "Only owner can unpause");
        self.paused.set(false);
    }

    // Transfer ownership (only current owner)
    pub fn transfer_ownership(&mut self, new_owner: Address) {
        require!(msg::sender() == self.owner.get(), "Only owner can transfer ownership");
        require!(new_owner != Address::ZERO, "New owner cannot be zero address");
        self.owner.set(new_owner);
    }

    // View functions
    pub fn owner(&self) -> Address {
        self.owner.get()
    }

    pub fn paused(&self) -> bool {
        self.paused.get()
    }
}`;

const ERC721_CODE = `// OpenZeppelin ERC-721 NFT Collection Implementation
// Dependencies: stylus-sdk = "0.6.0", openzeppelin-stylus = "0.3.0-alpha.1"

extern crate alloc;

use stylus_sdk::{alloy_primitives::U256, prelude::*};
use openzeppelin_stylus::token::erc721::{Erc721, IErc721};
use openzeppelin_stylus::token::erc721::extensions::metadata::IErc721Metadata;
use openzeppelin_stylus::token::erc721::extensions::enumerable::IErc721Enumerable;

// Storage for our NFT collection using OpenZeppelin's implementation
sol_storage! {
    #[entrypoint]
    pub struct GameItem {
        #[borrow]
        erc721: Erc721,
        owner: Address,
        next_token_id: StorageU256,
        max_supply: StorageU256,
        mint_price: StorageU256,
        paused: bool,
        base_uri: String,
    }
}

// Implement the ERC-721 interface
#[public]
impl IErc721 for GameItem {
    fn balance_of(&self, owner: Address) -> U256 {
        self.erc721.balance_of(owner)
    }

    fn owner_of(&self, token_id: U256) -> Address {
        self.erc721.owner_of(token_id)
    }

    fn safe_transfer_from(&mut self, from: Address, to: Address, token_id: U256) {
        require!(!self.paused.get(), "Contract is paused");
        self.erc721.safe_transfer_from(from, to, token_id)
    }

    fn transfer_from(&mut self, from: Address, to: Address, token_id: U256) {
        require!(!self.paused.get(), "Contract is paused");
        self.erc721.transfer_from(from, to, token_id)
    }

    fn approve(&mut self, to: Address, token_id: U256) {
        self.erc721.approve(to, token_id)
    }

    fn set_approval_for_all(&mut self, operator: Address, approved: bool) {
        self.erc721.set_approval_for_all(operator, approved)
    }

    fn get_approved(&self, token_id: U256) -> Address {
        self.erc721.get_approved(token_id)
    }

    fn is_approved_for_all(&self, owner: Address, operator: Address) -> bool {
        self.erc721.is_approved_for_all(owner, operator)
    }
}

// Implement metadata interface
#[public]
impl IErc721Metadata for GameItem {
    fn name(&self) -> String {
        self.erc721.name()
    }

    fn symbol(&self) -> String {
        self.erc721.symbol()
    }

    fn token_uri(&self, token_id: U256) -> String {
        require!(self.erc721._exists(token_id), "Token does not exist");
        format!("{}{}", self.base_uri.get(), token_id.to_string())
    }
}

// Additional functionality beyond ERC-721
#[public]
impl GameItem {
    // Initialize the NFT collection
    pub fn init(&mut self, name: String, symbol: String, base_uri: String, max_supply: U256, mint_price: U256) {
        self.erc721._set_name_symbol(&name, &symbol);
        self.owner.set(msg::sender());
        self.next_token_id.set(U256::from(1));
        self.max_supply.set(max_supply);
        self.mint_price.set(mint_price);
        self.paused.set(false);
        self.base_uri.set(base_uri);
    }

    // Mint a new NFT (public minting)
    pub fn mint(&mut self, to: Address) -> U256 {
        require!(!self.paused.get(), "Minting is paused");
        require!(msg::value() >= self.mint_price.get(), "Insufficient payment");
        
        let token_id = self.next_token_id.get();
        require!(token_id <= self.max_supply.get(), "Max supply reached");
        
        self.erc721._mint(to, token_id);
        self.next_token_id.set(token_id + U256::from(1));
        
        token_id
    }

    // Owner mint (free minting by contract owner)
    pub fn owner_mint(&mut self, to: Address, quantity: U256) {
        require!(msg::sender() == self.owner.get(), "Only owner can mint");
        
        for i in 0..quantity.as_u32() {
            let token_id = self.next_token_id.get();
            if token_id > self.max_supply.get() {
                break;
            }
            
            self.erc721._mint(to, token_id);
            self.next_token_id.set(token_id + U256::from(1));
        }
    }

    // Burn a token
    pub fn burn(&mut self, token_id: U256) {
        require!(self.erc721._is_approved_or_owner(msg::sender(), token_id), "Not approved or owner");
        self.erc721._burn(token_id);
    }

    // Set base URI for metadata (only owner)
    pub fn set_base_uri(&mut self, new_base_uri: String) {
        require!(msg::sender() == self.owner.get(), "Only owner can set base URI");
        self.base_uri.set(new_base_uri);
    }

    // Set mint price (only owner)
    pub fn set_mint_price(&mut self, new_price: U256) {
        require!(msg::sender() == self.owner.get(), "Only owner can set price");
        self.mint_price.set(new_price);
    }

    // Pause/unpause minting (only owner)
    pub fn pause(&mut self) {
        require!(msg::sender() == self.owner.get(), "Only owner can pause");
        self.paused.set(true);
    }

    pub fn unpause(&mut self) {
        require!(msg::sender() == self.owner.get(), "Only owner can unpause");
        self.paused.set(false);
    }

    // Withdraw contract balance (only owner)
    pub fn withdraw(&mut self) {
        require!(msg::sender() == self.owner.get(), "Only owner can withdraw");
        let balance = address(this).balance;
        msg::sender().transfer(balance);
    }

    // View functions
    pub fn total_supply(&self) -> U256 {
        self.next_token_id.get() - U256::from(1)
    }

    pub fn max_supply(&self) -> U256 {
        self.max_supply.get()
    }

    pub fn mint_price(&self) -> U256 {
        self.mint_price.get()
    }

    pub fn owner(&self) -> Address {
        self.owner.get()
    }

    pub fn paused(&self) -> bool {
        self.paused.get()
    }
}`;

const STAKING_CODE = `// Simple Staking Contract for DeFi Applications
// Dependencies: stylus-sdk = "0.6.0"

extern crate alloc;

use stylus_sdk::{alloy_primitives::U256, prelude::*};
use alloc::collections::BTreeMap;

sol_storage! {
    #[entrypoint]
    pub struct StakingContract {
        // Staking token address
        staking_token: Address,
        
        // Reward token address  
        reward_token: Address,
        
        // Owner of the contract
        owner: Address,
        
        // Total staked amount
        total_staked: StorageU256,
        
        // Reward rate (rewards per second per token staked)
        reward_rate: StorageU256,
        
        // Last time rewards were updated
        last_update_time: StorageU256,
        
        // Accumulated reward per token
        reward_per_token_stored: StorageU256,
        
        // User staked balances
        mapping(address => uint256) user_staked,
        
        // User reward per token paid
        mapping(address => uint256) user_reward_per_token_paid,
        
        // User pending rewards
        mapping(address => uint256) user_rewards,
        
        // Staking start time
        staking_start: StorageU256,
        
        // Staking duration
        staking_duration: StorageU256,
        
        // Contract paused state
        paused: bool,
    }
}

#[public]
impl StakingContract {
    // Initialize the staking contract
    pub fn init(&mut self, staking_token: Address, reward_token: Address, reward_rate: U256, duration: U256) {
        self.staking_token.set(staking_token);
        self.reward_token.set(reward_token);
        self.owner.set(msg::sender());
        self.reward_rate.set(reward_rate);
        self.staking_start.set(block::timestamp());
        self.staking_duration.set(duration);
        self.last_update_time.set(block::timestamp());
        self.paused.set(false);
    }
    
    // Stake tokens
    pub fn stake(&mut self, amount: U256) {
        require!(!self.paused.get(), "Staking is paused");
        require!(amount > U256::from(0), "Cannot stake 0 tokens");
        require!(block::timestamp() < self.staking_start.get() + self.staking_duration.get(), "Staking period ended");
        
        self._update_reward(msg::sender());
        
        let current_stake = self.user_staked.get(msg::sender());
        self.user_staked.setter(msg::sender()).set(current_stake + amount);
        self.total_staked.set(self.total_staked.get() + amount);
        
        // Transfer tokens from user to contract (simplified)
        // In real implementation, use ERC20 transfer
    }
    
    // Withdraw staked tokens
    pub fn withdraw(&mut self, amount: U256) {
        require!(amount > U256::from(0), "Cannot withdraw 0 tokens");
        
        let user_stake = self.user_staked.get(msg::sender());
        require!(user_stake >= amount, "Insufficient staked balance");
        
        self._update_reward(msg::sender());
        
        self.user_staked.setter(msg::sender()).set(user_stake - amount);
        self.total_staked.set(self.total_staked.get() - amount);
        
        // Transfer tokens back to user (simplified)
        // In real implementation, use ERC20 transfer
    }
    
    // Claim rewards
    pub fn claim_rewards(&mut self) {
        self._update_reward(msg::sender());
        
        let reward = self.user_rewards.get(msg::sender());
        require!(reward > U256::from(0), "No rewards to claim");
        
        self.user_rewards.setter(msg::sender()).set(U256::from(0));
        
        // Transfer reward tokens to user (simplified)
        // In real implementation, use ERC20 transfer
    }
    
    // Calculate current reward per token
    fn _reward_per_token(&self) -> U256 {
        if self.total_staked.get() == U256::from(0) {
            return self.reward_per_token_stored.get();
        }
        
        let time_elapsed = block::timestamp() - self.last_update_time.get();
        let reward_increment = time_elapsed * self.reward_rate.get() / self.total_staked.get();
        
        self.reward_per_token_stored.get() + reward_increment
    }
    
    // Calculate earned rewards for a user
    fn _earned(&self, user: Address) -> U256 {
        let user_balance = self.user_staked.get(user);
        let reward_per_token_diff = self._reward_per_token() - self.user_reward_per_token_paid.get(user);
        let new_rewards = user_balance * reward_per_token_diff;
        
        self.user_rewards.get(user) + new_rewards
    }
    
    // Update reward accounting for a user
    fn _update_reward(&mut self, user: Address) {
        let new_reward_per_token = self._reward_per_token();
        self.reward_per_token_stored.set(new_reward_per_token);
        self.last_update_time.set(block::timestamp());
        
        let earned = self._earned(user);
        self.user_rewards.setter(user).set(earned);
        self.user_reward_per_token_paid.setter(user).set(new_reward_per_token);
    }
    
    // Emergency withdraw (only owner)
    pub fn emergency_withdraw(&mut self) {
        require!(msg::sender() == self.owner.get(), "Only owner can emergency withdraw");
        self.paused.set(true);
    }
    
    // View functions
    pub fn staked_balance(&self, user: Address) -> U256 {
        self.user_staked.get(user)
    }
    
    pub fn earned(&self, user: Address) -> U256 {
        self._earned(user)
    }
    
    pub fn total_staked(&self) -> U256 {
        self.total_staked.get()
    }
    
    pub fn reward_rate(&self) -> U256 {
        self.reward_rate.get()
    }
    
    pub fn time_remaining(&self) -> U256 {
        let end_time = self.staking_start.get() + self.staking_duration.get();
        if block::timestamp() >= end_time {
            return U256::from(0);
        }
        end_time - block::timestamp()
    }
}`;

const VESTING_CODE = `// Token Vesting Contract with Linear and Cliff Options
// Dependencies: stylus-sdk = "0.6.0"

extern crate alloc;

use stylus_sdk::{alloy_primitives::U256, prelude::*};

sol_storage! {
    #[entrypoint]
    pub struct VestingContract {
        // Token being vested
        token: Address,
        
        // Contract owner
        owner: Address,
        
        // Beneficiary details
        mapping(address => VestingSchedule) vesting_schedules,
        
        // Total tokens allocated
        total_allocated: StorageU256,
    }
}

// Vesting schedule structure
sol_storage! {
    pub struct VestingSchedule {
        // Total amount to be vested
        total_amount: StorageU256,
        
        // Amount already released
        released: StorageU256,
        
        // Start time of vesting
        start: StorageU256,
        
        // Cliff duration in seconds
        cliff: StorageU256,
        
        // Total vesting duration in seconds
        duration: StorageU256,
        
        // Whether the vesting is revocable
        revocable: bool,
        
        // Whether the vesting has been revoked
        revoked: bool,
    }
}

#[public]
impl VestingContract {
    // Initialize vesting contract
    pub fn init(&mut self, token: Address) {
        self.token.set(token);
        self.owner.set(msg::sender());
    }
    
    // Create a vesting schedule for a beneficiary
    pub fn create_vesting_schedule(
        &mut self, 
        beneficiary: Address, 
        total_amount: U256, 
        start: U256, 
        cliff_duration: U256, 
        duration: U256,
        revocable: bool
    ) {
        require!(msg::sender() == self.owner.get(), "Only owner can create vesting schedules");
        require!(beneficiary != Address::ZERO, "Beneficiary cannot be zero address");
        require!(total_amount > U256::from(0), "Total amount must be greater than 0");
        require!(duration > U256::from(0), "Duration must be greater than 0");
        require!(duration >= cliff_duration, "Duration must be >= cliff duration");
        
        let schedule = self.vesting_schedules.get(beneficiary);
        require!(schedule.total_amount.get() == U256::from(0), "Vesting schedule already exists");
        
        let mut new_schedule = VestingSchedule::default();
        new_schedule.total_amount.set(total_amount);
        new_schedule.start.set(start);
        new_schedule.cliff.set(cliff_duration);
        new_schedule.duration.set(duration);
        new_schedule.revocable.set(revocable);
        new_schedule.revoked.set(false);
        new_schedule.released.set(U256::from(0));
        
        self.vesting_schedules.setter(beneficiary).set(new_schedule);
        self.total_allocated.set(self.total_allocated.get() + total_amount);
        
        // Transfer tokens to contract (simplified)
        // In real implementation, use ERC20 transferFrom
    }
    
    // Release vested tokens to beneficiary
    pub fn release(&mut self) {
        let beneficiary = msg::sender();
        let schedule = self.vesting_schedules.get(beneficiary);
        
        require!(schedule.total_amount.get() > U256::from(0), "No vesting schedule found");
        require!(!schedule.revoked.get(), "Vesting has been revoked");
        
        let releasable = self._releasable_amount(beneficiary);
        require!(releasable > U256::from(0), "No tokens to release");
        
        let mut updated_schedule = schedule;
        updated_schedule.released.set(schedule.released.get() + releasable);
        self.vesting_schedules.setter(beneficiary).set(updated_schedule);
        
        // Transfer tokens to beneficiary (simplified)
        // In real implementation, use ERC20 transfer
    }
    
    // Revoke vesting schedule (if revocable)
    pub fn revoke(&mut self, beneficiary: Address) {
        require!(msg::sender() == self.owner.get(), "Only owner can revoke");
        
        let schedule = self.vesting_schedules.get(beneficiary);
        require!(schedule.total_amount.get() > U256::from(0), "No vesting schedule found");
        require!(schedule.revocable.get(), "Vesting is not revocable");
        require!(!schedule.revoked.get(), "Already revoked");
        
        let releasable = self._releasable_amount(beneficiary);
        if releasable > U256::from(0) {
            // Release any vested tokens first
            let mut updated_schedule = schedule;
            updated_schedule.released.set(schedule.released.get() + releasable);
            self.vesting_schedules.setter(beneficiary).set(updated_schedule);
            
            // Transfer releasable tokens to beneficiary
        }
        
        // Mark as revoked
        let mut final_schedule = self.vesting_schedules.get(beneficiary);
        final_schedule.revoked.set(true);
        self.vesting_schedules.setter(beneficiary).set(final_schedule);
        
        // Return unvested tokens to owner
        let unvested = schedule.total_amount.get() - final_schedule.released.get();
        if unvested > U256::from(0) {
            // Transfer unvested tokens back to owner
        }
    }
    
    // Calculate releasable amount for a beneficiary
    fn _releasable_amount(&self, beneficiary: Address) -> U256 {
        self._vested_amount(beneficiary) - self.vesting_schedules.get(beneficiary).released.get()
    }
    
    // Calculate vested amount for a beneficiary
    fn _vested_amount(&self, beneficiary: Address) -> U256 {
        let schedule = self.vesting_schedules.get(beneficiary);
        
        if schedule.revoked.get() {
            return schedule.released.get();
        }
        
        let current_time = block::timestamp();
        let cliff_time = schedule.start.get() + schedule.cliff.get();
        
        if current_time < cliff_time {
            return U256::from(0);
        }
        
        let end_time = schedule.start.get() + schedule.duration.get();
        if current_time >= end_time {
            return schedule.total_amount.get();
        }
        
        let elapsed = current_time - schedule.start.get();
        (schedule.total_amount.get() * elapsed) / schedule.duration.get()
    }
    
    // View functions
    pub fn vested_amount(&self, beneficiary: Address) -> U256 {
        self._vested_amount(beneficiary)
    }
    
    pub fn releasable_amount(&self, beneficiary: Address) -> U256 {
        self._releasable_amount(beneficiary)
    }
    
    pub fn get_vesting_schedule(&self, beneficiary: Address) -> (U256, U256, U256, U256, U256, bool, bool) {
        let schedule = self.vesting_schedules.get(beneficiary);
        (
            schedule.total_amount.get(),
            schedule.released.get(),
            schedule.start.get(),
            schedule.cliff.get(),
            schedule.duration.get(),
            schedule.revocable.get(),
            schedule.revoked.get()
        )
    }
}`;

const GOVERNANCE_CODE = `// Simple Governance/DAO Voting Contract
// Dependencies: stylus-sdk = "0.6.0"

extern crate alloc;

use stylus_sdk::{alloy_primitives::U256, prelude::*};
use alloc::string::String;

sol_storage! {
    #[entrypoint]
    pub struct GovernanceDAO {
        // Governance token address
        governance_token: Address,
        
        // DAO name
        name: String,
        
        // Owner/admin
        owner: Address,
        
        // Proposal counter
        proposal_count: StorageU256,
        
        // Minimum tokens needed to create proposal
        min_proposal_threshold: StorageU256,
        
        // Voting period in seconds
        voting_period: StorageU256,
        
        // Quorum percentage (basis points, 1000 = 10%)
        quorum_percentage: StorageU256,
        
        // Proposals mapping
        mapping(uint256 => Proposal) proposals,
        
        // User votes on proposals
        mapping(uint256 => mapping(address => bool)) has_voted,
        mapping(uint256 => mapping(address => bool)) vote_choice,
    }
}

sol_storage! {
    pub struct Proposal {
        // Proposal ID
        id: StorageU256,
        
        // Proposer address
        proposer: Address,
        
        // Proposal title and description
        title: String,
        description: String,
        
        // Vote counts
        votes_for: StorageU256,
        votes_against: StorageU256,
        
        // Timestamps
        start_time: StorageU256,
        end_time: StorageU256,
        
        // Status
        executed: bool,
        cancelled: bool,
        
        // Target contract and data for execution
        target: Address,
        call_data: String,
    }
}

#[public]
impl GovernanceDAO {
    // Initialize the DAO
    pub fn init(&mut self, 
        name: String, 
        governance_token: Address, 
        min_threshold: U256,
        voting_period_seconds: U256,
        quorum_bp: U256
    ) {
        self.name.set(name);
        self.governance_token.set(governance_token);
        self.owner.set(msg::sender());
        self.min_proposal_threshold.set(min_threshold);
        self.voting_period.set(voting_period_seconds);
        self.quorum_percentage.set(quorum_bp);
        self.proposal_count.set(U256::from(0));
    }
    
    // Create a new proposal
    pub fn create_proposal(
        &mut self,
        title: String,
        description: String,
        target: Address,
        call_data: String
    ) -> U256 {
        // Check proposer has minimum tokens (simplified check)
        require!(self._get_voting_power(msg::sender()) >= self.min_proposal_threshold.get(), "Insufficient tokens to propose");
        
        let proposal_id = self.proposal_count.get() + U256::from(1);
        self.proposal_count.set(proposal_id);
        
        let mut proposal = Proposal::default();
        proposal.id.set(proposal_id);
        proposal.proposer.set(msg::sender());
        proposal.title.set(title);
        proposal.description.set(description);
        proposal.target.set(target);
        proposal.call_data.set(call_data);
        proposal.start_time.set(block::timestamp());
        proposal.end_time.set(block::timestamp() + self.voting_period.get());
        proposal.votes_for.set(U256::from(0));
        proposal.votes_against.set(U256::from(0));
        proposal.executed.set(false);
        proposal.cancelled.set(false);
        
        self.proposals.setter(proposal_id).set(proposal);
        
        proposal_id
    }
    
    // Vote on a proposal
    pub fn vote(&mut self, proposal_id: U256, support: bool) {
        let proposal = self.proposals.get(proposal_id);
        require!(proposal.id.get() == proposal_id, "Proposal does not exist");
        require!(block::timestamp() >= proposal.start_time.get(), "Voting has not started");
        require!(block::timestamp() <= proposal.end_time.get(), "Voting has ended");
        require!(!proposal.executed.get(), "Proposal already executed");
        require!(!proposal.cancelled.get(), "Proposal cancelled");
        require!(!self.has_voted.get(proposal_id).get(msg::sender()), "Already voted");
        
        let voting_power = self._get_voting_power(msg::sender());
        require!(voting_power > U256::from(0), "No voting power");
        
        self.has_voted.setter(proposal_id).setter(msg::sender()).set(true);
        self.vote_choice.setter(proposal_id).setter(msg::sender()).set(support);
        
        let mut updated_proposal = proposal;
        if support {
            updated_proposal.votes_for.set(proposal.votes_for.get() + voting_power);
        } else {
            updated_proposal.votes_against.set(proposal.votes_against.get() + voting_power);
        }
        
        self.proposals.setter(proposal_id).set(updated_proposal);
    }
    
    // Execute a successful proposal
    pub fn execute_proposal(&mut self, proposal_id: U256) {
        let proposal = self.proposals.get(proposal_id);
        require!(proposal.id.get() == proposal_id, "Proposal does not exist");
        require!(block::timestamp() > proposal.end_time.get(), "Voting still active");
        require!(!proposal.executed.get(), "Already executed");
        require!(!proposal.cancelled.get(), "Proposal cancelled");
        
        // Check if proposal passed
        let total_votes = proposal.votes_for.get() + proposal.votes_against.get();
        let total_supply = self._get_total_supply(); // Total governance tokens
        let required_quorum = (total_supply * self.quorum_percentage.get()) / U256::from(10000);
        
        require!(total_votes >= required_quorum, "Quorum not reached");
        require!(proposal.votes_for.get() > proposal.votes_against.get(), "Proposal failed");
        
        let mut updated_proposal = proposal;
        updated_proposal.executed.set(true);
        self.proposals.setter(proposal_id).set(updated_proposal);
        
        // Execute the proposal (simplified - in reality would make external call)
        // call(proposal.target, proposal.call_data);
    }
    
    // Cancel a proposal (only owner or proposer)
    pub fn cancel_proposal(&mut self, proposal_id: U256) {
        let proposal = self.proposals.get(proposal_id);
        require!(proposal.id.get() == proposal_id, "Proposal does not exist");
        require!(!proposal.executed.get(), "Cannot cancel executed proposal");
        require!(
            msg::sender() == proposal.proposer.get() || msg::sender() == self.owner.get(),
            "Only proposer or owner can cancel"
        );
        
        let mut updated_proposal = proposal;
        updated_proposal.cancelled.set(true);
        self.proposals.setter(proposal_id).set(updated_proposal);
    }
    
    // Get voting power for an address (simplified)
    fn _get_voting_power(&self, voter: Address) -> U256 {
        // In real implementation, check ERC20 balance at proposal snapshot
        U256::from(1000) // Simplified
    }
    
    // Get total supply of governance tokens (simplified)
    fn _get_total_supply(&self) -> U256 {
        // In real implementation, get from governance token contract
        U256::from(1000000) // Simplified
    }
    
    // View functions
    pub fn get_proposal(&self, proposal_id: U256) -> (Address, String, String, U256, U256, U256, U256, bool, bool) {
        let proposal = self.proposals.get(proposal_id);
        (
            proposal.proposer.get(),
            proposal.title.get(),
            proposal.description.get(),
            proposal.votes_for.get(),
            proposal.votes_against.get(),
            proposal.start_time.get(),
            proposal.end_time.get(),
            proposal.executed.get(),
            proposal.cancelled.get()
        )
    }
    
    pub fn has_voted(&self, proposal_id: U256, voter: Address) -> bool {
        self.has_voted.get(proposal_id).get(voter)
    }
    
    pub fn get_vote(&self, proposal_id: U256, voter: Address) -> bool {
        self.vote_choice.get(proposal_id).get(voter)
    }
    
    pub fn proposal_count(&self) -> U256 {
        self.proposal_count.get()
    }
}`;

const CROWDFUNDING_CODE = `// Crowdfunding Campaign Contract
// Dependencies: stylus-sdk = "0.6.0"

extern crate alloc;

use stylus_sdk::{alloy_primitives::U256, prelude::*};
use alloc::string::String;

sol_storage! {
    #[entrypoint]
    pub struct CrowdfundingCampaign {
        // Campaign details
        creator: Address,
        title: String,
        description: String,
        goal: StorageU256,
        deadline: StorageU256,
        
        // Campaign state
        total_raised: StorageU256,
        campaign_ended: bool,
        goal_reached: bool,
        funds_withdrawn: bool,
        
        // Contributor tracking
        mapping(address => uint256) contributions,
        contributors_count: StorageU256,
        
        // Refund state
        refunds_enabled: bool,
    }
}

#[public]
impl CrowdfundingCampaign {
    // Initialize campaign
    pub fn init(&mut self, title: String, description: String, goal: U256, duration_days: U256) {
        require!(goal > U256::from(0), "Goal must be greater than 0");
        require!(duration_days > U256::from(0), "Duration must be greater than 0");
        
        self.creator.set(msg::sender());
        self.title.set(title);
        self.description.set(description);
        self.goal.set(goal);
        self.deadline.set(block::timestamp() + (duration_days * 86400)); // Convert days to seconds
        self.total_raised.set(U256::from(0));
        self.campaign_ended.set(false);
        self.goal_reached.set(false);
        self.funds_withdrawn.set(false);
        self.contributors_count.set(U256::from(0));
        self.refunds_enabled.set(false);
    }
    
    // Contribute to campaign
    pub fn contribute(&mut self) {
        require!(!self.campaign_ended.get(), "Campaign has ended");
        require!(block::timestamp() < self.deadline.get(), "Campaign deadline passed");
        require!(msg::value() > U256::from(0), "Contribution must be greater than 0");
        
        let current_contribution = self.contributions.get(msg::sender());
        if current_contribution == U256::from(0) {
            // New contributor
            self.contributors_count.set(self.contributors_count.get() + U256::from(1));
        }
        
        self.contributions.setter(msg::sender()).set(current_contribution + msg::value());
        self.total_raised.set(self.total_raised.get() + msg::value());
        
        // Check if goal is reached
        if self.total_raised.get() >= self.goal.get() {
            self.goal_reached.set(true);
        }
    }
    
    // End campaign (can be called by anyone after deadline)
    pub fn end_campaign(&mut self) {
        require!(!self.campaign_ended.get(), "Campaign already ended");
        require!(
            block::timestamp() >= self.deadline.get() || self.goal_reached.get(),
            "Campaign still active"
        );
        
        self.campaign_ended.set(true);
        
        if !self.goal_reached.get() {
            // Enable refunds if goal not reached
            self.refunds_enabled.set(true);
        }
    }
    
    // Withdraw funds (only creator, only if goal reached)
    pub fn withdraw_funds(&mut self) {
        require!(msg::sender() == self.creator.get(), "Only creator can withdraw");
        require!(self.campaign_ended.get(), "Campaign not ended");
        require!(self.goal_reached.get(), "Goal not reached");
        require!(!self.funds_withdrawn.get(), "Funds already withdrawn");
        
        self.funds_withdrawn.set(true);
        let amount = self.total_raised.get();
        
        // Transfer funds to creator
        msg::sender().transfer(amount);
    }
    
    // Request refund (only if campaign failed)
    pub fn request_refund(&mut self) {
        require!(self.campaign_ended.get(), "Campaign not ended");
        require!(self.refunds_enabled.get(), "Refunds not available");
        require!(!self.goal_reached.get(), "Campaign succeeded, no refunds");
        
        let contribution = self.contributions.get(msg::sender());
        require!(contribution > U256::from(0), "No contribution found");
        
        self.contributions.setter(msg::sender()).set(U256::from(0));
        
        // Transfer refund to contributor
        msg::sender().transfer(contribution);
    }
    
    // Emergency withdraw (only creator in case of issues)
    pub fn emergency_withdraw(&mut self) {
        require!(msg::sender() == self.creator.get(), "Only creator can emergency withdraw");
        require!(!self.funds_withdrawn.get(), "Funds already withdrawn");
        
        self.campaign_ended.set(true);
        self.refunds_enabled.set(true);
        
        // In emergency, enable refunds for all contributors
    }
    
    // View functions
    pub fn get_campaign_info(&self) -> (String, String, U256, U256, U256, bool, bool) {
        (
            self.title.get(),
            self.description.get(),
            self.goal.get(),
            self.total_raised.get(),
            self.deadline.get(),
            self.goal_reached.get(),
            self.campaign_ended.get()
        )
    }
    
    pub fn get_contribution(&self, contributor: Address) -> U256 {
        self.contributions.get(contributor)
    }
    
    pub fn time_remaining(&self) -> U256 {
        if block::timestamp() >= self.deadline.get() {
            return U256::from(0);
        }
        self.deadline.get() - block::timestamp()
    }
    
    pub fn progress_percentage(&self) -> U256 {
        if self.goal.get() == U256::from(0) {
            return U256::from(0);
        }
        (self.total_raised.get() * U256::from(100)) / self.goal.get()
    }
}`;

const ESCROW_CODE = `// Simple Escrow Service Contract
// Dependencies: stylus-sdk = "0.6.0"

extern crate alloc;

use stylus_sdk::{alloy_primitives::U256, prelude::*};

sol_storage! {
    #[entrypoint]
    pub struct EscrowService {
        // Escrow ID counter
        escrow_counter: StorageU256,
        
        // Escrow details
        mapping(uint256 => Escrow) escrows,
    }
}

sol_storage! {
    pub struct Escrow {
        // Parties involved
        buyer: Address,
        seller: Address,
        arbiter: Address,
        
        // Escrow details
        amount: StorageU256,
        description: String,
        
        // State
        funded: bool,
        completed: bool,
        disputed: bool,
        cancelled: bool,
        
        // Timestamps
        created_at: StorageU256,
        deadline: StorageU256,
        
        // Resolution
        buyer_approved: bool,
        seller_delivered: bool,
        arbiter_decision: StorageU256, // 0: none, 1: buyer, 2: seller
    }
}

#[public]
impl EscrowService {
    // Initialize escrow service
    pub fn init(&mut self) {
        self.escrow_counter.set(U256::from(0));
    }
    
    // Create new escrow
    pub fn create_escrow(
        &mut self,
        seller: Address,
        arbiter: Address,
        description: String,
        deadline_days: U256
    ) -> U256 {
        require!(seller != Address::ZERO, "Invalid seller address");
        require!(arbiter != Address::ZERO, "Invalid arbiter address");
        require!(seller != msg::sender(), "Buyer cannot be seller");
        require!(arbiter != msg::sender(), "Buyer cannot be arbiter");
        require!(arbiter != seller, "Arbiter cannot be seller");
        require!(msg::value() > U256::from(0), "Must send ETH to escrow");
        
        let escrow_id = self.escrow_counter.get() + U256::from(1);
        self.escrow_counter.set(escrow_id);
        
        let mut escrow = Escrow::default();
        escrow.buyer.set(msg::sender());
        escrow.seller.set(seller);
        escrow.arbiter.set(arbiter);
        escrow.amount.set(msg::value());
        escrow.description.set(description);
        escrow.funded.set(true);
        escrow.created_at.set(block::timestamp());
        escrow.deadline.set(block::timestamp() + (deadline_days * 86400));
        
        self.escrows.setter(escrow_id).set(escrow);
        
        escrow_id
    }
    
    // Seller confirms delivery
    pub fn confirm_delivery(&mut self, escrow_id: U256) {
        let escrow = self.escrows.get(escrow_id);
        require!(escrow.funded.get(), "Escrow not funded");
        require!(!escrow.completed.get(), "Escrow already completed");
        require!(!escrow.cancelled.get(), "Escrow cancelled");
        require!(msg::sender() == escrow.seller.get(), "Only seller can confirm delivery");
        
        let mut updated_escrow = escrow;
        updated_escrow.seller_delivered.set(true);
        self.escrows.setter(escrow_id).set(updated_escrow);
        
        // Auto-complete if buyer already approved
        if escrow.buyer_approved.get() {
            self._complete_escrow(escrow_id);
        }
    }
    
    // Buyer approves delivery
    pub fn approve_delivery(&mut self, escrow_id: U256) {
        let escrow = self.escrows.get(escrow_id);
        require!(escrow.funded.get(), "Escrow not funded");
        require!(!escrow.completed.get(), "Escrow already completed");
        require!(!escrow.cancelled.get(), "Escrow cancelled");
        require!(msg::sender() == escrow.buyer.get(), "Only buyer can approve");
        
        let mut updated_escrow = escrow;
        updated_escrow.buyer_approved.set(true);
        self.escrows.setter(escrow_id).set(updated_escrow);
        
        // Auto-complete if seller already delivered
        if escrow.seller_delivered.get() {
            self._complete_escrow(escrow_id);
        }
    }
    
    // Dispute escrow
    pub fn dispute_escrow(&mut self, escrow_id: U256) {
        let escrow = self.escrows.get(escrow_id);
        require!(escrow.funded.get(), "Escrow not funded");
        require!(!escrow.completed.get(), "Escrow already completed");
        require!(!escrow.cancelled.get(), "Escrow cancelled");
        require!(!escrow.disputed.get(), "Already disputed");
        require!(
            msg::sender() == escrow.buyer.get() || msg::sender() == escrow.seller.get(),
            "Only buyer or seller can dispute"
        );
        
        let mut updated_escrow = escrow;
        updated_escrow.disputed.set(true);
        self.escrows.setter(escrow_id).set(updated_escrow);
    }
    
    // Arbiter resolves dispute
    pub fn resolve_dispute(&mut self, escrow_id: U256, decision: U256) {
        let escrow = self.escrows.get(escrow_id);
        require!(escrow.disputed.get(), "No dispute to resolve");
        require!(!escrow.completed.get(), "Escrow already completed");
        require!(msg::sender() == escrow.arbiter.get(), "Only arbiter can resolve");
        require!(decision == U256::from(1) || decision == U256::from(2), "Invalid decision");
        
        let mut updated_escrow = escrow;
        updated_escrow.arbiter_decision.set(decision);
        self.escrows.setter(escrow_id).set(updated_escrow);
        
        if decision == U256::from(1) {
            // Decision for buyer - refund
            escrow.buyer.get().transfer(escrow.amount.get());
        } else {
            // Decision for seller - release funds
            escrow.seller.get().transfer(escrow.amount.get());
        }
        
        updated_escrow.completed.set(true);
        self.escrows.setter(escrow_id).set(updated_escrow);
    }
    
    // Cancel escrow (only before any approvals/delivery)
    pub fn cancel_escrow(&mut self, escrow_id: U256) {
        let escrow = self.escrows.get(escrow_id);
        require!(escrow.funded.get(), "Escrow not funded");
        require!(!escrow.completed.get(), "Escrow already completed");
        require!(!escrow.disputed.get(), "Cannot cancel disputed escrow");
        require!(!escrow.buyer_approved.get() && !escrow.seller_delivered.get(), "Cannot cancel after approvals");
        require!(
            msg::sender() == escrow.buyer.get() || msg::sender() == escrow.seller.get(),
            "Only buyer or seller can cancel"
        );
        
        let mut updated_escrow = escrow;
        updated_escrow.cancelled.set(true);
        self.escrows.setter(escrow_id).set(updated_escrow);
        
        // Refund to buyer
        escrow.buyer.get().transfer(escrow.amount.get());
    }
    
    // Internal function to complete escrow
    fn _complete_escrow(&mut self, escrow_id: U256) {
        let escrow = self.escrows.get(escrow_id);
        
        let mut updated_escrow = escrow;
        updated_escrow.completed.set(true);
        self.escrows.setter(escrow_id).set(updated_escrow);
        
        // Release funds to seller
        escrow.seller.get().transfer(escrow.amount.get());
    }
    
    // Emergency timeout (if deadline passed and no resolution)
    pub fn timeout_refund(&mut self, escrow_id: U256) {
        let escrow = self.escrows.get(escrow_id);
        require!(escrow.funded.get(), "Escrow not funded");
        require!(!escrow.completed.get(), "Escrow already completed");
        require!(block::timestamp() > escrow.deadline.get(), "Deadline not passed");
        require!(!escrow.disputed.get(), "Cannot timeout disputed escrow");
        
        let mut updated_escrow = escrow;
        updated_escrow.completed.set(true);
        self.escrows.setter(escrow_id).set(updated_escrow);
        
        // Refund to buyer on timeout
        escrow.buyer.get().transfer(escrow.amount.get());
    }
    
    // View functions
    pub fn get_escrow(&self, escrow_id: U256) -> (Address, Address, Address, U256, bool, bool, bool) {
        let escrow = self.escrows.get(escrow_id);
        (
            escrow.buyer.get(),
            escrow.seller.get(),
            escrow.arbiter.get(),
            escrow.amount.get(),
            escrow.completed.get(),
            escrow.disputed.get(),
            escrow.cancelled.get()
        )
    }
    
    pub fn get_escrow_status(&self, escrow_id: U256) -> (bool, bool, bool, U256) {
        let escrow = self.escrows.get(escrow_id);
        (
            escrow.buyer_approved.get(),
            escrow.seller_delivered.get(),
            escrow.disputed.get(),
            escrow.arbiter_decision.get()
        )
    }
}`;

const LOTTERY_CODE = `// Simple Lottery/Raffle System
// Dependencies: stylus-sdk = "0.6.0"

extern crate alloc;

use stylus_sdk::{alloy_primitives::U256, prelude::*};
use alloc::vec::Vec;

sol_storage! {
    #[entrypoint]
    pub struct LotteryRaffle {
        // Lottery details
        owner: Address,
        lottery_id: StorageU256,
        
        // Current lottery state
        ticket_price: StorageU256,
        max_tickets: StorageU256,
        end_time: StorageU256,
        
        // Participants
        participants: StorageVec<Address>,
        mapping(address => uint256) ticket_count,
        total_tickets_sold: StorageU256,
        
        // Prize and state
        total_prize: StorageU256,
        winner: Address,
        lottery_ended: bool,
        
        // Settings
        owner_fee_percentage: StorageU256, // Percentage of prize pool for owner (in basis points)
        min_participants: StorageU256,
    }
}

#[public]
impl LotteryRaffle {
    // Initialize lottery
    pub fn init(&mut self) {
        self.owner.set(msg::sender());
        self.lottery_id.set(U256::from(0));
        self.owner_fee_percentage.set(U256::from(500)); // 5% default fee
        self.min_participants.set(U256::from(2));
    }
    
    // Start new lottery
    pub fn start_lottery(
        &mut self,
        ticket_price: U256,
        max_tickets: U256,
        duration_hours: U256
    ) {
        require!(msg::sender() == self.owner.get(), "Only owner can start lottery");
        require!(!self.lottery_ended.get() || self.winner.get() != Address::ZERO, "Previous lottery not completed");
        require!(ticket_price > U256::from(0), "Ticket price must be greater than 0");
        require!(max_tickets > U256::from(1), "Must allow at least 2 tickets");
        
        // Reset lottery state
        self.lottery_id.set(self.lottery_id.get() + U256::from(1));
        self.ticket_price.set(ticket_price);
        self.max_tickets.set(max_tickets);
        self.end_time.set(block::timestamp() + (duration_hours * 3600));
        self.total_tickets_sold.set(U256::from(0));
        self.total_prize.set(U256::from(0));
        self.winner.set(Address::ZERO);
        self.lottery_ended.set(false);
        
        // Clear previous participants
        while !self.participants.is_empty() {
            self.participants.pop();
        }
    }
    
    // Buy tickets
    pub fn buy_tickets(&mut self, num_tickets: U256) {
        require!(!self.lottery_ended.get(), "Lottery has ended");
        require!(block::timestamp() < self.end_time.get(), "Lottery time expired");
        require!(num_tickets > U256::from(0), "Must buy at least 1 ticket");
        
        let total_cost = num_tickets * self.ticket_price.get();
        require!(msg::value() >= total_cost, "Insufficient payment");
        
        let remaining_tickets = self.max_tickets.get() - self.total_tickets_sold.get();
        require!(num_tickets <= remaining_tickets, "Not enough tickets available");
        
        // Add tickets for user
        let current_tickets = self.ticket_count.get(msg::sender());
        if current_tickets == U256::from(0) {
            // New participant
            self.participants.push(msg::sender());
        }
        
        self.ticket_count.setter(msg::sender()).set(current_tickets + num_tickets);
        self.total_tickets_sold.set(self.total_tickets_sold.get() + num_tickets);
        self.total_prize.set(self.total_prize.get() + total_cost);
        
        // Refund excess payment
        let excess = msg::value() - total_cost;
        if excess > U256::from(0) {
            msg::sender().transfer(excess);
        }
        
        // Auto-end if all tickets sold
        if self.total_tickets_sold.get() >= self.max_tickets.get() {
            self._end_lottery();
        }
    }
    
    // End lottery (can be called by anyone after end time)
    pub fn end_lottery(&mut self) {
        require!(!self.lottery_ended.get(), "Lottery already ended");
        require!(
            block::timestamp() >= self.end_time.get() || 
            self.total_tickets_sold.get() >= self.max_tickets.get(),
            "Lottery still active"
        );
        
        self._end_lottery();
    }
    
    // Internal end lottery logic
    fn _end_lottery(&mut self) {
        require!(self.participants.len() >= self.min_participants.get().as_usize(), "Not enough participants");
        
        self.lottery_ended.set(true);
        
        // Simple pseudo-random winner selection (not cryptographically secure)
        // In production, use Chainlink VRF or similar oracle service
        let random_seed = self._generate_pseudo_random();
        let winner_index = random_seed % U256::from(self.participants.len());
        let winner = self.participants.get(winner_index.as_usize()).unwrap();
        
        self.winner.set(winner);
        
        // Calculate prizes
        let owner_fee = (self.total_prize.get() * self.owner_fee_percentage.get()) / U256::from(10000);
        let winner_prize = self.total_prize.get() - owner_fee;
        
        // Distribute prizes
        if winner_prize > U256::from(0) {
            winner.transfer(winner_prize);
        }
        
        if owner_fee > U256::from(0) {
            self.owner.get().transfer(owner_fee);
        }
    }
    
    // Simple pseudo-random number generation (NOT cryptographically secure)
    fn _generate_pseudo_random(&self) -> U256 {
        // Combine various blockchain values for pseudo-randomness
        // NOTE: This is not secure for high-value lotteries
        let seed = block::timestamp() + 
                  block::number() + 
                  U256::from(self.total_tickets_sold.get().as_u64()) +
                  U256::from(self.participants.len());
        
        // Simple hash-like operation
        seed % U256::from(1000000)
    }
    
    // Emergency cancel (only owner, only if no tickets sold)
    pub fn emergency_cancel(&mut self) {
        require!(msg::sender() == self.owner.get(), "Only owner can cancel");
        require!(self.total_tickets_sold.get() == U256::from(0), "Cannot cancel with tickets sold");
        
        self.lottery_ended.set(true);
        self.winner.set(Address::ZERO);
    }
    
    // Refund all participants (emergency function)
    pub fn refund_all(&mut self) {
        require!(msg::sender() == self.owner.get(), "Only owner can refund all");
        require!(!self.lottery_ended.get(), "Lottery already ended");
        
        for i in 0..self.participants.len() {
            let participant = self.participants.get(i).unwrap();
            let tickets = self.ticket_count.get(participant);
            let refund_amount = tickets * self.ticket_price.get();
            
            if refund_amount > U256::from(0) {
                participant.transfer(refund_amount);
                self.ticket_count.setter(participant).set(U256::from(0));
            }
        }
        
        self.lottery_ended.set(true);
        self.total_prize.set(U256::from(0));
    }
    
    // Set owner fee percentage (only owner)
    pub fn set_owner_fee(&mut self, fee_bp: U256) {
        require!(msg::sender() == self.owner.get(), "Only owner can set fee");
        require!(fee_bp <= U256::from(2000), "Fee cannot exceed 20%");
        
        self.owner_fee_percentage.set(fee_bp);
    }
    
    // View functions
    pub fn get_lottery_info(&self) -> (U256, U256, U256, U256, U256, bool, Address) {
        (
            self.lottery_id.get(),
            self.ticket_price.get(),
            self.max_tickets.get(),
            self.total_tickets_sold.get(),
            self.end_time.get(),
            self.lottery_ended.get(),
            self.winner.get()
        )
    }
    
    pub fn get_user_tickets(&self, user: Address) -> U256 {
        self.ticket_count.get(user)
    }
    
    pub fn get_participant_count(&self) -> usize {
        self.participants.len()
    }
    
    pub fn time_remaining(&self) -> U256 {
        if block::timestamp() >= self.end_time.get() {
            return U256::from(0);
        }
        self.end_time.get() - block::timestamp()
    }
    
    pub fn total_prize(&self) -> U256 {
        self.total_prize.get()
    }
}`;

const ACCESS_CONTROL_CODE = `// OpenZeppelin Access Control Implementation
// Dependencies: stylus-sdk = "0.6.0", openzeppelin-stylus = "0.3.0-alpha.1"

extern crate alloc;

use stylus_sdk::{
    alloy_primitives::U256,
    prelude::*,
};

sol_storage! {
    #[entrypoint]
    pub struct AccessControl {
        // Role => Account => HasRole
        mapping(bytes32 => mapping(address => bool)) roles;
        
        // Role => AdminRole
        mapping(bytes32 => bytes32) role_admin;
    }
}

#[external]
impl AccessControl {
    // Initialize with default admin role
    pub fn initialize(&mut self) {
        let default_admin_role = [0u8; 32];
        self._setup_role(default_admin_role, msg::sender());
    }

    // Grant role
    pub fn grant_role(&mut self, role: [u8; 32], account: Address) {
        require!(
            self.has_role(self.get_role_admin(role), msg::sender()),
            "AccessControl: sender must be an admin to grant"
        );
        self._grant_role(role, account);
    }

    // Revoke role
    pub fn revoke_role(&mut self, role: [u8; 32], account: Address) {
        require!(
            self.has_role(self.get_role_admin(role), msg::sender()),
            "AccessControl: sender must be an admin to revoke"
        );
        self._revoke_role(role, account);
    }

    // View functions
    pub fn has_role(&self, role: [u8; 32], account: Address) -> bool {
        self.roles.get(role).get(account)
    }

    pub fn get_role_admin(&self, role: [u8; 32]) -> [u8; 32] {
        self.role_admin.get(role)
    }

    // Internal functions
    fn _setup_role(&mut self, role: [u8; 32], account: Address) {
        self._grant_role(role, account);
    }

    fn _grant_role(&mut self, role: [u8; 32], account: Address) {
        if !self.has_role(role, account) {
            self.roles.setter(role).setter(account).set(true);
        }
    }

    fn _revoke_role(&mut self, role: [u8; 32], account: Address) {
        if self.has_role(role, account) {
            self.roles.setter(role).setter(account).set(false);
        }
    }
}`;

// const CRYPTO_UTILS_CODE = `// OpenZeppelin Cryptography Utils Implementation
// use stylus_sdk::{
//     alloy_primitives::U256,
//     prelude::*,
// };

// sol_storage! {
//     #[entrypoint]
//     pub struct CryptoUtils {
//         // ECDSA verification state
//         mapping(bytes32 => bool) signed_messages;
        
//         // Message recovery
//         mapping(address => bytes32) last_message;
//     }
// }

// #[external]
// impl CryptoUtils {
//     // Verify ECDSA signature
//     pub fn verify_signature(
//         &self,
//         message: [u8; 32],
//         signature: Vec<u8>,
//         signer: Address
//     ) -> bool {
//         // ECDSA verification logic
//         true // Placeholder
//     }

//     // Recover signer from signature
//     pub fn recover_signer(
//         &mut self,
//         message: [u8; 32],
//         signature: Vec<u8>
//     ) -> Address {
//         // Signature recovery logic
//         Address::ZERO // Placeholder
//     }

//     // Hash message
//     pub fn hash_message(&self, message: Vec<u8>) -> [u8; 32] {
//         // Keccak256 hashing
//         [0u8; 32] // Placeholder
//     }

//     // Store signed message
//     pub fn store_signed_message(
//         &mut self,
//         message: [u8; 32],
//         signature: Vec<u8>
//     ) -> bool {
//         require!(
//             self.verify_signature(message, signature.clone(), msg::sender()),
//             "CryptoUtils: invalid signature"
//         );
        
//         self.signed_messages.setter(message).set(true);
//         self.last_message.setter(msg::sender()).set(message);
//         true
//     }

//     // View functions
//     pub fn is_message_signed(&self, message: [u8; 32]) -> bool {
//         self.signed_messages.get(message)
//     }

//     pub fn get_last_message(&self, signer: Address) -> [u8; 32] {
//         self.last_message.get(signer)
//     }
// }`;

const ETH_BUCHAREST_CODE = `// This contract is used as the reference via The Wizard on Stylus. It
// should be changed to compete in the hackathon!

extern crate alloc;

use stylus_sdk::{alloy_primitives::*, prelude::*};

use alloc::{collections::BTreeMap, vec, vec::Vec};

use libbucharesthashing::{immutables::*, prover, prover::Piece};

/* ~~~~~~~~~~~~~~ BOARD IMPLEMENTATION ~~~~~~~~~~~~~~ */

/// Board that this game is played on. Could be of any size. This could
/// be optimised for gas golfing.
pub type Board = BTreeMap<u32, (Piece, u32)>;

fn pos_to_xy(row_size: u32, p: u32) -> (u32, u32) {
    (p % row_size, p / row_size)
}

fn xy_to_pos(row_size: u32, x: u32, y: u32) -> u32 {
    y.wrapping_mul(row_size).wrapping_add(x)
}

fn in_bounds(row_size: u32, x: u32, y: u32) -> bool {
    x < row_size && y < row_size
}

// Find the in check threats for the king given, returning the nonces of
// the threats.
fn in_check_threats(board: &Board, row_size: u32, king_pos: u32) -> Vec<u32> {
    let (king_x, king_y) = pos_to_xy(row_size, king_pos);
    let mut threats = vec![];
    // The following code takes the position of the king, then searches for pieces in
    // positions that might threaten the king, then adding them as threats if they're
    // the kind of piece to be a threat.
    macro_rules! piece_add_threat_if_valid {
        ($piece:ident, $x:expr, $y:expr) => {
            if in_bounds(row_size, $x, $y) {
                if let Some((Piece::$piece, n)) = board.get(&xy_to_pos(row_size, $x, $y)) {
                    threats.push(*n);
                }
            }
        };
    }
    // Pawn
    for dx in [-1, 1] {
        let x = king_x.wrapping_add_signed(dx);
        let y = king_y.wrapping_sub(1);
        piece_add_threat_if_valid!(PAWN, x, y);
    }
    // Knight
    for (dx, dy) in [
        (-2, -1),
        (-2, 1),
        (-1, -2),
        (-1, 2),
        (1, -2),
        (1, 2),
        (2, -1),
        (2, 1),
    ] {
        piece_add_threat_if_valid!(
            KNIGHT,
            king_x.wrapping_add_signed(dx),
            king_y.wrapping_add_signed(dy)
        );
    }
    // Rook/Queen
    for (dx, dy) in [(-1, 0), (1, 0), (0, -1), (0, 1)] {
        let mut x = king_x;
        let mut y = king_y;
        loop {
            x = x.wrapping_add_signed(dx);
            y = y.wrapping_add_signed(dy);
            // It's true that the macro does this check as well, but any compiler
            // would optimise this out, so we leave it for brevity reasons.
            if !in_bounds(row_size, x, y) {
                break;
            }
            piece_add_threat_if_valid!(CASTLE, x, y);
            piece_add_threat_if_valid!(QUEEN, x, y);
        }
    }
    // Bishop/Queen
    for (dx, dy) in [(-1, -1), (-1, 1), (1, -1), (1, 1)] {
        let mut x = king_x;
        let mut y = king_y;
        loop {
            x = x.wrapping_add_signed(dx);
            y = y.wrapping_add_signed(dy);
            if !in_bounds(row_size, x, y) {
                break;
            }
            piece_add_threat_if_valid!(BISHOP, x, y);
            piece_add_threat_if_valid!(QUEEN, x, y);
        }
    }
    // King
    for dx in [-1, 0, 1] {
        for dy in [-1, 0, 1] {
            // Make sure we're not hcecking the king against itself, and that we're
            // not in the corner.
            let x = king_x.wrapping_add_signed(dx);
            let y = king_y.wrapping_add_signed(dy);
            if dx == 0 && dy == 0 || xy_to_pos(row_size, x, y) == king_pos {
                continue;
            }
            piece_add_threat_if_valid!(KING, x, y);
        }
    }
    threats
}

pub fn solve(starting_hash: &[u8], start: u32) -> Option<(u32, u32)> {
    let row_size = BOARD_SIZE.isqrt();
    let mut board = BTreeMap::new();
    let mut last_king = None;
    for i in start..MAX_TRIES {
        let e = prover::hash(starting_hash, i);
        let king_id: u8 = Piece::KING.into();
        let p_id: u8 = (e % (king_id as u64 + 1)).try_into().unwrap();
        let p = Piece::try_from(p_id).unwrap();
        let offset: u32 = (e >> 32).try_into().unwrap();
        let pos: u32 = offset % BOARD_SIZE;
        board.insert(pos, (p, i));
        if p == Piece::KING {
            last_king = Some((pos, i));
        }
        if let Some((last_king_pos, last_king_nonce)) = last_king {
            let mut threats = in_check_threats(&board, row_size, last_king_pos);
            if threats.len() >= CHECKS_NEEDED as usize {
                threats.push(last_king_nonce);
                return Some((*threats.iter().min().unwrap(), i));
            }
        }
    }
    None
}

/* ~~~~~~~~~~~~~~ CONTRACT ENTRYPOINT ~~~~~~~~~~~~~~ */

#[storage]
#[entrypoint]
pub struct Storage {}

#[public]
impl Storage {
    // We need to provide this function for the prover contract to check this
    // contract's performance with this function.
    pub fn prove(&self, hash: FixedBytes<32>, from: u32) -> Result<(u32, u32), Vec<u8>> {
        Ok(solve(hash.as_slice(), from).unwrap())
    }
}

/* ~~~~~~~~~~~~~~ ALGORITHM TESTING ~~~~~~~~~~~~~~ */

// This test code will randomly slam the function to test if it behaves
// consistently. It will create hashes for the test function.

#[cfg(all(test, not(target_arch = "wasm32")))]
mod test {
    use super::*;
    use proptest::prelude::*;

    proptest! {
        #![proptest_config(ProptestConfig { cases: 5000, ..Default::default() })]

        #[test]
        fn test_solve(starting_hash in any::<[u8; 64]>()) {
            // First, let's test if the user-defined algorithm is consistent.
            let (e_l, e_h) = solve(&starting_hash, 0).unwrap();
            // Let's run our function against the first invocation of the function!
            let (t_l, t_h) = solve(&starting_hash, e_l).unwrap();
            // Now let's check if it's consistent.
            assert_eq!((e_l, e_h), (t_l, t_h), "user contract not consistent. {e_l} != {t_l} or {e_h} != {t_h}");
            // Now, let's test if the remote contract's prove function is consistent with the
            // local function here.
            let (p_l, p_h) = prover::default_solve(&starting_hash, e_l).unwrap();
            assert_eq!(
                (e_l, e_h), (p_l, p_h),
                "user contract inconsistent with reference. {e_l} != {p_l} or {e_h} != {p_h}"
            );
        }
    }
}`;

export const PROJECT_TEMPLATES = [
  {
    name: "Simple Counter",
    description: "A foundational smart contract demonstrating state management and basic interactions. Perfect starting point for learning Stylus development.",
    icon: Code2,
    code: COUNTER_CODE,
    category: "Utility",
    difficulty: "Beginner",
    linesOfCode: 50,
    gasEfficiency: 5,
    estimatedDeployTime: "2 minutes",
    dependencies: [
      "stylus-sdk@0.6.0",
    ],
    features: [
      "Learn basic contract structure",
      "Understand state variables",
      "Implement safe arithmetic",
      "Handle error conditions",
    ],
  },
  {
    name: "ERC-20 Token",
    description: "Create your own fungible token with the ERC-20 standard. Includes minting, burning, pausable features using OpenZeppelin's battle-tested security.",
    icon: Coins,
    code: ERC20_CODE,
    category: "DeFi",
    difficulty: "Intermediate",
    linesOfCode: 200,
    gasEfficiency: 5,
    estimatedDeployTime: "5 minutes",
    dependencies: [
      "stylus-sdk@0.6.0",
      "openzeppelin-stylus@0.3.0-alpha.1",
    ],
    features: [
      "Create fungible tokens with custom name and symbol",
      "Mint and burn tokens securely",
      "Pause/unpause functionality",
      "Transfer ownership capabilities",
    ],
    isOpenZeppelin: false,
    documentation: "https://docs.openzeppelin.com/contracts-stylus/0.1.1/erc20",
  },
  {
    name: "ERC-721 NFT Collection",
    description: "Build a complete NFT collection with the ERC-721 standard. Features paid minting, metadata management, and OpenZeppelin's proven security patterns.",
    icon: ImageIcon,
    code: ERC721_CODE,
    category: "NFT",
    difficulty: "Intermediate",
    linesOfCode: 250,
    gasEfficiency: 4,
    estimatedDeployTime: "6 minutes",
    dependencies: [
      "stylus-sdk@0.6.0",
      "openzeppelin-stylus@0.3.0-alpha.1",
    ],
    features: [
      "Paid public minting with ETH",
      "Owner-only free minting",
      "Pausable minting functionality",
      "Configurable base URI for metadata",
    ],
    isOpenZeppelin: false,
    documentation: "https://docs.openzeppelin.com/contracts-stylus/0.1.1/erc721",
  },
  {
    name: "Staking Rewards",
    description: "A DeFi staking contract where users can stake tokens to earn rewards over time. Features time-locked staking periods and compound rewards calculation.",
    icon: Clock,
    code: STAKING_CODE,
    category: "DeFi",
    difficulty: "Advanced",
    linesOfCode: 180,
    gasEfficiency: 4,
    estimatedDeployTime: "8 minutes",
    dependencies: [
      "stylus-sdk@0.6.0",
    ],
    features: [
      "Stake tokens to earn rewards",
      "Time-based reward calculation",
      "Emergency withdrawal mechanism",
      "Configurable reward rates",
    ],
  },
  {
    name: "Token Vesting",
    description: "A vesting contract with linear release schedules and cliff periods. Perfect for team token allocation, investor vesting, and controlled token distribution.",
    icon: Lock,
    code: VESTING_CODE,
    category: "DeFi",
    difficulty: "Advanced",
    linesOfCode: 200,
    gasEfficiency: 4,
    estimatedDeployTime: "7 minutes",
    dependencies: [
      "stylus-sdk@0.6.0",
    ],
    features: [
      "Linear vesting with cliff periods",
      "Multiple beneficiary support",
      "Revocable and non-revocable schedules",
      "Emergency revocation capabilities",
    ],
  },
  {
    name: "DAO Governance",
    description: "A simple governance contract for DAOs with proposal creation, voting, and execution. Features quorum requirements and timelock mechanisms.",
    icon: Users,
    code: GOVERNANCE_CODE,
    category: "Governance",
    difficulty: "Advanced",
    linesOfCode: 220,
    gasEfficiency: 3,
    estimatedDeployTime: "10 minutes",
    dependencies: [
      "stylus-sdk@0.6.0",
    ],
    features: [
      "Create and vote on proposals",
      "Quorum and voting period controls",
      "Token-weighted voting system",
      "Proposal execution and cancellation",
    ],
  },
  {
    name: "Crowdfunding Campaign",
    description: "A crowdfunding contract with goal-based funding, contributor tracking, and automatic refunds. Perfect for fundraising campaigns and project funding.",
    icon: Gift,
    code: CROWDFUNDING_CODE,
    category: "Utility",
    difficulty: "Intermediate",
    linesOfCode: 150,
    gasEfficiency: 4,
    estimatedDeployTime: "6 minutes",
    dependencies: [
      "stylus-sdk@0.6.0",
    ],
    features: [
      "Set funding goals and deadlines",
      "Automatic refunds if goal not met",
      "Track contributors and amounts",
      "Emergency withdrawal mechanisms",
    ],
  },
  {
    name: "Escrow Service",
    description: "A two-party escrow contract with arbiter dispute resolution. Secure fund holding with conditional releases and timeout protections.",
    icon: ShieldCheck,
    code: ESCROW_CODE,
    category: "Utility",
    difficulty: "Advanced",
    linesOfCode: 180,
    gasEfficiency: 4,
    estimatedDeployTime: "8 minutes",
    dependencies: [
      "stylus-sdk@0.6.0",
    ],
    features: [
      "Two-party escrow with arbiter",
      "Dispute resolution mechanism",
      "Automatic timeout refunds",
      "Delivery confirmation system",
    ],
  },
  {
    name: "Lottery & Raffle",
    description: "A lottery system with ticket sales, pseudo-random winner selection, and prize distribution. Features configurable parameters and owner fees.",
    icon: Gamepad2,
    code: LOTTERY_CODE,
    category: "Gaming",
    difficulty: "Intermediate",
    linesOfCode: 160,
    gasEfficiency: 3,
    estimatedDeployTime: "7 minutes",
    dependencies: [
      "stylus-sdk@0.6.0",
    ],
    features: [
      "Ticket-based lottery system",
      "Pseudo-random winner selection",
      "Configurable ticket prices and limits",
      "Owner fee and emergency controls",
    ],
  },
  {
    name: "Access Control",
    description: "Implement sophisticated role-based access control for your smart contracts. Features flexible permission systems and role hierarchies using OpenZeppelin patterns.",
    icon: KeyRound,
    code: ACCESS_CONTROL_CODE,
    category: "Utility",
    difficulty: "Advanced",
    linesOfCode: 120,
    gasEfficiency: 5,
    estimatedDeployTime: "5 minutes",
    dependencies: [
      "stylus-sdk@0.6.0",
      "openzeppelin-stylus@0.3.0-alpha.1",
    ],
    features: [
      "Define role hierarchies",
      "Manage role assignments",
      "Implement permission checks",
      "Handle admin capabilities",
    ],
    isOpenZeppelin: false,
    documentation: "https://docs.openzeppelin.com/contracts-stylus/0.1.1/access-control",
  },
];