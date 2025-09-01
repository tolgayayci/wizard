import { ArrowRight, Github, Mail, FileText, FolderOpen, Code, Rocket, Wallet, MousePointer, Terminal, Zap, Globe, FolderTree, Layers, Server, Package } from 'lucide-react';

export function HowItWorks() {
  return (
    <section className="py-32 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-20">
          <p className="text-sm font-medium text-blue-600 uppercase tracking-wider mb-3">How it works</p>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            From idea to deployed contract in minutes
          </h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            Three simple steps. No installation. No configuration. Just results.
          </p>
        </div>

        {/* Step 1 */}
        <div className="mb-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="text-6xl font-bold text-gray-100">1</div>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <h3 className="text-3xl font-semibold text-gray-900 mb-4">
                Start Your Project
              </h3>
              <p className="text-lg text-gray-600 mb-8">
                Sign in with email or GitHub in one click. Choose your starting point.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">Start fresh</div>
                    <div className="text-gray-600">Create a new Stylus project from scratch</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Code className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">Use templates</div>
                    <div className="text-gray-600">Start with ERC-20, ERC-721, or custom templates</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Github className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">Import from GitHub</div>
                    <div className="text-gray-600">Bring your existing Stylus project</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative flex justify-center lg:justify-start">
              <div className="w-11/12 lg:w-10/12 rounded-lg overflow-hidden shadow-2xl">
                <img 
                  src="/images/landing-1.png" 
                  alt="Import from GitHub" 
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="mb-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="rounded-lg overflow-hidden shadow-2xl">
                <img 
                  src="/images/landing-2.png" 
                  alt="Deploy Contract" 
                  className="w-full h-auto"
                />
              </div>
            </div>
            
            <div className="order-1 lg:order-2">
              <div className="flex items-center gap-4 mb-6">
                <div className="text-6xl font-bold text-gray-100">2</div>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <h3 className="text-3xl font-semibold text-gray-900 mb-4">
                Build with Power
              </h3>
              <p className="text-lg text-gray-600 mb-8">
                Full-featured IDE in your browser. Edit, compile, and deploy with one click.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FolderOpen className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">File Explorer</div>
                    <div className="text-gray-600">Navigate and manage your project structure</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Rocket className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">One-Click Deploy</div>
                    <div className="text-gray-600">Deploy to any network instantly</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Wallet className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">Flexible Wallets</div>
                    <div className="text-gray-600">Use Wizard wallet or connect your own</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="mb-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="text-6xl font-bold text-gray-100">3</div>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <h3 className="text-3xl font-semibold text-gray-900 mb-4">
                Ship & Interact
              </h3>
              <p className="text-lg text-gray-600 mb-8">
                Your contract is live. Interact with it instantly, no ABI hassles.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MousePointer className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">Visual Interface</div>
                    <div className="text-gray-600">Click to call methods, see results instantly</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Zap className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">Live Events</div>
                    <div className="text-gray-600">Monitor contract events in real-time</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Terminal className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">Cargo Terminal</div>
                    <div className="text-gray-600">Run any cargo-stylus command directly</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="rounded-lg overflow-hidden shadow-2xl">
                <img 
                  src="/images/landing-3.png" 
                  alt="Contract Interface" 
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Core Features */}
        <div className="border-t border-gray-100 pt-20">
          <div className="text-center mb-16">
            <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Everything you need, built-in
            </h3>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Professional tools that work instantly, no setup required.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Globe className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Deploy Everywhere</h4>
              <p className="text-gray-600">
                Arbitrum One, Sepolia, Superposition testnet, mainnet, and custom Orbit chains
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FolderTree className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Professional File System</h4>
              <p className="text-gray-600">
                Navigate, create, and manage your<br />project structure with ease
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Terminal className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Full Stylus Terminal</h4>
              <p className="text-gray-600">
                Run cargo build, test, and any<br />Stylus command directly
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Layers className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Smart Contract UI</h4>
              <p className="text-gray-600">
                Auto-generated interface to interact<br />with your deployed contracts
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Server className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Always-On Infrastructure</h4>
              <p className="text-gray-600">
                Your code lives in the cloud,<br />accessible from anywhere
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Growing Template Library</h4>
              <p className="text-gray-600">
                ERC-20, ERC-721, DeFi protocols -<br />continuously updated
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-32 pt-20 border-t border-gray-100">
          <div className="text-center">
            <h3 className="text-2xl font-semibold text-gray-900 mb-8">
              Ready to build something amazing?
            </h3>
            <div className="flex items-center justify-center gap-4">
              <button 
                onClick={() => {
                  const trigger = document.querySelector<HTMLButtonElement>('[data-auth-trigger]');
                  if (trigger) trigger.click();
                }}
                className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-full font-medium hover:bg-gray-900 transition-colors group"
              >
                Get started
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <a 
                href="https://docs.arbitrum.io/stylus"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                View docs
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}