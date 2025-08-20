#[cfg(test)]
mod deploy_tests {
    use hex;
    use sha3::{Digest, Keccak256};

    #[test]
    fn test_salt_generation_preserves_checksum() {
        // Test with checksummed address (mixed case)
        let checksummed_address = "0x01310ab512Dc4c23F17476e877a3f92FF9faBa3b";
        
        // Remove 0x prefix
        let address_hex = &checksummed_address[2..];
        
        // This address is 41 chars, but addresses should be 40 chars (20 bytes)
        // When odd length, it means there's a missing leading zero
        let padded_address = if address_hex.len() == 41 {
            // Special case: 41 chars means missing one leading zero
            format!("0{}", address_hex)  // Results in 42 chars
        } else if address_hex.len() < 40 {
            // Pad to 40 chars
            format!("{:0>40}", address_hex)
        } else {
            address_hex.to_string()
        };
        
        // This should be: "001310ab512Dc4c23F17476e877a3f92FF9faBa3b" (with leading zero, preserving case)
        println!("Padded address: {}", padded_address);
        assert_eq!(padded_address.len(), 42); // 42 chars when the original was 41
        
        // Simulate wasm hash
        let wasm_data = b"test wasm data";
        let mut hasher = Keccak256::new();
        hasher.update(wasm_data);
        let wasm_hash = hasher.finalize();
        
        // WRONG WAY (current implementation - loses checksum):
        let wrong_salt = {
            let deployer_bytes = hex::decode(&padded_address).unwrap();
            let mut salt_bytes = [0u8; 32];
            salt_bytes[..20].copy_from_slice(&deployer_bytes[..20]);
            salt_bytes[20..].copy_from_slice(&wasm_hash[20..32]);
            format!("0x{}", hex::encode(salt_bytes))
        };
        
        // RIGHT WAY (preserves checksum):
        let correct_salt = format!("0x{}{}", 
            padded_address,  // Keep the checksummed address hex as-is
            hex::encode(&wasm_hash[20..32])  // Append the wasm hash suffix
        );
        
        println!("Wrong salt (loses checksum): {}", wrong_salt);
        println!("Correct salt (preserves checksum): {}", correct_salt);
        
        // The wrong salt will have lowercase address portion
        assert!(wrong_salt.contains("001310ab512dc4c23f17476e877a3f92ff9faba3b"));
        
        // The correct salt preserves the checksum
        assert!(correct_salt.contains("001310ab512Dc4c23F17476e877a3f92FF9faBa3b"));
    }

    #[test]
    fn test_create2_address_calculation() {
        let factory = "0x0000000000FFe8B47B3e2130213B802212439497";
        let salt = "0x001310ab512Dc4c23F17476e877a3f92FF9faBa3b1234567890abcdef12345678";
        let init_code = "0xEFF00000006060";  // Sample init code
        
        // CREATE2 address = keccak256(0xff ++ factory ++ salt ++ keccak256(init_code))[12:]
        let factory_bytes = hex::decode(&factory[2..]).unwrap();
        let salt_bytes = hex::decode(&salt[2..]).unwrap();
        let init_code_bytes = hex::decode(&init_code[2..]).unwrap();
        
        // Hash the init code
        let mut init_hasher = Keccak256::new();
        init_hasher.update(&init_code_bytes);
        let init_hash = init_hasher.finalize();
        
        // Build the CREATE2 preimage
        let mut preimage = Vec::new();
        preimage.push(0xff); // CREATE2 prefix
        preimage.extend_from_slice(&factory_bytes);
        preimage.extend_from_slice(&salt_bytes);
        preimage.extend_from_slice(&init_hash);
        
        // Hash to get the address
        let mut addr_hasher = Keccak256::new();
        addr_hasher.update(&preimage);
        let addr_hash = addr_hasher.finalize();
        
        // Take last 20 bytes as address
        let address = format!("0x{}", hex::encode(&addr_hash[12..]));
        println!("Calculated CREATE2 address: {}", address);
        
        assert_eq!(address.len(), 42); // 0x + 40 hex chars
    }
    
    #[test]
    fn test_address_padding_with_checksum() {
        // Test various address formats
        let test_cases = vec![
            ("0x1234567890123456789012345678901234567890", "1234567890123456789012345678901234567890"),
            ("0x01310ab512Dc4c23F17476e877a3f92FF9faBa3b", "001310ab512Dc4c23F17476e877a3f92FF9faBa3b"),
            ("0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B", "Ab5801a7D398351b8bE11C439e05C5B3259aeC9B"),
            ("0x1234", "0000000000000000000000000000000000001234"),
        ];
        
        for (input, expected) in test_cases {
            let address_hex = &input[2..];
            let padded = if address_hex.len() < 40 {
                // Pad with leading zeros, preserving case
                format!("{:0>40}", address_hex)
            } else {
                address_hex.to_string()
            };
            
            println!("Input: {} -> Padded: {}", input, padded);
            assert_eq!(padded, expected);
            assert_eq!(padded.len(), 40);
        }
    }
    
    #[test]
    fn test_hex_case_preservation() {
        let checksummed = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B";
        let hex_part = &checksummed[2..];
        
        // Decoding and re-encoding loses case
        let bytes = hex::decode(hex_part).unwrap();
        let re_encoded = hex::encode(&bytes);
        
        println!("Original: {}", hex_part);
        println!("Re-encoded: {}", re_encoded);
        
        // These should NOT be equal (case is lost)
        assert_ne!(hex_part, re_encoded);
        assert_eq!(re_encoded, hex_part.to_lowercase());
    }
}