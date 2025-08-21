import { Github, Twitter, BookOpen } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Left: Brand and Links */}
          <div className="flex items-center gap-8">
            <div className="text-sm text-gray-500">
              Wizard © 2025
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a 
                href="https://docs.arbitrum.io/stylus" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                Docs
              </a>
              <a 
                href="https://github.com/tolgayayci/wizard" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
              <a 
                href="https://x.com/WizardOnStylus" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Twitter className="h-4 w-4" />
                Twitter
              </a>
            </div>
          </div>

          {/* Right: Made with love */}
          <div className="text-sm text-gray-500">
            Built for developers, by developers
          </div>
        </div>

        {/* Mobile Links */}
        <div className="flex md:hidden items-center gap-6 mt-6 pt-6 border-t border-gray-100">
          <a 
            href="https://docs.arbitrum.io/stylus" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            Docs
          </a>
          <a 
            href="https://github.com/tolgayayci/wizard" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
          <a 
            href="https://x.com/WizardOnStylus" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Twitter className="h-4 w-4" />
            Twitter
          </a>
        </div>
      </div>
    </footer>
  );
}