import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { SEO } from "@/components/seo/SEO";

// Section components
import { Hero } from "@/components/landing/sections/Hero";
import { ProblemSolution } from "@/components/landing/sections/ProblemSolution";
import { HowItWorks } from "@/components/landing/sections/HowItWorks";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white" data-theme="light">
      <SEO />
      
      <Header />

      <main>
        <Hero />
        <ProblemSolution />
        <HowItWorks />
      </main>

      <Footer />
    </div>
  );
}