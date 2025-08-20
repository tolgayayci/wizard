export interface User {
  id: string;
  email: string;
  name?: string;
  company?: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  code: string;
  created_at: string;
  updated_at: string;
  last_compilation?: CompilationResult;
  metadata?: Record<string, any>;
  last_activity_at?: string;
  is_public?: boolean;
  shared_at?: string;
  view_count?: number;
  deployment_count?: number;
  source_url?: string;
  import_type?: 'template' | 'github' | 'manual';
  import_metadata?: {
    files_count?: number;
    import_date?: string;
    repository_name?: string;
    repository_owner?: string;
    original_description?: string;
  };
}

// ABI-specific types
export interface AbiInput {
  name: string;
  type: string;
  indexed?: boolean;
  internalType?: string;
}

export interface AbiOutput {
  name: string;
  type: string;
  internalType?: string;
}

export interface AbiFunction {
  type: 'function' | 'constructor' | 'event' | 'fallback' | 'receive';
  name?: string;
  inputs?: AbiInput[];
  outputs?: AbiOutput[];
  stateMutability?: 'pure' | 'view' | 'nonpayable' | 'payable';
  anonymous?: boolean;
}

export type AbiItem = AbiFunction;

export interface CompilationResult {
  success: boolean;
  exit_code: number;
  stdout: string;
  stderr: string;
  details: {
    status: string;
    compilation_time: number;
    project_path?: string;
    contract_size?: string;
    wasm_size?: string;
    metadata_hash?: string;
    wasm_hex?: string;
    salt?: string;
  };
  abi: AbiItem[] | null;
  code_snapshot?: string;
  wasm_binary?: Uint8Array;
  wasm_available?: boolean;
  abi_available?: boolean;
}

export interface DeploymentResult {
  success: boolean;
  contract_address?: string;
  transaction_hash?: string;
  stdout?: string;
  stderr?: string;
  transaction?: {
    deployment_tx_hash: string;
    activation_tx_hash?: string;
    contract_address: string;
    deployer_address: string;
    chain_id: number;
  };
  deployment_time?: number;
  gas_used?: string;
  deployment_cost?: string;
  verification_status?: string;
}

export interface Deployment {
  id: string;
  project_id: string;
  user_id?: string;
  contract_address: string;
  chain_id: number;
  chain_name: string;
  tx_hash?: string;
  deployment_mode?: 'wizard' | 'user';
  deployer_address?: string;
  network_info?: {
    chain_id: number;
    name: string;
    rpc_url?: string;
    explorer_url?: string;
    is_testnet?: boolean;
    currency?: string;
  };
  explorer_base_url?: string;
  deployed_code?: string;
  abi?: AbiItem[];
  verification_status?: 'pending' | 'verified' | 'failed';
  verification_guid?: string;
  verified_at?: string;
  metadata?: {
    deployment_time?: number;
    tx_hash?: string;
    deployment_mode?: string;
    deployer_address?: string;
    activation_tx_hash?: string;
    gas_used?: string;
    deployment_cost?: string;
  };
  created_at: string;
  updated_at?: string;
}

// Type alias for ABIMethod (used in components)
export type ABIMethod = AbiFunction;

// Contract Event type for blockchain events
export interface ContractEvent {
  id?: string;
  project_id: string;
  deployment_id?: string;
  contract_address: string;
  event_name: string;
  event_signature: string;
  block_number: number;
  transaction_hash: string;
  transaction_index: number;
  log_index: number;
  args: Record<string, any>;
  topics: string[];
  timestamp: number;
  chain_id: number;
  removed?: boolean;
  created_at?: string;
}

// ABI Call type for contract method calls
export interface ABICall {
  id: string;
  project_id: string;
  deployment_id?: string;
  contract_address: string;
  method_name: string;
  method_signature: string;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  transaction_hash?: string;
  status: 'pending' | 'success' | 'error';
  error_message?: string;
  gas_used?: string;
  created_at: string;
}

// Contract configuration for interactions
export interface ContractConfig {
  address: string;
  abi: AbiItem[];
  provider?: any;
  signer?: any;
}

// Execute options for contract methods
export interface ExecuteOptions {
  value?: string;
  gasLimit?: string;
}