import { useEffect, useState } from 'react';
import { Wand2, Github, ExternalLink, RocketIcon } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SignInDialog } from './SignInDialog';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLaunchClick = () => {
    const trigger = document.querySelector<HTMLButtonElement>('[data-signin-trigger]');
    if (trigger) {
      trigger.click();
    }
  };

  const handleSectionClick = (sectionId: string) => {
    const section = document.querySelector(`#${sectionId}`);
    if (section) {
      const headerOffset = 80; // Height of the fixed header
      const elementPosition = section.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <header className={cn(
      "sticky top-0 z-40 w-full transition-all duration-200",
      isScrolled ? "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" : "bg-background"
    )}>
      <div className="container mx-auto h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Wand2 className="h-6 w-6" />
            <span className={cn(
              "text-lg font-bold tracking-tight",
              "bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent",
              "hover:from-blue-500 hover:to-primary transition-all duration-300"
            )}>
              WIZARD
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => handleSectionClick('features')}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </button>
            <button 
              onClick={() => handleSectionClick('faq')}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              FAQ
            </button>
            <a 
              href="https://docs.thewizard.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              Documentation
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a 
              href="https://github.com/tolgayayci/wizard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              GitHub
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            className="group relative overflow-hidden h-10 px-6"
            onClick={handleLaunchClick}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500 opacity-90 transition-opacity group-hover:opacity-100" />
            <span className="relative flex items-center gap-2 text-white">
              <RocketIcon className="h-4 w-4 transition-transform group-hover:-translate-y-1" />
              Launch App
            </span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
      
      {/* Hidden SignInDialog component */}
      <SignInDialog />
    </header>
  );
}