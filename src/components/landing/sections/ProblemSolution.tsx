import { ArrowRight, Wallet, FileCode, Gauge } from 'lucide-react';
import { useEffect, useRef } from 'react';

export function ProblemSolution() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = 600;
    };
    resize();
    window.addEventListener('resize', resize);
    
    // Create flowing lines animation
    const lines: Array<{
      x: number;
      y: number;
      length: number;
      speed: number;
      opacity: number;
      color: string;
    }> = [];
    
    // Initialize lines
    for (let i = 0; i < 15; i++) {
      lines.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        length: Math.random() * 100 + 50,
        speed: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.3 + 0.1,
        color: i % 2 === 0 ? '239, 68, 68' : '59, 130, 246' // red vs blue
      });
    }
    
    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      lines.forEach((line) => {
        // Update position
        line.x += line.speed;
        if (line.x > canvas.width + line.length) {
          line.x = -line.length;
          line.y = Math.random() * canvas.height;
        }
        
        // Draw line with gradient
        const gradient = ctx.createLinearGradient(
          line.x - line.length, line.y,
          line.x, line.y
        );
        gradient.addColorStop(0, `rgba(${line.color}, 0)`);
        gradient.addColorStop(0.5, `rgba(${line.color}, ${line.opacity})`);
        gradient.addColorStop(1, `rgba(${line.color}, 0)`);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(line.x - line.length, line.y);
        ctx.lineTo(line.x, line.y);
        ctx.stroke();
      });
      
      requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <section className="relative py-32 px-6 bg-white overflow-hidden">
      {/* Animated background */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 opacity-20 pointer-events-none"
      />
      
      {/* Top separator */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      <div className="relative z-10 max-w-7xl mx-auto">
        
        {/* Minimalist Header */}
        <div className="max-w-3xl mb-20">
          <h2 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
            The old way is broken.
          </h2>
          <p className="text-xl text-gray-500 font-light">
            Every developer has wasted hours on setup. We measured it.
          </p>
        </div>

        {/* Clean Comparison Grid with animations */}
        <div className="grid lg:grid-cols-2 gap-16 mb-32 transition-all duration-700 hover:gap-20">
          
          {/* Before */}
          <div>
            <div className="mb-8">
              <div className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Before</div>
              <h3 className="text-3xl font-semibold text-gray-900">Local Development</h3>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4 group hover:translate-x-2 transition-transform duration-300">
                <div className="text-2xl font-light text-gray-400 w-12">0m</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Excitement peaks</div>
                  <div className="text-gray-500">You have a brilliant idea for a smart contract</div>
                </div>
              </div>
              
              <div className="flex items-start gap-4 group hover:translate-x-2 transition-transform duration-300 delay-75">
                <div className="text-2xl font-light text-gray-400 w-12">20m</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Reality hits</div>
                  <div className="text-gray-500">Installing Rust, Docker, cargo-stylus...</div>
                </div>
              </div>
              
              <div className="flex items-start gap-4 group hover:translate-x-2 transition-transform duration-300 delay-100">
                <div className="text-2xl font-light text-gray-400 w-12">40m</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Debugging begins</div>
                  <div className="text-gray-500">Fixing paths, permissions, dependencies...</div>
                </div>
              </div>
              
              <div className="flex items-start gap-4 group hover:translate-x-2 transition-transform duration-300 delay-150">
                <div className="text-2xl font-light text-gray-400 w-12">60m</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Finally...</div>
                  <div className="text-gray-500">You can write your first line of actual code</div>
                </div>
              </div>
            </div>
            
            <div className="mt-12 p-6 bg-gray-50 rounded-2xl">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gray-900">60</span>
                <span className="text-gray-500">minutes wasted</span>
              </div>
              <div className="text-sm text-gray-400 mt-1">Every. Single. Time.</div>
            </div>
          </div>

          {/* After */}
          <div>
            <div className="mb-8">
              <div className="text-sm font-medium text-blue-600 uppercase tracking-wider mb-2">After</div>
              <h3 className="text-3xl font-semibold text-gray-900">Wizard</h3>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4 group hover:translate-x-2 transition-transform duration-300">
                <div className="text-2xl font-light text-blue-600 w-12 animate-pulse">0s</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Open browser</div>
                  <div className="text-gray-500">Visit thewizard.app</div>
                </div>
              </div>
              
              <div className="flex items-start gap-4 group hover:translate-x-2 transition-transform duration-300 delay-75">
                <div className="text-2xl font-light text-blue-600 w-12">10s</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Start coding</div>
                  <div className="text-gray-500">Full IDE ready, no downloads needed</div>
                </div>
              </div>
              
              <div className="flex items-start gap-4 group hover:translate-x-2 transition-transform duration-300 delay-100">
                <div className="text-2xl font-light text-blue-600 w-12">20s</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Compile & test</div>
                  <div className="text-gray-500">One-click compilation, instant feedback</div>
                </div>
              </div>
              
              <div className="flex items-start gap-4 group hover:translate-x-2 transition-transform duration-300 delay-150">
                <div className="text-2xl font-light text-blue-600 w-12">30s</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Deploy live</div>
                  <div className="text-gray-500">Your contract is on Arbitrum</div>
                </div>
              </div>
            </div>
            
            <div className="mt-12 p-6 bg-blue-50 rounded-2xl">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-blue-600">30</span>
                <span className="text-gray-600">seconds to production</span>
              </div>
              <div className="text-sm text-gray-500 mt-1">That's 120x faster.</div>
            </div>
          </div>
        </div>

        {/* Bonus Features - Things you don't have to handle */}
        <div className="mb-24">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">And that's not all</p>
            <h3 className="text-3xl font-semibold text-gray-900">
              We handle the painful parts you forgot about
            </h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 bg-gray-50 rounded-2xl hover:scale-105 transition-transform duration-300 cursor-default">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-4">
                <Wallet className="h-5 w-5 text-gray-900" />
              </div>
              <div className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                Instead of wallet setup
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Deploy to any chain instantly
              </h4>
              <p className="text-gray-500 text-sm">
                No wallet configuration. No private keys. No gas tokens. We handle it all so you can deploy anywhere.
              </p>
            </div>
            
            <div className="p-6 bg-gray-50 rounded-2xl hover:scale-105 transition-transform duration-300 cursor-default">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-4">
                <FileCode className="h-5 w-5 text-gray-900" />
              </div>
              <div className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                Instead of ABI management
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Interact with contracts in one click
              </h4>
              <p className="text-gray-500 text-sm">
                No ABI copy-pasting. No interface building. Just click and interact with your deployed contracts instantly.
              </p>
            </div>
            
            <div className="p-6 bg-gray-50 rounded-2xl hover:scale-105 transition-transform duration-300 cursor-default">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-4">
                <Gauge className="h-5 w-5 text-gray-900" />
              </div>
              <div className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                Instead of manual optimization
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Auto-optimize your WASM
              </h4>
              <p className="text-gray-500 text-sm">
                Built-in optimization tools. See size analysis. Get performance insights. Ship smaller, faster contracts.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="border-t border-gray-100 pt-16">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                Stop wasting time. Start shipping.
              </h3>
              <p className="text-gray-500">
                Join 5,000+ developers building on Arbitrum Stylus
              </p>
            </div>
            <button 
              onClick={() => {
                const trigger = document.querySelector<HTMLButtonElement>('[data-auth-trigger]');
                if (trigger) trigger.click();
              }}
              className="flex items-center gap-2 bg-black text-white px-8 py-4 rounded-full font-medium hover:bg-gray-900 transition-colors group"
            >
              Try Wizard now
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Bottom separator */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
    </section>
  );
}