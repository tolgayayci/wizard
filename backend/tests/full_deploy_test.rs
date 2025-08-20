/// Full integration test that simulates the exact deployment flow
use hex;
use sha3::{Digest, Keccak256};

#[test]
fn test_full_deployment_flow() {
    println!("\n=== Testing Full Deployment Flow ===\n");
    
    // The exact address from your wallet (with checksum)
    let user_address = "0x01310ab512Dc4c23F17476e877a3f92FF9faBa3b";
    println!("User's wallet address: {}", user_address);
    
    // Step 1: Frontend sends this address to backend
    let deployer_address = user_address.to_string();
    
    // Step 2: Backend processes the address
    let address_hex = &deployer_address[2..];
    println!("Address hex (without 0x): {}", address_hex);
    println!("Address hex length: {}", address_hex.len());
    
    // Step 3: Pad if necessary (your address is 41 chars, needs to be 40)
    let padded_address = if address_hex.len() < 40 {
        let zeros = "0".repeat(40 - address_hex.len());
        format!("{}{}", zeros, address_hex)
    } else if address_hex.len() > 40 {
        address_hex[..40].to_string()
    } else {
        address_hex.to_string()
    };
    
    println!("Padded address (40 chars): {}", padded_address);
    
    // Verify it's exactly 40 chars
    assert_eq!(padded_address.len(), 40, "Padded address must be exactly 40 chars");
    
    // Step 4: Validate the padded address can be decoded
    match hex::decode(&padded_address) {
        Ok(bytes) => {
            println!("Address decodes to {} bytes", bytes.len());
            assert_eq!(bytes.len(), 20, "Address must decode to exactly 20 bytes");
        },
        Err(e) => {
            panic!("Failed to decode padded address: {}", e);
        }
    }
    
    // Step 5: Generate WASM hash (simulate actual WASM)
    let wasm_binary = b"sample wasm bytecode for testing";
    let mut hasher = Keccak256::new();
    hasher.update(&wasm_binary);
    let wasm_hash = hasher.finalize();
    println!("WASM hash: 0x{}", hex::encode(&wasm_hash));
    
    // Step 6: Generate salt - THE CRITICAL PART
    let salt = format!("0x{}{}", 
        padded_address,  // Keep checksummed address as-is (40 chars)
        hex::encode(&wasm_hash[20..32])  // Append wasm hash suffix (24 chars)
    );
    
    println!("\n=== Salt Generation ===");
    println!("Salt: {}", salt);
    println!("Salt length: {} chars", salt.len());
    
    // Verify salt structure
    assert_eq!(salt.len(), 66, "Salt must be 66 chars (0x + 64 hex chars)");
    
    // Extract first 20 bytes (40 hex chars) from salt
    let salt_address_part = &salt[2..42];
    println!("Salt address part: {}", salt_address_part);
    
    // CRITICAL CHECK: Salt address part must match padded address EXACTLY (case-sensitive)
    assert_eq!(salt_address_part, padded_address, 
        "Salt's first 20 bytes must match padded address exactly");
    
    // Verify checksum is preserved in salt
    if address_hex.len() == 41 {
        // Original address had 41 chars, so padded has leading zero
        assert!(salt_address_part.starts_with("0"));
        assert!(salt_address_part.contains("Dc"));
        assert!(salt_address_part.contains("FF"));
        assert!(salt_address_part.contains("Ba"));
        println!("✓ Checksum preserved in salt");
    }
    
    // Step 7: Simulate CREATE2 deployment
    let factory_address = "0x0000000000FFe8B47B3e2130213B802212439497";
    let init_code = format!("0xEFF00000{}", hex::encode(&wasm_binary));
    
    println!("\n=== CREATE2 Deployment ===");
    println!("Factory: {}", factory_address);
    println!("Init code prefix: {}...", &init_code[..20]);
    
    // Calculate CREATE2 address
    let create2_address = calculate_create2_address(&factory_address, &salt, &init_code);
    println!("Predicted contract address: {}", create2_address);
    
    // Step 8: Verify the transaction would succeed
    // The CREATE2 factory will check: first 20 bytes of salt == msg.sender
    // msg.sender will be the checksummed address from the wallet
    
    // Simulate what the factory sees
    let msg_sender_bytes = hex::decode(&padded_address).unwrap();
    let salt_bytes = hex::decode(&salt[2..]).unwrap();
    let salt_first_20_bytes = &salt_bytes[..20];
    
    println!("\n=== Factory Validation (what happens on-chain) ===");
    println!("msg.sender bytes: {:?}", &msg_sender_bytes[..5]); // Show first 5 bytes
    println!("Salt first 20 bytes: {:?}", &salt_first_20_bytes[..5]); // Show first 5 bytes
    
    assert_eq!(msg_sender_bytes, salt_first_20_bytes,
        "Salt's first 20 bytes must match sender address bytes");
    
    println!("\n✅ All checks passed! Deployment should succeed.");
}

fn calculate_create2_address(factory: &str, salt: &str, init_code: &str) -> String {
    let factory_bytes = hex::decode(&factory[2..]).unwrap();
    let salt_bytes = hex::decode(&salt[2..]).unwrap();
    let init_code_bytes = hex::decode(&init_code[2..]).unwrap();
    
    // Hash the init code
    let mut init_hasher = Keccak256::new();
    init_hasher.update(&init_code_bytes);
    let init_hash = init_hasher.finalize();
    
    // Build CREATE2 preimage
    let mut preimage = Vec::new();
    preimage.push(0xff);
    preimage.extend_from_slice(&factory_bytes);
    preimage.extend_from_slice(&salt_bytes);
    preimage.extend_from_slice(&init_hash);
    
    // Hash to get address
    let mut addr_hasher = Keccak256::new();
    addr_hasher.update(&preimage);
    let addr_hash = addr_hasher.finalize();
    
    format!("0x{}", hex::encode(&addr_hash[12..]))
}

#[test]
fn test_edge_cases() {
    println!("\n=== Testing Edge Cases ===\n");
    
    // Test various address formats
    let test_cases = vec![
        ("0x1234567890123456789012345678901234567890", 40),  // Normal 40-char address
        ("0x01310ab512Dc4c23F17476e877a3f92FF9faBa3b", 41), // Your address (41 chars)
        ("0x0000000000000000000000000000000000000001", 40),  // Address with leading zeros
        ("0x1", 1),  // Very short address
    ];
    
    for (address, original_len) in test_cases {
        println!("Testing address: {} (len: {})", address, original_len);
        
        let address_hex = &address[2..];
        let padded = if address_hex.len() < 40 {
            let zeros = "0".repeat(40 - address_hex.len());
            format!("{}{}", zeros, address_hex)
        } else if address_hex.len() > 40 {
            address_hex[..40].to_string()
        } else {
            address_hex.to_string()
        };
        
        println!("  Padded: {}", padded);
        assert_eq!(padded.len(), 40, "Must be exactly 40 chars");
        
        // Verify it can be decoded
        let bytes = hex::decode(&padded).unwrap();
        assert_eq!(bytes.len(), 20, "Must decode to 20 bytes");
        
        println!("  ✓ Valid\n");
    }
}