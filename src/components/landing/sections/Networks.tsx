import { ArrowUpRight } from 'lucide-react';

const networks = [
  {
    name: 'Arbitrum One',
    type: 'Mainnet',
    logo: (
      <svg viewBox="0 0 32 32" className="w-12 h-12">
        <rect width="32" height="32" rx="8" fill="#213147"/>
        <path d="M16 8L10 16L16 24L22 16L16 8Z" fill="#12AAFF"/>
        <path d="M16 11L13 16L16 21L19 16L16 11Z" fill="white"/>
      </svg>
    )
  },
  {
    name: 'Arbitrum Sepolia',
    type: 'Testnet',
    logo: (
      <svg viewBox="0 0 32 32" className="w-12 h-12">
        <rect width="32" height="32" rx="8" fill="#213147"/>
        <path d="M16 8L10 16L16 24L22 16L16 8Z" fill="#9DCCED"/>
        <path d="M16 11L13 16L16 21L19 16L16 11Z" fill="white"/>
      </svg>
    )
  },
  {
    name: 'Arbitrum Nova',
    type: 'Mainnet',
    logo: (
      <svg viewBox="0 0 32 32" className="w-12 h-12">
        <rect width="32" height="32" rx="8" fill="#E84142"/>
        <path d="M16 8L10 16L16 24L22 16L16 8Z" fill="#FFA500"/>
        <path d="M16 11L13 16L16 21L19 16L16 11Z" fill="white"/>
      </svg>
    )
  },
  {
    name: 'Custom Orbit',
    type: 'Your Chain',
    logo: (
      <svg viewBox="0 0 32 32" className="w-12 h-12">
        <rect width="32" height="32" rx="8" fill="#4B5563"/>
        <circle cx="16" cy="16" r="8" stroke="#9CA3AF" strokeWidth="2" fill="none"/>
        <circle cx="16" cy="16" r="3" fill="#9CA3AF"/>
      </svg>
    )
  }
];

export function Networks() {
  return (
    <section id="networks" className="py-20 px-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Deploy Anywhere on Arbitrum
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            One-click deployment to any Arbitrum network
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {networks.map((network, i) => (
            <div 
              key={i}
              className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="flex justify-center mb-4">
                {network.logo}
              </div>
              
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {network.name}
              </h3>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {network.type}
              </p>
              
              <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-sm font-medium">Deploy here</span>
                <ArrowUpRight className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Plus support for any custom RPC endpoint
          </p>
        </div>
      </div>
    </section>
  );
}