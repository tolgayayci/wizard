/// Integration test for the complete deployment flow
/// This test simulates the exact flow from the frontend
#[cfg(test)]
mod integration_tests {
    use hex;
    use sha3::{Digest, Keccak256};
    use serde::{Deserialize, Serialize};
    
    #[derive(Debug, Serialize)]
    struct UserDeployRequest {
        user_id: String,
        project_id: String,
        chain_id: u64,
        deployer_address: String,
        constructor_args: Option<Vec<String>>,
    }
    
    #[derive(Debug, Deserialize)]
    struct UserDeploymentPlan {
        chain_id: u64,
        network_name: String,
        factory_address: String,
        salt: String,
        init_code: String,
        program_address: String,
    }
    
    /// Test the complete deployment flow as if called from frontend
    #[test]
    fn test_deployment_flow_with_checksummed_address() {
        // This is the actual address from the error log
        let deployer_address = "0x01310ab512Dc4c23F17476e877a3f92FF9faBa3b";
        
        // Simulate the deployment request
        let request = UserDeployRequest {
            user_id: "test-user".to_string(),
            project_id: "test-project".to_string(),
            chain_id: 421614, // Arbitrum Sepolia
            deployer_address: deployer_address.to_string(),
            constructor_args: None,
        };
        
        // Process the address as the backend would
        let address_hex = &request.deployer_address[2..];
        let padded_address = if address_hex.len() < 40 {
            format!("{:0>40}", address_hex)
        } else {
            address_hex.to_string()
        };
        
        println!("Original address: {}", deployer_address);
        println!("Padded address: {}", padded_address);
        
        // The address should be padded to 40 chars with leading zero
        assert_eq!(padded_address, "001310ab512Dc4c23F17476e877a3f92FF9faBa3b");
        assert_eq!(padded_address.len(), 40);
        
        // Simulate WASM hash
        let wasm_binary = b"sample wasm bytecode";
        let mut hasher = Keccak256::new();
        hasher.update(&wasm_binary);
        let wasm_hash = hasher.finalize();
        
        // Generate salt the CORRECT way (preserving checksum)
        let salt = format!("0x{}{}", 
            padded_address,  // Keep checksummed address as-is
            hex::encode(&wasm_hash[20..32])  // Append wasm hash suffix
        );
        
        println!("Generated salt: {}", salt);
        
        // Verify the salt preserves the checksum
        assert!(salt.starts_with("0x001310ab512Dc4c23F17476e877a3f92FF9faBa3b"));
        
        // The salt should be 66 characters (0x + 64 hex chars = 32 bytes)
        assert_eq!(salt.len(), 66);
        
        // Verify first 20 bytes (40 hex chars after 0x) match the padded address exactly
        let salt_address_part = &salt[2..42];
        assert_eq!(salt_address_part, padded_address);
        
        // Test case sensitivity is preserved
        assert!(salt_address_part.contains("Dc"));
        assert!(salt_address_part.contains("FF"));
        assert!(salt_address_part.contains("Ba"));
    }
    
    /// Test CREATE2 address calculation
    #[test]
    fn test_create2_address_calculation_with_real_values() {
        let factory = "0x0000000000FFe8B47B3e2130213B802212439497";
        let deployer = "0x001310ab512Dc4c23F17476e877a3f92FF9faBa3b"; // Padded address
        
        // Generate a test salt
        let wasm_data = b"test";
        let mut hasher = Keccak256::new();
        hasher.update(wasm_data);
        let wasm_hash = hasher.finalize();
        
        // Create salt preserving checksum
        let salt_hex = format!("{}{}", &deployer[2..], hex::encode(&wasm_hash[20..32]));
        let salt_bytes = hex::decode(&salt_hex).unwrap();
        
        // Sample init code with Stylus magic prefix
        let init_code = "0xEFF00000AABBCCDD";
        let init_code_bytes = hex::decode(&init_code[2..]).unwrap();
        
        // Calculate CREATE2 address
        let factory_bytes = hex::decode(&factory[2..]).unwrap();
        
        // Hash the init code
        let mut init_hasher = Keccak256::new();
        init_hasher.update(&init_code_bytes);
        let init_hash = init_hasher.finalize();
        
        // Build CREATE2 preimage: 0xff ++ factory ++ salt ++ keccak256(init_code)
        let mut preimage = Vec::new();
        preimage.push(0xff);
        preimage.extend_from_slice(&factory_bytes);
        preimage.extend_from_slice(&salt_bytes);
        preimage.extend_from_slice(&init_hash);
        
        // Hash to get address
        let mut addr_hasher = Keccak256::new();
        addr_hasher.update(&preimage);
        let addr_hash = addr_hasher.finalize();
        
        // Take last 20 bytes
        let create2_address = format!("0x{}", hex::encode(&addr_hash[12..]));
        
        println!("Factory: {}", factory);
        println!("Salt (first 42 chars): 0x{}", &salt_hex[..40]);
        println!("CREATE2 Address: {}", create2_address);
        
        assert_eq!(create2_address.len(), 42);
    }
    
    /// Test that validates the exact error scenario
    #[test]
    fn test_exact_error_scenario() {
        // The exact values from the error message
        let sender_address = "0x01310ab512Dc4c23F17476e877a3f92FF9faBa3b";
        let error_salt = "0x01310ab512dc4c23f17476e877a3f92ff9faba3b04cdcb25a5f79f51826a9348";
        
        // Extract first 20 bytes (40 hex chars) from the error salt
        let salt_address_part = &error_salt[2..42];
        
        // The problem: salt has lowercase address but sender has checksum
        println!("Sender address (checksummed): {}", &sender_address[2..]);
        println!("Salt address part (lowercase): {}", salt_address_part);
        
        // They don't match due to case!
        assert_ne!(&sender_address[2..], salt_address_part);
        
        // But they match when both lowercase
        assert_eq!(sender_address[2..].to_lowercase(), salt_address_part.to_lowercase());
        
        // The fix: preserve checksum in salt
        let fixed_salt = format!("0x00{}{}", 
            &sender_address[2..],  // Add leading zero and keep checksum
            &error_salt[42..]  // Keep the wasm hash part
        );
        
        println!("Fixed salt: {}", fixed_salt);
        
        // Now the first 20 bytes match the sender (with leading zero padding)
        let fixed_salt_address = &fixed_salt[2..42];
        assert_eq!(fixed_salt_address, format!("00{}", &sender_address[2..]));
    }
}