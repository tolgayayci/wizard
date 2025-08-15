import { API_URL } from './config';

export interface CrateInfo {
  name: string;
  description?: string;
  version: string;
  downloads: number;
  repository?: string;
  documentation?: string;
}

export interface PackageInstallRequest {
  user_id: string;
  project_id: string;
  package_name: string;
  version: string;
}

export interface PackageRemoveRequest {
  user_id: string;
  project_id: string;
  package_name: string;
}

export interface ProjectDependency {
  name: string;
  version: string;
  is_default: boolean; // true for stylus-sdk, alloy-primitives, etc.
  downloads?: number;
  repository?: string;
  documentation?: string;
  description?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Search for crates on crates.io
 */
export async function searchCrates(
  query: string,
  page: number = 1,
  perPage: number = 20
): Promise<CrateInfo[]> {
  const params = new URLSearchParams({
    q: query,
    page: page.toString(),
    per_page: perPage.toString(),
  });

  const response = await fetch(`${API_URL}/api/crates/search?${params}`);
  const result: ApiResponse<CrateInfo[]> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to search crates');
  }

  return result.data || [];
}

/**
 * Get detailed information about a specific crate
 */
export async function getCrateInfo(crateName: string): Promise<CrateInfo> {
  const response = await fetch(`${API_URL}/api/crates/info/${encodeURIComponent(crateName)}`);
  const result: ApiResponse<CrateInfo> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to get crate info');
  }

  if (!result.data) {
    throw new Error('Crate not found');
  }

  return result.data;
}

/**
 * Get popular crates with real data from crates.io
 */
export async function getPopularCrates(): Promise<CrateInfo[]> {
  const response = await fetch(`${API_URL}/api/crates/popular`);
  const result: ApiResponse<CrateInfo[]> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to get popular crates');
  }

  return result.data || [];
}

/**
 * Install a package to a project
 */
export async function installPackage(
  projectId: string,
  userId: string,
  packageName: string,
  version: string
): Promise<void> {
  const response = await fetch(`${API_URL}/api/packages/install`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      project_id: projectId,
      package_name: packageName,
      version: version,
    } as PackageInstallRequest),
  });

  const result: ApiResponse<void> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to install package');
  }
}

/**
 * Remove a package from a project
 */
export async function removePackage(
  projectId: string,
  userId: string,
  packageName: string
): Promise<void> {
  const response = await fetch(`${API_URL}/api/packages/remove`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      project_id: projectId,
      package_name: packageName,
    } as PackageRemoveRequest),
  });

  const result: ApiResponse<void> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to remove package');
  }
}

/**
 * Get list of installed dependencies for a project
 */
export async function getProjectDependencies(
  projectId: string,
  userId: string
): Promise<ProjectDependency[]> {
  const params = new URLSearchParams({
    user_id: userId,
    project_id: projectId,
  });

  const response = await fetch(`${API_URL}/api/packages/list?${params}`);
  const result: ApiResponse<ProjectDependency[]> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to get project dependencies');
  }

  return result.data || [];
}

/**
 * Update a package version in a project
 */
export async function updatePackage(
  projectId: string,
  userId: string,
  packageName: string,
  newVersion: string
): Promise<void> {
  const response = await fetch(`${API_URL}/api/packages/update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      project_id: projectId,
      package_name: packageName,
      version: newVersion,
    }),
  });

  const result: ApiResponse<void> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to update package');
  }
}

/**
 * Popular/Essential packages for Stylus projects
 */
export const POPULAR_PACKAGES: Array<{
  name: string;
  version: string;
  description: string;
  category: 'core' | 'utility' | 'crypto';
  isDefault?: boolean;
  downloads?: number;
  repository?: string;
  documentation?: string;
}> = [
  {
    name: 'stylus-sdk',
    version: '0.9.0',
    description: 'The official Stylus SDK for smart contract development',
    category: 'core',
    isDefault: true,
    downloads: 12500,
    repository: 'https://github.com/OffchainLabs/stylus-sdk-rs',
    documentation: 'https://docs.rs/stylus-sdk',
  },
  {
    name: 'alloy-primitives',
    version: '1.3',
    description: 'Fast, compact, and efficient Ethereum types',
    category: 'core',
    isDefault: true,
    downloads: 2500000,
    repository: 'https://github.com/alloy-rs/core',
    documentation: 'https://docs.rs/alloy-primitives',
  },
  {
    name: 'alloy-sol-types',
    version: '1.3',
    description: 'Solidity type definitions for Rust',
    category: 'core',
    isDefault: true,
    downloads: 1800000,
    repository: 'https://github.com/alloy-rs/core',
    documentation: 'https://docs.rs/alloy-sol-types',
  },
  {
    name: 'hex',
    version: '0.4',
    description: 'Encoding and decoding hexadecimal strings',
    category: 'utility',
    downloads: 350000000,
    repository: 'https://github.com/KokaKiwi/rust-hex',
    documentation: 'https://docs.rs/hex',
  },
  {
    name: 'sha3',
    version: '0.10',
    description: 'Pure Rust implementation of SHA-3',
    category: 'crypto',
    downloads: 45000000,
    repository: 'https://github.com/RustCrypto/hashes',
    documentation: 'https://docs.rs/sha3',
  },
  {
    name: 'tiny-keccak',
    version: '2.0',
    description: 'Keccak hash function implementation',
    category: 'crypto',
    downloads: 15000000,
    repository: 'https://github.com/debris/tiny-keccak',
    documentation: 'https://docs.rs/tiny-keccak',
  },
  {
    name: 'serde',
    version: '1.0',
    description: 'Serialization framework for Rust',
    category: 'utility',
    downloads: 750000000,
    repository: 'https://github.com/serde-rs/serde',
    documentation: 'https://docs.rs/serde',
  },
  {
    name: 'serde_json',
    version: '1.0',
    description: 'JSON support for serde framework',
    category: 'utility',
    downloads: 650000000,
    repository: 'https://github.com/serde-rs/json',
    documentation: 'https://docs.rs/serde_json',
  },
  {
    name: 'ethers',
    version: '2.0',
    description: 'Complete Ethereum and Celo library for Rust',
    category: 'core',
    downloads: 5500000,
    repository: 'https://github.com/gakonst/ethers-rs',
    documentation: 'https://docs.rs/ethers',
  },
  {
    name: 'tokio',
    version: '1.0',
    description: 'Asynchronous runtime for Rust',
    category: 'utility',
    downloads: 450000000,
    repository: 'https://github.com/tokio-rs/tokio',
    documentation: 'https://docs.rs/tokio',
  },
  {
    name: 'anyhow',
    version: '1.0',
    description: 'Flexible concrete Error type for Rust',
    category: 'utility',
    downloads: 380000000,
    repository: 'https://github.com/dtolnay/anyhow',
    documentation: 'https://docs.rs/anyhow',
  },
  {
    name: 'thiserror',
    version: '1.0',
    description: 'Derive macros for Error trait',
    category: 'utility',
    downloads: 320000000,
    repository: 'https://github.com/dtolnay/thiserror',
    documentation: 'https://docs.rs/thiserror',
  },
  {
    name: 'log',
    version: '0.4',
    description: 'Logging facade for Rust',
    category: 'utility',
    downloads: 420000000,
    repository: 'https://github.com/rust-lang/log',
    documentation: 'https://docs.rs/log',
  },
  {
    name: 'env_logger',
    version: '0.11',
    description: 'Simple logger implementation for log facade',
    category: 'utility',
    downloads: 85000000,
    repository: 'https://github.com/rust-cli/env_logger',
    documentation: 'https://docs.rs/env_logger',
  },
  {
    name: 'clap',
    version: '4.0',
    description: 'Command line argument parser',
    category: 'utility',
    downloads: 180000000,
    repository: 'https://github.com/clap-rs/clap',
    documentation: 'https://docs.rs/clap',
  },
  {
    name: 'reqwest',
    version: '0.11',
    description: 'HTTP client for Rust',
    category: 'utility',
    downloads: 150000000,
    repository: 'https://github.com/seanmonstar/reqwest',
    documentation: 'https://docs.rs/reqwest',
  },
  {
    name: 'uuid',
    version: '1.0',
    description: 'Generate and parse UUIDs',
    category: 'utility',
    downloads: 250000000,
    repository: 'https://github.com/uuid-rs/uuid',
    documentation: 'https://docs.rs/uuid',
  },
  {
    name: 'chrono',
    version: '0.4',
    description: 'Date and time library for Rust',
    category: 'utility',
    downloads: 280000000,
    repository: 'https://github.com/chronotope/chrono',
    documentation: 'https://docs.rs/chrono',
  },
  {
    name: 'rand',
    version: '0.8',
    description: 'Random number generation',
    category: 'utility',
    downloads: 320000000,
    repository: 'https://github.com/rust-random/rand',
    documentation: 'https://docs.rs/rand',
  },
  {
    name: 'regex',
    version: '1.0',
    description: 'Regular expressions for Rust',
    category: 'utility',
    downloads: 290000000,
    repository: 'https://github.com/rust-lang/regex',
    documentation: 'https://docs.rs/regex',
  },
  {
    name: 'url',
    version: '2.0',
    description: 'URL parser for Rust',
    category: 'utility',
    downloads: 380000000,
    repository: 'https://github.com/servo/rust-url',
    documentation: 'https://docs.rs/url',
  },
  {
    name: 'base64',
    version: '0.21',
    description: 'Base64 encoding and decoding',
    category: 'utility',
    downloads: 420000000,
    repository: 'https://github.com/marshallpierce/rust-base64',
    documentation: 'https://docs.rs/base64',
  },
  {
    name: 'bytes',
    version: '1.0',
    description: 'Utilities for working with bytes',
    category: 'utility',
    downloads: 380000000,
    repository: 'https://github.com/tokio-rs/bytes',
    documentation: 'https://docs.rs/bytes',
  },
  {
    name: 'futures',
    version: '0.3',
    description: 'Zero-cost futures and streams',
    category: 'utility',
    downloads: 280000000,
    repository: 'https://github.com/rust-lang/futures-rs',
    documentation: 'https://docs.rs/futures',
  },
  {
    name: 'once_cell',
    version: '1.0',
    description: 'Single assignment cells and lazy values',
    category: 'utility',
    downloads: 350000000,
    repository: 'https://github.com/matklad/once_cell',
    documentation: 'https://docs.rs/once_cell',
  },
  {
    name: 'lazy_static',
    version: '1.4',
    description: 'Static variables with runtime initialization',
    category: 'utility',
    downloads: 420000000,
    repository: 'https://github.com/rust-lang-nursery/lazy-static.rs',
    documentation: 'https://docs.rs/lazy_static',
  },
  {
    name: 'parking_lot',
    version: '0.12',
    description: 'Compact synchronization primitives',
    category: 'utility',
    downloads: 180000000,
    repository: 'https://github.com/Amanieu/parking_lot',
    documentation: 'https://docs.rs/parking_lot',
  },
  {
    name: 'dashmap',
    version: '5.0',
    description: 'Concurrent hashmap implementation',
    category: 'utility',
    downloads: 85000000,
    repository: 'https://github.com/xacrimon/dashmap',
    documentation: 'https://docs.rs/dashmap',
  },
  {
    name: 'rayon',
    version: '1.7',
    description: 'Data parallelism library for Rust',
    category: 'utility',
    downloads: 120000000,
    repository: 'https://github.com/rayon-rs/rayon',
    documentation: 'https://docs.rs/rayon',
  },
  {
    name: 'crossbeam',
    version: '0.8',
    description: 'Tools for concurrent programming',
    category: 'utility',
    downloads: 150000000,
    repository: 'https://github.com/crossbeam-rs/crossbeam',
    documentation: 'https://docs.rs/crossbeam',
  },
];