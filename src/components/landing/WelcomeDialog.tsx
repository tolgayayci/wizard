import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { 
  Wand2, 
  Code2, 
  Rocket,
  ArrowRight,
  Terminal,
  PlayCircle,
  FileCode2,
  GitBranch,
  Sparkles,
  Share2,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const WELCOME_STEPS = [
  {
    Icon: Sparkles,
    title: "Welcome to Wizard!",
    description: "Your all-in-one platform for building, testing, and deploying Stylus smart contracts. Let's get you started with a quick tour.",
    features: [
      "Zero setup required - everything runs in your browser",
      "Pre-configured development environment",
      "Real-time compilation and testing",
      "One-click deployment to Arbitrum",
    ],
  },
  {
    Icon: FileCode2,
    title: "Your First Projects",
    description: "We've created two starter projects to help you get familiar with Stylus development:",
    features: [
      "Hello World - A simple contract to understand the basics",
      "Counter - Learn state management and interactions",
      "Both projects are ready to compile and deploy",
      "Use them as templates for your own contracts",
    ],
  },
  {
    Icon: Terminal,
    title: "Smart Contract Development",
    description: "Write and compile your Stylus contracts with our powerful editor:",
    features: [
      "Syntax highlighting and auto-completion",
      "Real-time error checking",
      "Built-in Rust compiler",
      "Automatic ABI generation",
    ],
  },
  {
    Icon: PlayCircle,
    title: "Contract Testing",
    description: "Test your contracts directly in the browser:",
    features: [
      "Interactive method execution",
      "Real-time transaction feedback",
      "View contract state changes",
      "Monitor gas usage and costs",
    ],
  },
  {
    Icon: Rocket,
    title: "One-Click Deployment",
    description: "Deploy your contracts to Arbitrum Sepolia testnet:",
    features: [
      "No wallet setup required",
      "Automated deployment process",
      "Built-in transaction monitoring",
      "Instant contract verification",
    ],
  },
  {
    Icon: Share2,
    title: "Share & Collaborate",
    description: "Work with others on your smart contracts:",
    features: [
      "Share projects with read-only links",
      "Collaborate with team members",
      "Track project history",
      "Monitor contract interactions",
    ],
  },
];

interface WelcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WelcomeDialog({ open, onOpenChange }: WelcomeDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < WELCOME_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onOpenChange(false);
      setCurrentStep(0);
    }
  };

  const CurrentIcon = WELCOME_STEPS[currentStep].Icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wand2 className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-2xl">Welcome to Wizard!</DialogTitle>
          </div>
          <DialogDescription className="text-center">
            Let's get you started with Stylus development
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex-1 min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col"
            >
              <div className="text-center mb-8">
                <div className="inline-flex p-4 bg-primary/10 rounded-full mb-6">
                  <CurrentIcon className="h-8 w-8 text-primary" />
                </div>
                
                <h3 className="text-xl font-semibold mb-3">
                  {WELCOME_STEPS[currentStep].title}
                </h3>
                
                <p className="text-muted-foreground mb-8">
                  {WELCOME_STEPS[currentStep].description}
                </p>

                <div className="grid gap-3 max-w-lg mx-auto">
                  {WELCOME_STEPS[currentStep].features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.1 }}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-lg text-sm text-left",
                        "border bg-card hover:bg-accent transition-colors",
                        "hover:border-primary/50"
                      )}
                    >
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      </div>
                      <span className="flex-1">{feature}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 justify-center mt-auto">
                {WELCOME_STEPS.map((_, index) => (
                  <motion.div
                    key={index}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      index === currentStep 
                        ? "w-6 bg-primary" 
                        : "w-1.5 bg-muted"
                    )}
                    whileHover={{ scale: 1.1 }}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleNext} className="gap-2">
            {currentStep < WELCOME_STEPS.length - 1 ? (
              <>
                Next
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              'Get Started'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}