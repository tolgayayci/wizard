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
  };
  abi: any[] | null;
  code_snapshot?: string;
  wasm_binary?: Uint8Array;
  wasm_available?: boolean;
  abi_available?: boolean;
}

export interface DeploymentResult {
  success: boolean;
  contract_address?: string;
  transaction_hash?: string;
  stdout: string;
  stderr: string;
}