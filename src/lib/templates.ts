import { 
  Code2, 
  Coins, 
  ImageIcon, 
  Layers, 
  ShieldCheck, 
  KeyRound 
} from 'lucide-react';

const COUNTER_CODE = `extern crate alloc;

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

    /// Increments \`number\` and updates its value in storage.
    pub fn increment(&mut self) {
        let number = self.number.get();
        self.set_number(number + U256::from(1));
    }
}`;

const ERC20_CODE = `// OpenZeppelin ERC20 Implementation
use stylus_sdk::{
    alloy_primitives::U256,
    prelude::*,
};

sol_storage! {
    #[entrypoint]
    pub struct ERC20 {
        // Token metadata
        string name;                   // Token name (e.g., "MyToken")
        string symbol;                 // Token symbol (e.g., "MTK")
        uint8 decimals;               // Token decimals (usually 18)
        uint256 total_supply;         // Total token supply

        // Balances and allowances
        mapping(address => uint256) balances;                    // User balances
        mapping(address => mapping(address => uint256)) allowed; // Spending allowances
    }
}

#[external]
impl ERC20 {
    // Initialize token with name, symbol, and initial supply
    pub fn initialize(&mut self, name: String, symbol: String, initial_supply: U256) {
        require!(self.total_supply.get() == U256::ZERO, "Already initialized");
        self.name.set(name);
        self.symbol.set(symbol);
        self.decimals.set(18);
        self._mint(msg::sender(), initial_supply);
    }

    // View functions
    pub fn name(&self) -> String { self.name.get() }
    pub fn symbol(&self) -> String { self.symbol.get() }
    pub fn decimals(&self) -> u8 { self.decimals.get() }
    pub fn total_supply(&self) -> U256 { self.total_supply.get() }
    pub fn balance_of(&self, account: Address) -> U256 { self.balances.get(account) }
    
    pub fn allowance(&self, owner: Address, spender: Address) -> U256 {
        self.allowed.get(owner).get(spender)
    }

    // Transfer tokens
    pub fn transfer(&mut self, to: Address, amount: U256) -> bool {
        self._transfer(msg::sender(), to, amount);
        true
    }

    // Approve spender
    pub fn approve(&mut self, spender: Address, amount: U256) -> bool {
        self._approve(msg::sender(), spender, amount);
        true
    }

    // Transfer tokens from one address to another
    pub fn transfer_from(&mut self, from: Address, to: Address, amount: U256) -> bool {
        let allowed = self.allowed.get(from).get(msg::sender());
        require!(allowed >= amount, "ERC20: insufficient allowance");
        
        self._transfer(from, to, amount);
        self._approve(from, msg::sender(), allowed - amount);
        true
    }

    // Internal functions
    fn _transfer(&mut self, from: Address, to: Address, amount: U256) {
        require!(to != Address::ZERO, "ERC20: transfer to zero address");
        
        let from_balance = self.balances.get(from);
        require!(from_balance >= amount, "ERC20: insufficient balance");
        
        self.balances.setter(from).set(from_balance - amount);
        let to_balance = self.balances.get(to);
        self.balances.setter(to).set(to_balance + amount);
    }

    fn _approve(&mut self, owner: Address, spender: Address, amount: U256) {
        require!(owner != Address::ZERO, "ERC20: approve from zero address");
        require!(spender != Address::ZERO, "ERC20: approve to zero address");
        self.allowed.setter(owner).setter(spender).set(amount);
    }

    fn _mint(&mut self, account: Address, amount: U256) {
        require!(account != Address::ZERO, "ERC20: mint to zero address");
        self.total_supply.set(self.total_supply.get() + amount);
        let account_balance = self.balances.get(account);
        self.balances.setter(account).set(account_balance + amount);
    }
}`;

const ERC721_CODE = `// OpenZeppelin ERC721 Implementation
use stylus_sdk::{
    alloy_primitives::U256,
    prelude::*,
};

sol_storage! {
    #[entrypoint]
    pub struct ERC721 {
        // Token metadata
        string name;
        string symbol;
        
        // Token data
        mapping(uint256 => address) token_owner;
        mapping(address => uint256) balance_of;
        mapping(uint256 => address) token_approvals;
        mapping(address => mapping(address => bool)) operator_approvals;
        
        // Token URI storage
        mapping(uint256 => string) token_uris;
    }
}

#[external]
impl ERC721 {
    // Initialize collection
    pub fn initialize(&mut self, name: String, symbol: String) {
        self.name.set(name);
        self.symbol.set(symbol);
    }

    // Mint new token
    pub fn mint(&mut self, to: Address, token_id: U256) {
        require!(to != Address::ZERO, "ERC721: mint to zero address");
        require!(!self._exists(token_id), "ERC721: token already minted");

        self.balance_of.setter(to).set(self.balance_of.get(to) + U256::from(1));
        self.token_owner.setter(token_id).set(to);
    }

    // Transfer token
    pub fn transfer_from(&mut self, from: Address, to: Address, token_id: U256) {
        require!(self._is_approved_or_owner(msg::sender(), token_id), "ERC721: not authorized");
        self._transfer(from, to, token_id);
    }

    // Set token URI
    pub fn set_token_uri(&mut self, token_id: U256, token_uri: String) {
        require!(self._exists(token_id), "ERC721: URI set for nonexistent token");
        self.token_uris.setter(token_id).set(token_uri);
    }

    // View functions
    pub fn owner_of(&self, token_id: U256) -> Address {
        let owner = self.token_owner.get(token_id);
        require!(owner != Address::ZERO, "ERC721: invalid token ID");
        owner
    }

    pub fn token_uri(&self, token_id: U256) -> String {
        require!(self._exists(token_id), "ERC721: URI query for nonexistent token");
        self.token_uris.get(token_id)
    }

    // Internal functions
    fn _exists(&self, token_id: U256) -> bool {
        self.token_owner.get(token_id) != Address::ZERO
    }

    fn _is_approved_or_owner(&self, spender: Address, token_id: U256) -> bool {
        let owner = self.owner_of(token_id);
        spender == owner || 
        self.token_approvals.get(token_id) == spender ||
        self.operator_approvals.get(owner).get(spender)
    }

    fn _transfer(&mut self, from: Address, to: Address, token_id: U256) {
        require!(self.owner_of(token_id) == from, "ERC721: transfer from incorrect owner");
        require!(to != Address::ZERO, "ERC721: transfer to zero address");

        self.token_approvals.setter(token_id).set(Address::ZERO);
        self.balance_of.setter(from).set(self.balance_of.get(from) - U256::from(1));
        self.balance_of.setter(to).set(self.balance_of.get(to) + U256::from(1));
        self.token_owner.setter(token_id).set(to);
    }
}`;

const ERC1155_CODE = `// OpenZeppelin ERC1155 Implementation
use stylus_sdk::{
    alloy_primitives::U256,
    prelude::*,
};

sol_storage! {
    #[entrypoint]
    pub struct ERC1155 {
        // Token data
        mapping(uint256 => mapping(address => uint256)) balances;
        mapping(address => mapping(address => bool)) operator_approvals;
        
        // Metadata
        string uri;
    }
}

#[external]
impl ERC1155 {
    // Initialize collection
    pub fn initialize(&mut self, uri: String) {
        self.uri.set(uri);
    }

    // Mint tokens
    pub fn mint(&mut self, to: Address, id: U256, amount: U256, data: Vec<u8>) {
        require!(to != Address::ZERO, "ERC1155: mint to zero address");
        
        let operator = msg::sender();
        let ids = vec![id];
        let amounts = vec![amount];
        
        self._before_token_transfer(operator, Address::ZERO, to, &ids, &amounts, &data);
        
        let balance = self.balances.get(id).get(to);
        self.balances.setter(id).setter(to).set(balance + amount);
        
        self._after_token_transfer(operator, Address::ZERO, to, &ids, &amounts, &data);
    }

    // Batch transfer
    pub fn safe_batch_transfer_from(
        &mut self,
        from: Address,
        to: Address,
        ids: Vec<U256>,
        amounts: Vec<U256>,
        data: Vec<u8>
    ) {
        require!(to != Address::ZERO, "ERC1155: transfer to zero address");
        require!(
            from == msg::sender() || self.operator_approvals.get(from).get(msg::sender()),
            "ERC1155: caller is not owner nor approved"
        );
        require!(ids.len() == amounts.len(), "ERC1155: ids and amounts length mismatch");

        self._before_token_transfer(msg::sender(), from, to, &ids, &amounts, &data);

        for i in 0..ids.len() {
            let id = ids[i];
            let amount = amounts[i];
            
            let from_balance = self.balances.get(id).get(from);
            require!(from_balance >= amount, "ERC1155: insufficient balance");
            self.balances.setter(id).setter(from).set(from_balance - amount);
            
            let to_balance = self.balances.get(id).get(to);
            self.balances.setter(id).setter(to).set(to_balance + amount);
        }

        self._after_token_transfer(msg::sender(), from, to, &ids, &amounts, &data);
    }

    // View functions
    pub fn balance_of(&self, account: Address, id: U256) -> U256 {
        require!(account != Address::ZERO, "ERC1155: balance query for zero address");
        self.balances.get(id).get(account)
    }

    pub fn uri(&self) -> String {
        self.uri.get()
    }

    // Internal functions
    fn _before_token_transfer(
        &self,
        _operator: Address,
        _from: Address,
        _to: Address,
        _ids: &[U256],
        _amounts: &[U256],
        _data: &[u8]
    ) {
        // Hook for before token transfer
    }

    fn _after_token_transfer(
        &self,
        _operator: Address,
        _from: Address,
        _to: Address,
        _ids: &[U256],
        _amounts: &[U256],
        _data: &[u8]
    ) {
        // Hook for after token transfer
    }
}`;

const ACCESS_CONTROL_CODE = `// OpenZeppelin Access Control Implementation
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
    name: "Arbitrum Hackathon Gas Redux challenge",
    description: "Starter template for ETH Bucharest Gas Redux Challenge by Stylus Saturdays and Superposition",
    icon: Code2,
    code: ETH_BUCHAREST_CODE,
    features: [
      "Optimise a Proof of Work function",
      "Learn Stylus skills",
      "Compete for $6,800 USD and special keyboards",
      "Be the champion",
    ],
  },
  {
    name: "Counter Contract",
    description: "A foundational smart contract demonstrating state management and basic interactions. Perfect starting point for learning Stylus development with a simple yet practical example.",
    icon: Code2,
    code: COUNTER_CODE,
    features: [
      "Learn basic contract structure",
      "Understand state variables",
      "Implement safe arithmetic",
      "Handle error conditions",
    ],
  },
  {
    name: "ERC-20 Token",
    description: "Create your own fungible token with the ERC-20 standard. Includes complete implementation with transfer mechanics, allowances, and OpenZeppelin's battle-tested security features.",
    icon: Coins,
    code: ERC20_CODE,
    features: [
      "Create fungible tokens with custom name and symbol",
      "Implement secure transfer and approval mechanics",
      "Manage token supply and decimals",
      "Handle allowances for DeFi integrations",
    ],
    isOpenZeppelin: true,
    documentation: "https://docs.openzeppelin.com/contracts/4.x/erc20",
    references: [
      {
        title: "ERC-20 Standard",
        url: "https://eips.ethereum.org/EIPS/eip-20"
      },
      {
        title: "OpenZeppelin Implementation",
        url: "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol"
      }
    ]
  },
  {
    name: "ERC-721 NFT",
    description: "Build a complete NFT collection with the ERC-721 standard. Features minting, transfers, metadata management, and OpenZeppelin's proven security patterns for non-fungible tokens.",
    icon: ImageIcon,
    code: ERC721_CODE,
    features: [
      "Implement NFT minting and transfers",
      "Handle token ownership and approvals",
      "Manage token metadata",
      "Support token enumeration",
    ],
    isOpenZeppelin: true,
    documentation: "https://docs.openzeppelin.com/contracts/4.x/erc721",
    references: [
      {
        title: "ERC-721 Standard",
        url: "https://eips.ethereum.org/EIPS/eip-721"
      }
    ]
  },
  {
    name: "ERC-1155 Multi-Token",
    description: "Implement a versatile multi-token standard supporting both fungible and non-fungible tokens. Perfect for gaming assets, mixed collections, and advanced token economics.",
    icon: Layers,
    code: ERC1155_CODE,
    features: [
      "Handle multiple token types",
      "Implement batch transfers",
      "Manage token balances",
      "Support metadata URIs",
    ],
    isOpenZeppelin: true,
    documentation: "https://docs.openzeppelin.com/contracts/4.x/erc1155",
    references: [
      {
        title: "ERC-1155 Standard",
        url: "https://eips.ethereum.org/EIPS/eip-1155"
      }
    ]
  },
  {
    name: "Access Control",
    description: "Implement sophisticated role-based access control for your smart contracts. Features flexible permission systems, role hierarchies, and OpenZeppelin's proven security patterns.",
    icon: ShieldCheck,
    code: ACCESS_CONTROL_CODE,
    features: [
      "Define role hierarchies",
      "Manage role assignments",
      "Implement permission checks",
      "Handle admin capabilities",
    ],
    isOpenZeppelin: true,
    documentation: "https://docs.openzeppelin.com/contracts/4.x/access-control",
  },
//   {
//     name: "Cryptography Utils",
//     description: "Essential cryptographic utilities for blockchain applications. Includes signature verification, message recovery, and secure hashing implementations based on OpenZeppelin standards.",
//     icon: KeyRound,
//     code: CRYPTO_UTILS_CODE,
//     features: [
//       "Verify digital signatures",
//       "Implement signature recovery",
//       "Handle message hashing",
//       "Secure data validation",
//     ],
//     isOpenZeppelin: true,
//     documentation: "https://docs.openzeppelin.com/contracts/4.x/utilities",
//   }
];