import axios from 'axios';
import { CompilationResult, DeploymentResult } from './types';
import { API_URL } from './config';

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For cookies/session support
});

// Internal api reference for backward compatibility
const api = apiClient;

interface CompileRequest {
  user_id: string;
  project_id: string;
  code: string;
}

interface DeployRequest {
  user_id: string;
  project_id: string;
}

interface FormatRequest {
  user_id: string;
  project_id: string;
  file_path?: string;
}

interface LintRequest {
  user_id: string;
  project_id: string;
  file_path?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  error: {
    code: string;
    message: string;
    details: string | null;
  } | null;
}

interface CompileResponse {
  success: boolean;
  exit_code: number;
  stdout: string;
  stderr: string;
  details: {
    status: string;
    compilation_time: number;
    project_path: string;
  };
  abi: any | null;
}

/**
 * Compile a Stylus smart contract
 */
export async function compileContract(
  code: string,
  userId: string,
  projectId: string
): Promise<CompilationResult> {
  try {
    const payload: CompileRequest = {
      user_id: userId,
      project_id: projectId,
      code: code, // Include the actual code in the request
    };

    // Use local compilation endpoint
    const { data: response } = await api.post<ApiResponse<any>>('/local/compile', payload);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Compilation failed');
    }

    // Handle local compiler response format
    const localResult = response.data;
    
    // Parse ABI - it may be abi_json or abi field
    let parsedAbi = [];
    if (localResult.abi_json) {
      try {
        parsedAbi = JSON.parse(localResult.abi_json);
      } catch (e) {
        console.error('Failed to parse ABI JSON:', e);
      }
    } else if (localResult.abi) {
      try {
        parsedAbi = JSON.parse(localResult.abi);
      } catch (e) {
        console.error('Failed to parse ABI:', e);
      }
    }
    
    return {
      success: localResult.success,
      exit_code: localResult.success ? 0 : 1,
      stdout: localResult.output || '',
      stderr: localResult.errors ? localResult.errors.join('\n') : '',
      details: {
        status: localResult.success ? 'success' : 'failed',
        compilation_time: 0,
        project_path: '',
        contract_size: localResult.contract_size,
        wasm_size: localResult.wasm_size,
        metadata_hash: localResult.metadata_hash,
        wasm_hex: localResult.wasm_hex,
        salt: localResult.salt,
      },
      abi: parsedAbi,
      code_snapshot: code,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      const apiError = error.response.data as ApiResponse<any>;
      throw new Error(apiError.error?.message || 'Failed to compile contract');
    }
    throw error instanceof Error 
      ? error 
      : new Error('Failed to compile contract');
  }
}

/**
 * Deploy a compiled contract to Superposition Testnet
 */
export async function deployContract(
  userId: string,
  projectId: string
): Promise<DeploymentResult> {
  try {
    const payload: DeployRequest = {
      user_id: userId,
      project_id: projectId,
    };

    const { data: response } = await api.post<ApiResponse<DeploymentResult>>('/deploy', payload);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Deployment failed');
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      const apiError = error.response.data as ApiResponse<any>;
      throw new Error(apiError.error?.message || 'Failed to deploy contract');
    }
    throw error instanceof Error 
      ? error 
      : new Error('Failed to deploy contract');
  }
}

/**
 * Initialize project filesystem on backend
 * This creates the actual project files and directory structure
 */
export async function initializeProjectFilesystem(
  projectId: string,
  userId: string,
  projectName: string,
  code: string,
  dependencies?: string[]
): Promise<{ success: boolean; message: string }> {
  console.log('[API] Initializing project filesystem:', {
    projectId,
    userId,
    projectName,
    codeLength: code.length,
    dependencies
  });
  
  try {
    const payload = {
      project_id: projectId,
      user_id: userId,
      project_name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '_'),
      code,
      dependencies,
    };
    
    console.log('[API] Sending request to /projects/initialize with payload:', payload);
    
    const response = await api.post('/projects/initialize', payload);
    
    console.log('[API] Response from backend:', response.data);

    if (!response.data.success) {
      throw new Error(response.data.error?.message || response.data.message || 'Failed to initialize project');
    }

    return {
      success: true,
      message: response.data.message || 'Project initialized successfully',
    };
  } catch (error) {
    console.error('[API] Failed to initialize project filesystem:', error);
    if (axios.isAxiosError(error)) {
      console.error('[API] Axios error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      if (error.response?.data) {
        const apiError = error.response.data as ApiResponse<any>;
        return {
          success: false,
          message: apiError.error?.message || 'Failed to initialize project',
        };
      }
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to initialize project',
    };
  }
}

// Template types and functions
export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  features: string[];
  githubUrl?: string;
}

export interface ListTemplatesResponse {
  templates: Template[];
}

/**
 * Get list of available templates
 */
export async function listTemplates(): Promise<Template[]> {
  try {
    console.log('[API] Fetching available templates');
    
    const response = await api.get<ApiResponse<ListTemplatesResponse>>('/templates/list');
    
    if (response.data.success && response.data.data) {
      console.log('[API] Templates retrieved:', response.data.data.templates);
      return response.data.data.templates;
    } else {
      console.error('[API] Templates fetch failed:', response.data.message);
      throw new Error(response.data.message || 'Failed to fetch templates');
    }
  } catch (error) {
    console.error('[API] Error fetching templates:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(error.response.data?.message || 'Server error while fetching templates');
      } else if (error.request) {
        throw new Error('Unable to connect to server');
      }
    }
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch templates');
  }
}

/**
 * Initialize project from a template
 */
export async function initializeProjectFromTemplate(
  projectId: string,
  userId: string,
  templateId: string,
  projectName: string
): Promise<{ success: boolean; message: string }> {
  console.log('[API] Initializing project from template:', {
    projectId,
    userId,
    templateId,
    projectName
  });
  
  try {
    const payload = {
      project_id: projectId,
      user_id: userId,
      template_id: templateId,
      project_name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '_'),
    };
    
    console.log('[API] Sending request to /templates/initialize with payload:', payload);
    
    const response = await api.post<ApiResponse<{ success: boolean; message: string }>>('/templates/initialize', payload);
    
    console.log('[API] Template initialization response:', response.data);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    } else {
      console.error('[API] Template initialization failed:', response.data);
      return {
        success: false,
        message: response.data.message || 'Failed to initialize project from template',
      };
    }
  } catch (error) {
    console.error('[API] Error initializing project from template:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error('[API] Server error response:', error.response.data);
        return {
          success: false,
          message: error.response.data?.message || 'Server error during template initialization',
        };
      } else if (error.request) {
        return {
          success: false,
          message: 'Unable to connect to server',
        };
      }
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to initialize project from template',
    };
  }
}

// Types for formatting and linting
export interface FormatResult {
  success: boolean;
  formatted_code?: string;
  output: string;
  errors: string[];
}

export interface LintIssue {
  level: string; // "error", "warning", "info", "hint"
  message: string;
  line?: number;
  column?: number;
  code?: string; // Clippy lint code like "clippy::redundant_closure"
  suggestion?: string;
}

export interface LintResult {
  success: boolean;
  issues: LintIssue[];
  output: string;
  errors: string[];
}

/**
 * Format code using rustfmt
 */
export async function formatCode(
  userId: string,
  projectId: string,
  filePath?: string
): Promise<FormatResult> {
  try {
    const payload: FormatRequest = {
      user_id: userId,
      project_id: projectId,
      file_path: filePath,
    };

    const { data: response } = await api.post<ApiResponse<FormatResult>>('/format', payload);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Formatting failed');
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      const apiError = error.response.data as ApiResponse<any>;
      throw new Error(apiError.error?.message || 'Failed to format code');
    }
    throw error instanceof Error 
      ? error 
      : new Error('Failed to format code');
  }
}

/**
 * Lint code using clippy
 */
export async function lintCode(
  userId: string,
  projectId: string,
  filePath?: string
): Promise<LintResult> {
  try {
    const payload: LintRequest = {
      user_id: userId,
      project_id: projectId,
      file_path: filePath,
    };

    const { data: response } = await api.post<ApiResponse<LintResult>>('/lint', payload);

    // If the API call was successful (we got a response), return the lint data
    // Even if response.success is false, that just means the linting found issues
    if (response.data) {
      return response.data;
    }
    
    // Only throw if we truly got no data
    throw new Error(response.error?.message || 'Linting failed');
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      const apiError = error.response.data as ApiResponse<any>;
      throw new Error(apiError.error?.message || 'Failed to lint code');
    }
    throw error instanceof Error
      ? error
      : new Error('Failed to lint code');
  }
}

// Chat types and functions
export interface ChatResponseData {
  response: string;
  timestamp: string;
}

/**
 * Send a chat message to the AI assistant
 * The AI has access only to the specified project directory
 */
export async function sendChatMessage(
  userId: string,
  projectId: string,
  message: string
): Promise<ApiResponse<ChatResponseData>> {
  try {
    const payload = {
      user_id: userId,
      project_id: projectId,
      message,
    };

    const { data: response } = await api.post<ApiResponse<ChatResponseData>>('/chat', payload);

    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      return error.response.data as ApiResponse<ChatResponseData>;
    }
    return {
      success: false,
      message: 'Failed to send chat message',
      data: null,
      error: {
        code: 'CHAT_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: null,
      },
    };
  }
}