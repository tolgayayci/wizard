import { Button } from '@/components/ui/button';
import { Play, ExternalLink } from 'lucide-react';

export function LiveDemo() {
  return (
    <section id="demo" className="py-20 px-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            See It In Action
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            This is the actual IDE. Try compiling and deploying a contract now.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xl">
          {/* Demo Header */}
          <div className="bg-gray-100 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  wizard.thewizard.app — Live Demo
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open('/tryonwizard/demo', '_blank')}
                className="text-xs"
              >
                Open in new tab
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Demo Content */}
          <div className="relative h-[600px] bg-gray-900">
            {/* Placeholder for iframe or screenshot */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6">
                <Play className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-4">
                Interactive Demo
              </h3>
              
              <p className="text-gray-400 mb-6 max-w-md">
                Try the full Wizard IDE with a pre-loaded counter contract. 
                Compile, deploy, and interact with it on testnet.
              </p>

              <Button
                onClick={() => window.open('/tryonwizard/demo', '_blank')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Launch Demo
                <Play className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Feature callouts */}
            <div className="absolute bottom-4 left-4 bg-green-500/10 backdrop-blur-sm border border-green-500/20 rounded-lg px-3 py-2">
              <p className="text-xs text-green-400">✓ No signup required</p>
            </div>
            
            <div className="absolute bottom-4 right-4 bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-lg px-3 py-2">
              <p className="text-xs text-blue-400">✓ Real compilation</p>
            </div>
          </div>
        </div>

        {/* Demo Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              &lt; 3 seconds
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Compilation time
            </p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              100% Browser
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No backend required
            </p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Real Testnet
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Deploy to Arbitrum Sepolia
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}