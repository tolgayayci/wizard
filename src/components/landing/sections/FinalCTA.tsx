import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen } from 'lucide-react';

export function FinalCTA() {
  const handleAuthClick = () => {
    const trigger = document.querySelector<HTMLButtonElement>('[data-auth-trigger]');
    if (trigger) trigger.click();
  };

  return (
    <section className="py-20 px-6 bg-gradient-to-br from-blue-600 to-blue-700">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
          Start Building in 30 Seconds
        </h2>
        
        <p className="text-xl text-blue-100 mb-8">
          No downloads. No configuration. Just code.
        </p>

        <div className="flex flex-wrap gap-4 justify-center mb-8">
          <Button 
            size="lg"
            onClick={handleAuthClick}
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 h-12"
          >
            Launch Wizard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          
          <Button 
            size="lg"
            variant="outline"
            onClick={() => window.open('https://docs.arbitrum.io/stylus', '_blank')}
            className="border-white text-white hover:bg-white/10 h-12 px-8"
          >
            <BookOpen className="mr-2 h-4 w-4" />
            View Documentation
          </Button>
        </div>

        <div className="flex flex-wrap justify-center gap-8 text-sm text-blue-100">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Free forever</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>No credit card</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Deploy to mainnet</span>
          </div>
        </div>
      </div>
    </section>
  );
}