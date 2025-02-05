import { motion, useScroll, useTransform } from 'framer-motion';
import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { UsersSection } from '@/components/landing/UsersSection';
import { FAQ } from '@/components/landing/FAQ';
import { DocsSection } from '@/components/landing/DocsSection';
import { Footer } from '@/components/landing/Footer';
import { SEO } from '@/components/seo/SEO';

export function LandingPage() {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  return (
    <div className="min-h-screen bg-background">
      <SEO />
      <Header />
      
      {/* Animated Divider */}
      <motion.div 
        className="h-px w-full bg-border relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0"
          animate={{ 
            x: ['0%', '100%'],
            opacity: [0, 1, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </motion.div>

      <main>
        <motion.div style={{ opacity, scale }}>
          <Hero />
        </motion.div>

        {/* Animated Background Pattern */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="fixed inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"
        />
        
        <Features />
        
        {/* Section Divider with Animation */}
        <motion.div 
          className="relative"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center">
            <div className="bg-background px-3">
              <motion.div 
                className="h-4 w-4 rounded-full border bg-muted"
                animate={{ 
                  scale: [1, 1.2, 1],
                  borderColor: ['hsl(var(--border))', 'hsl(var(--primary))', 'hsl(var(--border))']
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
          </div>
        </motion.div>

        <UsersSection />

        {/* Section Divider with Animation */}
        <motion.div 
          className="relative"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center">
            <div className="bg-background px-3">
              <motion.div 
                className="h-4 w-4 rounded-full border bg-muted"
                animate={{ 
                  scale: [1, 1.2, 1],
                  borderColor: ['hsl(var(--border))', 'hsl(var(--primary))', 'hsl(var(--border))']
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
          </div>
        </motion.div>

        <FAQ />

        {/* Section Divider with Animation */}
        <motion.div 
          className="relative"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center">
            <div className="bg-background px-3">
              <motion.div 
                className="h-4 w-4 rounded-full border bg-muted"
                animate={{ 
                  scale: [1, 1.2, 1],
                  borderColor: ['hsl(var(--border))', 'hsl(var(--primary))', 'hsl(var(--border))']
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
          </div>
        </motion.div>

        <DocsSection />
      </main>
      <Footer />
    </div>
  );
}