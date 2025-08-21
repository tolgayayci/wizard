import { useEffect, useState } from 'react';
import { Wand2, ArrowRight, Menu, X, BookOpen, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthModal } from '@/components/auth/AuthModal';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLaunchClick = () => {
    const trigger = document.querySelector<HTMLButtonElement>('[data-auth-trigger]');
    if (trigger) {
      trigger.click();
    }
  };

  const handleSectionClick = (sectionId: string) => {
    const section = document.querySelector(`#${sectionId}`);
    if (section) {
      const headerOffset = 80;
      const elementPosition = section.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setIsMobileMenuOpen(false);
    }
  };

  const navItems = [
    { label: 'Features', id: 'features' },
    { label: 'Networks', id: 'networks' },
    { label: 'Developers', id: 'social-proof' },
  ];

  return (
    <>
      <header 
        className={`fixed top-0 z-50 w-full transition-all duration-500 ${
          isScrolled 
            ? 'bg-white/95 backdrop-blur-md shadow-sm py-2' 
            : 'bg-transparent py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div 
              className="flex items-center gap-3 cursor-pointer group" 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <div className={`p-2.5 rounded-xl transition-all ${
                isScrolled ? 'bg-blue-50' : 'bg-white/10 backdrop-blur-sm'
              }`}>
                <Wand2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <span className="text-2xl font-bold text-gray-900">Wizard</span>
                <span className="hidden sm:inline text-sm text-gray-500 ml-2">for Arbitrum Stylus</span>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSectionClick(item.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    isScrolled 
                      ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-50' 
                      : 'text-gray-700 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              
              <div className="w-px h-6 bg-gray-300 mx-2" />
              
              <a 
                href="https://docs.arbitrum.io/stylus"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  isScrolled 
                    ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-50' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Docs
              </a>
              
              <a 
                href="https://github.com/tolgayayci/wizard"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  isScrolled 
                    ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-50' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
            </nav>
            
            {/* CTA Buttons */}
            <div className="flex items-center gap-3">
              {/* Desktop CTA */}
              <div className="hidden sm:block">
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 transition-all"
                  onClick={handleLaunchClick}
                >
                  Launch IDE
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {/* Mobile Menu Button */}
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5 text-gray-700" />
                ) : (
                  <Menu className="h-5 w-5 text-gray-700" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${
        isMobileMenuOpen ? 'visible' : 'invisible'
      }`}>
        {/* Backdrop */}
        <div 
          className={`absolute inset-0 bg-black transition-opacity duration-300 ${
            isMobileMenuOpen ? 'opacity-50' : 'opacity-0'
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        
        {/* Menu Panel */}
        <div className={`absolute right-0 top-0 h-full w-72 bg-white shadow-xl transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          <div className="p-6">
            {/* Close button */}
            <div className="flex justify-end mb-8">
              <button
                className="p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-5 w-5 text-gray-700" />
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSectionClick(item.id)}
                  className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg font-medium"
                >
                  {item.label}
                </button>
              ))}
              
              <div className="my-4 border-t border-gray-200" />
              
              <a 
                href="https://docs.arbitrum.io/stylus"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg font-medium"
              >
                <BookOpen className="h-4 w-4" />
                Documentation
              </a>
              
              <a 
                href="https://github.com/tolgayayci/wizard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg font-medium"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>

              <div className="mt-6">
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    handleLaunchClick();
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Launch IDE
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </nav>
          </div>
        </div>
      </div>
      
      {/* Auth Modal */}
      <AuthModal>
        <Button 
          className="hidden"
          data-auth-trigger
        >
          Hidden Trigger
        </Button>
      </AuthModal>
    </>
  );
}