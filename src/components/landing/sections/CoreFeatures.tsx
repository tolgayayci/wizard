import { Github, FolderTree, Terminal, Rocket, Activity, Gauge } from 'lucide-react';

const features = [
  {
    icon: Github,
    title: 'GitHub Integration',
    description: 'Clone, save, and collaborate on projects directly from GitHub'
  },
  {
    icon: FolderTree,
    title: 'Live File Explorer',
    description: 'Navigate and manage projects like a real IDE'
  },
  {
    icon: Terminal,
    title: 'Integrated Terminal',
    description: 'Run cargo commands directly in your browser'
  },
  {
    icon: Rocket,
    title: 'One-Click Deploy',
    description: 'Ship to Arbitrum One, Sepolia, or custom chains instantly'
  },
  {
    icon: Activity,
    title: 'Real-time Events',
    description: 'See contract events as they happen on-chain'
  },
  {
    icon: Gauge,
    title: 'WASM Optimization',
    description: 'Analyze and optimize your contract size automatically'
  }
];

export function CoreFeatures() {
  return (
    <section id="features" className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything You Need to Build
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Professional tools that actually work, right in your browser
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div 
              key={i}
              className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}