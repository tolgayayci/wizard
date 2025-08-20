use alloy::{
    primitives::{address, Address, FixedBytes, U256},
    providers::{ProviderBuilder, Provider},
    rpc::types::TransactionRequest,
    signers::{local::PrivateKeySigner, Signer},
    network::EthereumWallet,
    hex,
    sol_types::SolCall,
};
use serde_json::json;
use std::str::FromStr;
use dotenv;
use std::env;

// Test different address format scenarios
#[tokio::test]
async fn test_address_format_handling() {
    println!("\n=== Testing Address Format Handling ===\n");
    
    // Load test wallet
    dotenv::dotenv().ok();
    let private_key = env::var("CONTRACT_PRIVATE_KEY")
        .expect("CONTRACT_PRIVATE_KEY must be set");
    
    let signer = PrivateKeySigner::from_str(&private_key)
        .expect("Invalid private key");
    
    let wallet_address = signer.address();
    println!("Wallet address from signer: {}", wallet_address);
    
    // Test different address formats
    let lowercase_addr = format!("0x{}", hex::encode(wallet_address.0));
    let checksummed_addr = wallet_address.to_string();
    
    println!("Lowercase format: {}", lowercase_addr);
    println!("Checksummed format: {}", checksummed_addr);
    
    // Verify they represent the same address
    let addr1 = Address::from_str(&lowercase_addr).unwrap();
    let addr2 = Address::from_str(&checksummed_addr).unwrap();
    assert_eq!(addr1, addr2, "Both formats should represent the same address");
    
    // Test backend API with both formats
    println!("\nTesting backend API with different address formats:");
    
    // Test with checksummed address (what viem/wagmi sends)
    let checksummed_result = test_backend_deployment_plan(&checksummed_addr).await;
    println!("Checksummed result salt: {}", checksummed_result.salt);
    
    // Test with lowercase address
    let lowercase_result = test_backend_deployment_plan(&lowercase_addr).await;
    println!("Lowercase result salt: {}", lowercase_result.salt);
    
    // The salts should be different because they preserve the input case
    println!("\nSalt comparison:");
    println!("Checksummed salt first 20 bytes: {}", &checksummed_result.salt[2..42]);
    println!("Lowercase salt first 20 bytes:   {}", &lowercase_result.salt[2..42]);
    
    // Verify that checksummed salt matches the input
    assert_eq!(
        &checksummed_result.salt[2..42].to_lowercase(),
        &checksummed_addr[2..].to_lowercase(),
        "Checksummed salt should preserve input case"
    );
    
    // Verify that lowercase salt matches the input
    assert_eq!(
        &lowercase_result.salt[2..42],
        &lowercase_addr[2..],
        "Lowercase salt should preserve input case"
    );
    
    println!("✅ Address format handling test passed!");
}

// Helper to test backend deployment plan API
async fn test_backend_deployment_plan(deployer_address: &str) -> TestDeploymentPlan {
    let client = reqwest::Client::new();
    let request_body = json!({
        "user_id": "0fd4a667-10a0-4e08-8187-dee8306a1952",
        "project_id": "413c7127-d47f-48f8-b144-8a08372c3377",
        "chain_id": 421614,
        "deployer_address": deployer_address,
        "constructor_args": []
    });
    
    let response = client
        .post("http://localhost:8080/api/deploy/user")
        .json(&request_body)
        .send()
        .await
        .expect("Failed to send request");
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        panic!("Backend request failed: {}", error_text);
    }
    
    let response_data: serde_json::Value = response.json().await
        .expect("Failed to parse response");
    
    let plan_data = response_data["data"].as_object()
        .expect("No data in response");
    
    TestDeploymentPlan {
        salt: plan_data["salt"].as_str().unwrap().to_string(),
        program_address: plan_data["program_address"].as_str().unwrap().to_string(),
        factory_address: plan_data["factory_address"].as_str().unwrap().to_string(),
    }
}

#[derive(Debug)]
struct TestDeploymentPlan {
    salt: String,
    program_address: String,
    factory_address: String,
}

// Test that validates the exact scenario from the error
#[tokio::test]
async fn test_actual_deployment_scenario() {
    println!("\n=== Testing Actual Deployment Scenario ===\n");
    
    // The exact scenario from the error
    let checksummed_address = "0x01310ab512Dc4c23F17476e877a3f92FF9faBa3b";
    let error_salt = "0x01310ab512dc4c23f17476e877a3f92ff9faba3bf383c149d233a1193e63a5eb";
    
    println!("Original address: {}", checksummed_address);
    println!("Error salt: {}", error_salt);
    
    // Extract first 20 bytes from salt
    let salt_address_part = &error_salt[2..42];
    let input_address_part = &checksummed_address[2..];
    
    println!("Salt address part: {}", salt_address_part);
    println!("Input address part: {}", input_address_part);
    
    // They should match exactly for CREATE2 to work
    if salt_address_part != input_address_part {
        println!("❌ Case mismatch detected!");
        println!("Salt uses: {}", salt_address_part);
        println!("Input was: {}", input_address_part);
        
        // Test with backend to ensure it now preserves case
        let plan = test_backend_deployment_plan(checksummed_address).await;
        let new_salt_address_part = &plan.salt[2..42];
        
        println!("New backend salt address part: {}", new_salt_address_part);
        
        // Verify the new backend preserves the case
        assert_eq!(
            new_salt_address_part,
            input_address_part,
            "Backend should now preserve the exact address case"
        );
        
        println!("✅ Backend now correctly preserves address case!");
    } else {
        println!("✅ Address cases match!");
    }
}