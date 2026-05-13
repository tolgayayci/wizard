import type { Template } from '@/lib/templates';

/**
 * Workshop challenges from EthCluj 2026. Each entry behaves like a normal template in the UI,
 * but clicking "Use Template" opens the GitHub import dialog pre-filled with the repo URL
 * instead of copying from the backend `examples/` directory.
 *
 * To add a new challenge: append an entry. The Netlify deploy ships it — no backend rebuild.
 */
export interface EthClujTemplate extends Template {
  githubUrl: string;
}

export const ETHCLUJ_TEMPLATES: EthClujTemplate[] = [
  {
    id: 'ethcluj-1-vault',
    name: '1. Vault',
    description:
      'Build a token vault: users deposit an ERC-20 in exchange for proportional shares, then withdraw their share of the pool. Exercises external contract calls, error wrapping, and share accounting.',
    category: 'Workshop',
    difficulty: 'Beginner',
    features: [
      'ERC-20 deposits / withdrawals',
      'Proportional share accounting',
      'External contract calls (transferFrom / balanceOf)',
      'Typed error wrapping',
    ],
    githubUrl: 'https://github.com/stylus-developers-guild/ethcluj-2026/tree/trunk/stylus-challenges/1_Vault',
  },
  {
    id: 'ethcluj-2-email',
    name: '2. Email',
    description:
      'Implement an on-chain message inbox where addresses can send each other arbitrary byte payloads. Practice with storage maps, event emission, and read-only views.',
    category: 'Workshop',
    difficulty: 'Intermediate',
    features: [
      'Per-address message storage',
      'Event emission',
      'View functions',
      'Bytes payload handling',
    ],
    githubUrl: 'https://github.com/stylus-developers-guild/ethcluj-2026/tree/trunk/stylus-challenges/2_Email',
  },
  {
    id: 'ethcluj-3-lending',
    name: '3. Lending',
    description:
      'Mini lending market: deposit collateral, borrow against it, and track health factors. Combines vault mechanics with interest accrual and liquidation conditions.',
    category: 'Workshop',
    difficulty: 'Expert',
    features: [
      'Collateralized borrowing',
      'Interest accrual',
      'Health factor / liquidation',
      'Multi-asset accounting',
    ],
    githubUrl: 'https://github.com/stylus-developers-guild/ethcluj-2026/tree/trunk/stylus-challenges/3_Lending',
  },
];
