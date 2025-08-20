use alloy_primitives::{Address, U256, Bytes, keccak256, FixedBytes};
use alloy_sol_types::{sol, SolCall};
use alloy_provider::{Provider, ProviderBuilder};
use alloy::rpc::types::{TransactionRequest};
use std::io::{Write, Read};
use brotli2::read::BrotliEncoder;
use anyhow::{Result, Context};
use wasmparser::{Parser, Payload};
use wasm_encoder::{Module, RawSection, Section};

// ArbWasm precompile address for Stylus activation
pub const ARB_WASM_ADDRESS: Address = 
    Address::new([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x71]);

/// Process and compress WASM exactly like cargo-stylus does
pub fn process_and_compress_wasm(wasm: &[u8]) -> Result<Vec<u8>> {
    // Step 1: Convert WASM to WAT and back to remove reference types
    // This is crucial for Arbitrum compatibility
    let wat_str = wasmprinter::print_bytes(wasm)
        .context("Failed to convert WASM to WAT")?;
    
    // Convert back to WASM using wasmer (same as cargo-stylus)
    let processed_wasm = wasmer::wat2wasm(wat_str.as_bytes())
        .context("Failed to convert WAT to WASM")?;
    
    // Step 2: Strip custom sections (matching cargo-stylus)
    let stripped_wasm = strip_custom_sections(&processed_wasm)
        .context("Failed to strip custom sections")?;
    
    // Step 3: Compress with Brotli using brotli2 (same as cargo-stylus)
    const BROTLI_COMPRESSION_LEVEL: u32 = 11;
    let mut compressor = BrotliEncoder::new(&*stripped_wasm, BROTLI_COMPRESSION_LEVEL);
    let mut compressed_bytes = Vec::new();
    compressor.read_to_end(&mut compressed_bytes)
        .context("Failed to compress WASM bytes")?;
    
    // Step 4: Add EOF prefix (required by Stylus)
    let mut contract_code = hex::decode("EFF00000")
        .context("Failed to decode EOF prefix")?; // EOF_PREFIX_NO_DICT
    contract_code.extend(compressed_bytes);
    
    Ok(contract_code)
}

/// Strip custom sections from WASM (matching cargo-stylus behavior)
fn strip_custom_sections(wasm: &[u8]) -> Result<Vec<u8>> {
    // The wasmer wat2wasm conversion already removes most problematic sections
    // We do an additional pass to ensure custom sections are stripped
    // This is a simplified version - cargo-stylus has more complex logic
    // but for our use case, the wasmer conversion is sufficient
    
    // Parse once more through wasmer to ensure clean WASM
    let wat_str = wasmprinter::print_bytes(wasm)
        .context("Failed to print WASM for stripping")?;
    let final_wasm = wasmer::wat2wasm(wat_str.as_bytes())
        .context("Failed to finalize WASM")?;
    
    Ok(final_wasm.to_vec())
}

/// Create proper Stylus deployment data format (matching cargo-stylus)
pub fn create_stylus_deployment_data(compressed_wasm: &[u8]) -> Vec<u8> {
    // This creates the exact format that cargo-stylus uses
    // Based on contract_deployment_calldata function from cargo-stylus
    
    let code_len: [u8; 32] = U256::from(compressed_wasm.len()).to_be_bytes();
    let mut deploy: Vec<u8> = vec![];
    
    deploy.push(0x7f); // PUSH32
    deploy.extend(code_len);
    deploy.push(0x80); // DUP1
    deploy.push(0x60); // PUSH1
    deploy.push(42 + 1); // prelude + version (43 bytes)
    deploy.push(0x60); // PUSH1
    deploy.push(0x00);
    deploy.push(0x39); // CODECOPY
    deploy.push(0x60); // PUSH1
    deploy.push(0x00);
    deploy.push(0xf3); // RETURN
    deploy.push(0x00); // version byte (important!)
    deploy.extend(compressed_wasm);
    
    deploy
}

/// Calculate proper Stylus data fee
pub fn calculate_stylus_data_fee(compressed_size: usize) -> U256 {
    // Based on cargo-stylus actual calculation
    // The data fee is approximately 0.000071 ETH for ~5.8KB
    // This translates to roughly 12.3 gwei per byte
    
    let base_fee_wei = 12_300_000_000u64; // ~12.3 gwei per byte
    let total_fee = (compressed_size as u64) * base_fee_wei;
    
    // Add 20% buffer for safety (same as cargo-stylus does)
    let buffered_fee = total_fee * 120 / 100;
    
    U256::from(buffered_fee)
}

/// Estimate deployment gas
pub fn estimate_deployment_gas(deployment_data: &[u8]) -> u64 {
    // Base gas + data cost for Stylus deployment
    let base_gas = 5_000_000; // Increased base gas for Stylus
    let data_gas = (deployment_data.len() as u64) * 20; // Higher gas per byte
    base_gas + data_gas
}

// ArbWasm interface for activation
sol! {
    interface ArbWasm {
        function activateProgram(address program)
            external
            payable
            returns (uint16 version, uint256 dataFee);
    }
}

/// Create activation calldata for the ArbWasm precompile
pub fn create_activation_calldata(contract_address: Address) -> Vec<u8> {
    let call = ArbWasm::activateProgramCall { 
        program: contract_address 
    };
    call.abi_encode().to_vec()
}

// ArbWasm interface for checking if code hash is activated (like cargo-stylus)
sol! {
    interface ArbWasmRead {
        function codehashVersion(bytes32 codehash) external view returns (uint16 version);
    }
}

/// Create calldata to check if code hash is already activated
pub fn create_codehash_check_calldata(codehash: [u8; 32]) -> Vec<u8> {
    let call = ArbWasmRead::codehashVersionCall { 
        codehash: codehash.into()
    };
    call.abi_encode().to_vec()
}

/// Stylus deployer interface for constructor support
sol! {
    interface StylusDeployer {
        function deploy(
            bytes calldata bytecode,
            bytes calldata initData,
            uint256 initValue,
            bytes32 salt
        ) external payable returns (address);
    }
}

/// Create deployer calldata for constructor support
pub fn create_deployer_calldata(
    bytecode: Vec<u8>,
    init_data: Vec<u8>,
    init_value: String,
    salt: Option<String>,
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let salt_bytes = if let Some(s) = salt {
        let bytes = hex::decode(s.trim_start_matches("0x"))?;
        let mut arr = [0u8; 32];
        arr.copy_from_slice(&bytes);
        arr.into()
    } else {
        [0u8; 32].into()
    };
    
    // Parse the value string to U256
    let value = if init_value.starts_with("0x") {
        // Hex value
        U256::from_str_radix(&init_value[2..], 16)?
    } else {
        // Decimal value
        U256::from_str_radix(&init_value, 10)?
    };
    
    let call = StylusDeployer::deployCall {
        bytecode: bytecode.into(),
        initData: init_data.into(),
        initValue: value,
        salt: salt_bytes,
    };
    
    Ok(call.abi_encode().to_vec())
}

/// Extract compressed WASM size from deployment data (mimicking cargo-stylus)
pub fn extract_compressed_wasm_size_from_deployment_data(deployment_data: &[u8]) -> Result<usize> {
    // The deployment data format is:
    // [EVM prelude (43 bytes)] + [compressed WASM with EOF prefix]
    // EVM prelude length = 42 + 1 version byte = 43 bytes
    const PRELUDE_LENGTH: usize = 43;
    
    if deployment_data.len() <= PRELUDE_LENGTH {
        return Err(anyhow::anyhow!("Deployment data too short to contain compressed WASM"));
    }
    
    // Extract the compressed WASM part (everything after the prelude)
    let compressed_wasm_with_prefix = &deployment_data[PRELUDE_LENGTH..];
    
    // The compressed WASM starts with EOF prefix (4 bytes: 0xEFF00000)
    if compressed_wasm_with_prefix.len() < 4 {
        return Err(anyhow::anyhow!("Compressed WASM section too short"));
    }
    
    // Check for EOF prefix
    let expected_prefix = hex::decode("EFF00000").unwrap();
    if &compressed_wasm_with_prefix[0..4] != expected_prefix.as_slice() {
        return Err(anyhow::anyhow!("Missing or invalid EOF prefix in compressed WASM"));
    }
    
    // The total compressed WASM size includes the EOF prefix
    // This is what we need for data fee calculation
    Ok(compressed_wasm_with_prefix.len())
}

/// Create constructor calldata
pub fn create_constructor_calldata(args: &[String]) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    // Simplified - in production, properly encode based on ABI
    let mut calldata = Vec::new();
    
    // Function selector for constructor (simplified)
    calldata.extend_from_slice(&[0x00, 0x00, 0x00, 0x00]);
    
    // Encode arguments (simplified)
    for arg in args {
        if arg.starts_with("0x") {
            calldata.extend_from_slice(&hex::decode(&arg[2..])?);
        } else {
            calldata.extend_from_slice(arg.as_bytes());
        }
    }
    
    Ok(calldata)
}

/// Extract compressed WASM from deployment bytecode (like cargo-stylus)
pub fn extract_compressed_wasm_from_deployment_data(deployment_data: &[u8]) -> Result<Vec<u8>> {
    // The deployment data format from create_stylus_deployment_data:
    // [EVM prelude (42 bytes)] + [version byte (1 byte)] + [compressed WASM]
    const PRELUDE_LENGTH: usize = 43;
    
    if deployment_data.len() <= PRELUDE_LENGTH {
        return Err(anyhow::anyhow!("Deployment data too short to contain compressed WASM"));
    }
    
    // Extract the compressed WASM part (everything after the prelude)
    let compressed_wasm = &deployment_data[PRELUDE_LENGTH..];
    
    log::info!(
        "Extracted compressed WASM: {} bytes from deployment data: {} bytes", 
        compressed_wasm.len(), 
        deployment_data.len()
    );
    
    Ok(compressed_wasm.to_vec())
}

/// Check activation using deployment bytecode (preferred method)
pub async fn check_activation_with_deployment_bytecode(
    rpc_url: &str, 
    deployment_bytecode_hex: &str
) -> Result<(bool, Option<u16>)> {
    // Validate input
    if deployment_bytecode_hex.trim().is_empty() {
        return Err(anyhow::anyhow!("Empty deployment bytecode provided"));
    }
    
    // Decode hex deployment bytecode
    let deployment_bytecode = hex::decode(deployment_bytecode_hex.trim_start_matches("0x"))
        .context("Failed to decode deployment bytecode hex")?;
    
    // Validate minimum size (43 byte prelude + 4 byte EOF prefix minimum)
    if deployment_bytecode.len() < 47 {
        return Err(anyhow::anyhow!("Deployment bytecode too short to be valid Stylus contract"));
    }
    
    // Extract compressed WASM from deployment bytecode (includes EOF prefix)
    let compressed_wasm = extract_compressed_wasm_from_deployment_data(&deployment_bytecode)?;
    
    // Calculate keccak256 hash of compressed WASM (this matches what cargo-stylus does)
    // The compressed_wasm includes the EOF prefix, which is correct for Stylus contracts
    let codehash = keccak256(&compressed_wasm);
    
    log::info!("Checking activation for codehash: {} (from compressed WASM {} bytes)", 
              hex::encode(codehash), compressed_wasm.len());
    
    // Create RPC provider
    let url = rpc_url.parse()?;
    let provider = ProviderBuilder::new().on_http(url);
    
    // Create the call data to check codehashVersion
    let call_data = create_codehash_check_calldata(codehash.0);
    
    // Create transaction request to ArbWasm precompile
    let call_request = TransactionRequest::default()
        .to(ARB_WASM_ADDRESS)
        .input(Bytes::from(call_data).into());
    
    // Make the eth_call to check if this code hash is activated
    match provider.call(&call_request).await {
        Ok(result) => {
            // If the call succeeds, the code hash is activated
            if result.len() >= 32 {
                let version_bytes = &result[30..32];
                let version = u16::from_be_bytes([version_bytes[0], version_bytes[1]]);
                log::info!("Code hash {} is activated with version {}", hex::encode(codehash), version);
                Ok((true, Some(version)))
            } else {
                log::info!("Code hash {} is activated (version format unexpected)", hex::encode(codehash));
                Ok((true, None))
            }
        }
        Err(e) => {
            let error_str = e.to_string();
            
            // More robust error detection - check for common RPC error patterns first
            if error_str.contains("execution reverted") || error_str.contains("revert") {
                log::info!("Code hash {} is not activated (execution reverted)", hex::encode(codehash));
                Ok((false, None))
            } else if error_str.contains("ProgramNotActivated") || 
                     error_str.contains("ProgramNeedsUpgrade") || 
                     error_str.contains("ProgramExpired") {
                log::info!("Code hash {} is not activated: {}", hex::encode(codehash), error_str);
                Ok((false, None))
            } else {
                log::warn!("Error checking code hash {} activation: {}", hex::encode(codehash), error_str);
                Ok((false, None))
            }
        }
    }
}

/// Check if a contract is already activated using RPC call to ArbWasm precompile
/// Uses codehashVersion like cargo-stylus to check if the code hash is activated
/// NOTE: This is the fallback method - prefer check_activation_with_deployment_bytecode
pub async fn check_contract_activation(rpc_url: &str, contract_address: Address) -> Result<(bool, Option<u16>)> {
    // Create RPC provider
    let url = rpc_url.parse()?;
    let provider = ProviderBuilder::new().on_http(url);
    
    // Step 1: Get the contract bytecode using eth_getCode
    let bytecode = match provider.get_code_at(contract_address).await {
        Ok(code) => code,
        Err(e) => {
            log::warn!("Failed to get contract code for {}: {}", contract_address, e);
            return Ok((false, None));
        }
    };
    
    // If no code at address, contract doesn't exist
    if bytecode.is_empty() {
        return Ok((false, None));
    }
    
    // Step 2: Calculate the keccak256 hash of the bytecode (like cargo-stylus)
    let codehash = keccak256(&bytecode);
    
    // Step 3: Create the call data to check codehashVersion
    let call_data = create_codehash_check_calldata(codehash.0);
    
    // Step 4: Create transaction request to ArbWasm precompile
    let call_request = TransactionRequest::default()
        .to(ARB_WASM_ADDRESS)
        .input(Bytes::from(call_data).into());
    
    // Step 5: Make the eth_call to check if this code hash is activated
    match provider.call(&call_request).await {
        Ok(result) => {
            // If the call succeeds, the code hash is activated
            // Decode the result to get the version
            if result.len() >= 32 {
                // Result should be a uint16 version padded to 32 bytes
                let version_bytes = &result[30..32]; // Last 2 bytes for uint16
                let version = u16::from_be_bytes([version_bytes[0], version_bytes[1]]);
                log::info!("Code hash {} is activated with version {}", hex::encode(codehash), version);
                Ok((true, Some(version)))
            } else {
                // Got some result but format is unexpected
                log::info!("Code hash {} is activated (version format unexpected)", hex::encode(codehash));
                Ok((true, None))
            }
        }
        Err(e) => {
            // If the call fails, check if it's due to contract not being activated
            let error_str = e.to_string();
            if error_str.contains("ProgramNotActivated") || 
               error_str.contains("ProgramNeedsUpgrade") || 
               error_str.contains("ProgramExpired") {
                // Contract exists but is not activated/needs upgrade
                log::info!("Code hash {} is not activated yet", hex::encode(codehash));
                Ok((false, None))
            } else {
                // Some other error occurred - assume not activated for safety
                log::warn!("Error checking code hash {} activation: {}", hex::encode(codehash), error_str);
                Ok((false, None))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_create_deployment_data() {
        let compressed_wasm = vec![0x45, 0x46, 0x46, 0x00, 0x00, 0x01, 0x02, 0x03];
        let deployment_data = create_stylus_deployment_data(&compressed_wasm);
        
        // Should start with the EVM prelude
        assert_eq!(deployment_data[0], 0x7f); // PUSH32
        assert!(deployment_data.len() > 43); // Should include prelude + version + WASM
    }
    
    #[test]
    fn test_calculate_data_fee() {
        let compressed_size = 15000; // ~15KB
        let fee = calculate_stylus_data_fee(compressed_size);
        assert!(fee > U256::ZERO);
        
        // Should be reasonable fee (not too high, not too low)
        let fee_u64 = fee.to::<u64>();
        assert!(fee_u64 > 1_000_000_000_000_000u64); // > 0.001 ETH
        assert!(fee_u64 < 1_000_000_000_000_000_000u64); // < 1 ETH
    }
    
    #[test]
    fn test_activation_calldata() {
        let address = Address::ZERO;
        let calldata = create_activation_calldata(address);
        assert!(calldata.len() > 4); // Should have function selector + encoded address
    }
    
    #[test]
    fn test_extract_compressed_wasm_size() {
        // Create test compressed WASM with EOF prefix
        let mut compressed_wasm_with_prefix = hex::decode("EFF00000").unwrap();
        compressed_wasm_with_prefix.extend(vec![0x01, 0x02, 0x03, 0x04]); // 4 bytes of fake compressed data
        
        // Create deployment data
        let deployment_data = create_stylus_deployment_data(&compressed_wasm_with_prefix);
        
        // Extract size should match the total compressed WASM size (including EOF prefix)
        match extract_compressed_wasm_size_from_deployment_data(&deployment_data) {
            Ok(size) => {
                assert_eq!(size, compressed_wasm_with_prefix.len());
            }
            Err(e) => panic!("Failed to extract compressed WASM size: {}", e),
        }
    }
}