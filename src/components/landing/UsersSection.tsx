import { motion } from 'framer-motion';
import { 
  Rocket,
  GraduationCap,
  Lightbulb,
  Users,
  Timer,
  Wallet,
  Share2,
  BookOpen,
  Terminal,
  GitBranch,
  Code2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const USER_TYPES = [
  {
    id: 'hackathon',
    icon: Rocket,
    title: 'Hackathon Builders',
    description: 'Perfect for rapid prototyping and quick deployment during hackathons.',
    benefits: [
      {
        icon: Timer,
        title: 'Instant Setup',
        description: 'Start coding in seconds with pre-configured templates.',
      },
      {
        icon: Wallet,
        title: 'Pre-funded Testing',
        description: 'Built-in testnet wallet for seamless deployment.',
      },
      {
        icon: Share2,
        title: 'Team Collaboration',
        description: 'Real-time code sharing and collaborative features.',
      },
    ],
    color: 'from-blue-500/20 via-transparent to-transparent',
  },
  {
    id: 'newbies',
    icon: GraduationCap,
    title: 'Stylus Beginners',
    description: 'Start your Stylus journey with a guided, hassle-free experience.',
    benefits: [
      {
        icon: BookOpen,
        title: 'Interactive Learning',
        description: 'Step-by-step tutorials and guided examples.',
      },
      {
        icon: Terminal,
        title: 'Real-time Feedback',
        description: 'Instant compilation and error checking.',
      },
      {
        icon: Code2,
        title: 'Zero Setup',
        description: 'Everything you need in your browser.',
      },
    ],
    color: 'from-green-500/20 via-transparent to-transparent',
  },
  {
    id: 'developers',
    icon: Lightbulb,
    title: 'Professional Developers',
    description: 'Streamlined environment for efficient Stylus development.',
    benefits: [
      {
        icon: Rocket,
        title: 'Rapid Development',
        description: 'Professional-grade tools for fast iteration.',
      },
      {
        icon: Wallet,
        title: 'Efficient Testing',
        description: 'Integrated testing and deployment pipeline.',
      },
      {
        icon: GitBranch,
        title: 'Version Control',
        description: 'Seamless GitHub integration and exports.',
        comingSoon: true,
      },
    ],
    color: 'from-purple-500/20 via-transparent to-transparent',
  },
  {
    id: 'educators',
    icon: Users,
    title: 'Educators & Teams',
    description: 'Perfect for teaching, workshops, and team collaboration.',
    benefits: [
      {
        icon: Share2,
        title: 'Shareable Projects',
        description: 'Create and share educational content easily.',
      },
      {
        icon: Terminal,
        title: 'Live Demonstrations',
        description: 'Perfect for workshops and presentations.',
      },
      {
        icon: BookOpen,
        title: 'Learning Resources',
        description: 'Comprehensive tutorials and examples.',
      },
    ],
    color: 'from-pink-500/20 via-transparent to-transparent',
  },
];

export function UsersSection() {
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
          Who Can Use Wizard IDE?
        </h2>
        <p className="text-lg text-muted-foreground">
          A powerful development environment designed for everyone
        </p>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-2">
        {USER_TYPES.map((type, index) => (
          <motion.div
            key={type.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.02 }}
            className="group relative"
          >
            <motion.div 
              className={cn(
                "absolute inset-0 bg-gradient-to-br rounded-lg",
                type.color
              )}
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 0.2 }}
              transition={{ duration: 0.2 }}
            />
            
            <div className="relative border rounded-lg bg-background/50 backdrop-blur-sm">
              {/* Header */}
              <div className="p-6 border-b">
                <div className="flex items-center gap-4">
                  <div className="flex-none p-3 rounded-lg bg-primary/10">
                    <type.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-semibold">{type.title}</h3>
                      <Badge variant="outline" className={cn(
                        "bg-primary/10 text-primary",
                        type.id === 'hackathon' && "bg-blue-500/10 text-blue-500",
                        type.id === 'newbies' && "bg-green-500/10 text-green-500",
                        type.id === 'developers' && "bg-purple-500/10 text-purple-500",
                        type.id === 'educators' && "bg-pink-500/10 text-pink-500",
                      )}>
                        {type.id === 'hackathon' && 'Fast-paced'}
                        {type.id === 'newbies' && 'Beginner-friendly'}
                        {type.id === 'developers' && 'Professional'}
                        {type.id === 'educators' && 'Collaborative'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{type.description}</p>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  {type.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={cn(
                        "flex-none p-2 rounded-md",
                        type.id === 'hackathon' && "bg-blue-500/10",
                        type.id === 'newbies' && "bg-green-500/10",
                        type.id === 'developers' && "bg-purple-500/10",
                        type.id === 'educators' && "bg-pink-500/10",
                      )}>
                        <benefit.icon className={cn(
                          "h-4 w-4",
                          type.id === 'hackathon' && "text-blue-500",
                          type.id === 'newbies' && "text-green-500",
                          type.id === 'developers' && "text-purple-500",
                          type.id === 'educators' && "text-pink-500",
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium mb-0.5">{benefit.title}</div>
                          {benefit.comingSoon && (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 text-[10px]">
                              Coming Soon
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{benefit.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}