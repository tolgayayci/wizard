import { Code, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function TryOnWizard() {
  const [copied, setCopied] = useState(false);
  
  const embedCode = `<a href="https://wizard.thewizard.app/try/your-contract" target="_blank">
  <button style="background: #3B82F6; color: white; padding: 8px 16px; 
    border-radius: 6px; border: none; cursor: pointer; font-weight: 500;">
    ✨ Try on Wizard
  </button>
</a>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Let Users Try Your Contracts
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Add a "Try on Wizard" button to your docs or GitHub repo
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left: Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              How it looks on your site:
            </p>
            
            <div className="flex justify-center">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors">
                ✨ Try on Wizard
              </button>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-4">
              Clicking opens your contract in Wizard IDE
            </p>
          </div>

          {/* Right: Code */}
          <div>
            <div className="bg-gray-900 rounded-xl p-4 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-400">Embed Code</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopy}
                  className="text-gray-400 hover:text-white"
                >
                  {copied ? 'Copied!' : 'Copy'}
                  <Copy className="ml-1 h-3 w-3" />
                </Button>
              </div>
              
              <pre className="text-xs text-gray-300 overflow-x-auto">
                <code>{embedCode}</code>
              </pre>
            </div>
            
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ✓ One-click contract exploration
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ✓ No setup required for users
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ✓ Automatic GitHub import
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}