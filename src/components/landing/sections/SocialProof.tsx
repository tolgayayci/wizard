import { Star, Users, Code, Clock } from 'lucide-react';

const testimonials = [
  {
    quote: "Wizard transformed our development workflow. What used to take days now takes hours.",
    author: "Sarah Chen",
    role: "Lead Developer, DeFi Protocol",
    avatar: "SC"
  },
  {
    quote: "Finally, a Stylus IDE that just works. No Docker headaches, no environment issues.",
    author: "Marcus Rodriguez",
    role: "Smart Contract Engineer",
    avatar: "MR"
  },
  {
    quote: "The GitHub integration and deployment history are game-changers for our team.",
    author: "Alex Thompson",
    role: "CTO, Web3 Startup",
    avatar: "AT"
  }
];

const stats = [
  {
    icon: Users,
    value: '5,000+',
    label: 'Active Developers'
  },
  {
    icon: Code,
    value: '10,000+',
    label: 'Contracts Deployed'
  },
  {
    icon: Clock,
    value: '< 3s',
    label: 'Avg Compile Time'
  },
  {
    icon: Star,
    value: '99.9%',
    label: 'Uptime'
  }
];

export function SocialProof() {
  return (
    <section id="social-proof" className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Trusted by Thousands of Developers
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Join the growing community building on Arbitrum Stylus
          </p>
        </div>

        {/* Testimonials */}
        <div className="grid lg:grid-cols-3 gap-6 mb-16">
          {testimonials.map((testimonial, i) => (
            <div 
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                "{testimonial.quote}"
              </p>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    {testimonial.author}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="inline-flex w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 items-center justify-center mb-3">
                <stat.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stat.value}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}