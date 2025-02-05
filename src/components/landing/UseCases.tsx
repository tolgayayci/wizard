import { motion } from 'framer-motion';
import { ArrowRight, Terminal, Box, Braces } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const USE_CASES = [
  {
    icon: Terminal,
    title: 'Interactive Contract Testing',
    description: 'Test your smart contracts directly in the browser using our WebAssembly runtime environment. No need for external tools or complex setups.',
    features: [
      'Real-time contract execution',
      'Method parameter validation',
      'Transaction simulation',
      'Gas estimation',
    ],
    cta: 'Try Demo',
    color: 'from-blue-500/20 via-transparent to-transparent',
  },
  {
    icon: Box,
    title: 'WASM Contract Analysis',
    description: "Analyze your compiled WebAssembly output to optimize contract size and performance. Understand your contract's resource usage.",
    features: [
      'Binary size analysis',
      'Memory usage tracking',
      'Import/export inspection',
      'Function signatures',
    ],
    cta: 'View Example',
    color: 'from-purple-500/20 via-transparent to-transparent',
  },
  {
    icon: Braces,
    title: 'ABI Integration',
    description: 'Seamlessly interact with deployed contracts using our ABI explorer. Generate TypeScript bindings for type-safe contract interactions.',
    features: [
      'Visual ABI explorer',
      'Type-safe interactions',
      'Method documentation',
      'Event monitoring',
    ],
    cta: 'Learn More',
    color: 'from-green-500/20 via-transparent to-transparent',
  },
];

interface UseCasesProps {
  className?: string;
}

export function UseCases({ className }: UseCasesProps) {
  return (
    <div className={cn("grid gap-8 lg:grid-cols-3", className)}>
      {USE_CASES.map((useCase, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.2 }}
          viewport={{ once: true }}
          className="group relative overflow-hidden rounded-xl border bg-background p-8"
        >
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity",
            useCase.color
          )} />
          
          <div className="relative space-y-4">
            <div className="inline-flex p-3 rounded-lg bg-primary/10">
              <useCase.icon className="h-6 w-6 text-primary" />
            </div>

            <h3 className="text-xl font-semibold">{useCase.title}</h3>
            
            <p className="text-muted-foreground">
              {useCase.description}
            </p>

            <ul className="space-y-3 py-4">
              {useCase.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              {useCase.cta}
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}