import { Package, Download, CheckCircle, History, Link, Wallet, Wand2, FileCode } from 'lucide-react';

const features = [
  {
    icon: Package,
    title: 'Crates.io Integration',
    description: 'Search and install Rust dependencies directly'
  },
  {
    icon: Download,
    title: 'Download WASM & ABI',
    description: 'Export compiled binaries for external use'
  },
  {
    icon: CheckCircle,
    title: 'Auto Verification',
    description: 'Automatic Arbiscan contract verification'
  },
  {
    icon: History,
    title: 'Deployment History',
    description: 'Track all your deployments across chains'
  },
  {
    icon: Link,
    title: 'Custom RPC',
    description: 'Connect to any Arbitrum Orbit chain'
  },
  {
    icon: Wallet,
    title: 'Wallet Integration',
    description: 'Deploy with MetaMask or WalletConnect'
  },
  {
    icon: Wand2,
    title: 'Auto-formatting',
    description: 'Built-in rustfmt and Clippy linting'
  },
  {
    icon: FileCode,
    title: 'Contract Templates',
    description: 'Start with NFT, DeFi, and DAO templates'
  }
];

export function PowerFeatures() {
  return (
    <section className="py-20 px-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Power Features for Pro Developers
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Advanced tools that make complex tasks simple
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, i) => (
            <div 
              key={i}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}