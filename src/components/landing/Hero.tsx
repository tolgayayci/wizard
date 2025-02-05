import { motion } from 'framer-motion';
import { ExternalLink, Users, Play, Wand2, RocketIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SignInDialog } from '@/components/landing/SignInDialog';
import { cn } from '@/lib/utils';

const DEVELOPERS = [
  {
    image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?&w=64&h=64&q=70&crop=faces&fit=crop",
    name: "Sarah C.",
    color: "bg-blue-500",
  },
  {
    image: "https://images.unsplash.com/photo-1463453091185-61582044d556?&w=64&h=64&q=70&crop=faces&fit=crop",
    name: "Alex R.",
    color: "bg-green-500",
  },
  {
    image: "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?&w=64&h=64&q=70&crop=faces&fit=crop",
    name: "Mike L.",
    color: "bg-purple-500",
  },
  {
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?&w=64&h=64&q=70&crop=faces&fit=crop",
    name: "Emily J.",
    color: "bg-pink-500",
  },
];

export function Hero() {
  const handleLaunchClick = () => {
    const trigger = document.querySelector<HTMLButtonElement>('[data-signin-trigger]');
    if (trigger) {
      trigger.click();
    }
  };

  return (
    <section className="relative overflow-hidden border-b bg-background">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      <div className="container mx-auto py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border text-sm">
              <Badge variant="outline" className="bg-primary/10 text-primary">
                Beta
              </Badge>
              <span className={cn(
                "text-primary font-bold tracking-tight",
                "bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent"
              )}>
                WIZARD
              </span>
              <Wand2 className="h-4 w-4 text-primary" />
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                Stylus Development
                <span className="block mt-2 bg-gradient-to-r from-primary to-blue-500 text-transparent bg-clip-text">
                  Meets Simplicity
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-xl">
                Write, test, and deploy Rust contracts directly in your browser.
                <span className="block mt-2">No setup required.</span>
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Button 
                size="lg" 
                className="group relative overflow-hidden h-12 px-8"
                onClick={handleLaunchClick}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500 opacity-90 transition-opacity group-hover:opacity-100" />
                <span className="relative flex items-center gap-2 text-white">
                  <RocketIcon className="h-5 w-5 transition-transform group-hover:-translate-y-1" />
                  Launch App
                </span>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="h-12 px-6 gap-2"
                asChild
              >
                <a 
                  href="https://docs.thewizard.app"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Read Docs</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>

            <SignInDialog />

            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {DEVELOPERS.map((dev, i) => (
                  <div
                    key={i}
                    className="relative"
                    style={{ zIndex: DEVELOPERS.length - i }}
                  >
                    <div className={`absolute inset-0 ${dev.color} blur-sm rounded-full opacity-25 scale-110`} />
                    <Avatar className="relative border-2 border-background w-8 h-8">
                      <AvatarImage src={dev.image} alt={dev.name} />
                      <AvatarFallback>{dev.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                  </div>
                ))}
                <div className="relative">
                  <div className="absolute inset-0 bg-primary blur-sm rounded-full opacity-25 scale-110" />
                  <div className="relative w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border-2 border-background">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Join</span>{' '}
                <span className="font-medium">50+ developers</span>{' '}
                <span className="text-muted-foreground">building with Wizard</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent opacity-20 rounded-lg blur-xl" />
            <div className="relative bg-muted rounded-lg border shadow-2xl overflow-hidden">
              {/* App Preview Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b bg-background/50">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                    Live Preview
                  </Badge>
                </div>
              </div>

              {/* App Preview Content - Replace this with your app screenshot */}
              <div className="aspect-[16/10] bg-muted/20">
                {/* This is where you'll add your app screenshot */}
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Play className="h-10 w-10 mx-auto mb-4 text-primary/40" />
                    <p className="text-sm">App Preview</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}