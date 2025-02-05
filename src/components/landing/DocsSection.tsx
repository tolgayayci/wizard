import { motion } from 'framer-motion';
import { 
  BookOpen, 
  FileText, 
  MessageSquare, 
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const RESOURCES = [
  {
    icon: BookOpen,
    title: "Getting Started",
    description: "Writing Your First Stylus Contract in Rust on Wizard",
    href: "https://docs.thewizard.app",
    color: "from-blue-500/20 via-transparent to-transparent",
    badge: "Beginner",
    badgeColor: "bg-green-500/10 text-green-500",
  },
  {
    icon: FileText,
    title: "Official Documentation",
    description: "Arbitrum Stylus Documentation & Reference",
    href: "https://docs.arbitrum.io/stylus",
    color: "from-purple-500/20 via-transparent to-transparent",
    badge: "Official",
    badgeColor: "bg-blue-500/10 text-blue-500",
  },
  {
    icon: MessageSquare,
    title: "Community Support",
    description: "Join the Stylus Developer Telegram Channel",
    href: "https://t.me/arbitrum_stylus",
    color: "from-pink-500/20 via-transparent to-transparent",
    badge: "Active",
    badgeColor: "bg-yellow-500/10 text-yellow-500",
  },
];

export function DocsSection() {
  return (
    <section className="container mx-auto py-24 lg:py-32">
      <motion.div 
        className="text-center max-w-2xl mx-auto mb-16"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
      >
        <h2 className="text-3xl font-bold tracking-tight mb-4">
          Documentation & Community
        </h2>
        <p className="text-lg text-muted-foreground">
          Everything you need to get started with Stylus development
        </p>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-3">
        {RESOURCES.map((resource, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.05 }}
            className="group relative"
          >
            <motion.div 
              className={cn(
                "absolute inset-0 bg-gradient-to-br rounded-lg",
                resource.color
              )}
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 0.2 }}
              transition={{ duration: 0.2 }}
            />
            
            <a 
              href={resource.href}
              target="_blank"
              rel="noopener noreferrer" 
              className="relative block border rounded-lg bg-background/50 backdrop-blur-sm p-6 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <resource.icon className="h-6 w-6 text-primary" />
                </div>
                <Badge variant="outline" className={cn(resource.badgeColor)}>
                  {resource.badge}
                </Badge>
              </div>

              <h3 className="text-xl font-semibold mb-2">{resource.title}</h3>
              <p className="text-muted-foreground mb-4">{resource.description}</p>

              <div className="flex items-center gap-2 text-sm text-primary">
                <span>Learn more</span>
                <ExternalLink className="h-4 w-4" />
              </div>
            </a>
          </motion.div>
        ))}
      </div>
    </section>
  );
}