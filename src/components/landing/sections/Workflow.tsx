import { FileCode, Zap, Rocket } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: FileCode,
    title: 'Write',
    description: 'Code in a professional Monaco editor with full Rust and Stylus SDK support'
  },
  {
    number: '02',
    icon: Zap,
    title: 'Test',
    description: 'Compile instantly and interact with your contracts through the ABI interface'
  },
  {
    number: '03',
    icon: Rocket,
    title: 'Ship',
    description: 'Deploy to any Arbitrum network with one click and automatic verification'
  }
];

export function Workflow() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            From idea to deployed contract in three simple steps
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              {/* Connection line (hidden on mobile) */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-blue-600 to-transparent" />
              )}
              
              <div className="relative">
                {/* Step number */}
                <div className="text-6xl font-bold text-gray-100 dark:text-gray-800 mb-4">
                  {step.number}
                </div>
                
                {/* Icon */}
                <div className="absolute top-0 left-0 w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center">
                  <step.icon className="h-6 w-6 text-white" />
                </div>
                
                {/* Content */}
                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}