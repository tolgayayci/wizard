import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, Wand2, Rocket, Code2, Coins, Blocks } from 'lucide-react';

const FAQ_ITEMS = [
  {
    question: "What is Stylus?",
    answer: "Stylus is Arbitrum's innovative smart contract platform that allows developers to write smart contracts in Rust. It combines the security of Ethereum with the performance benefits of WebAssembly (WASM), enabling high-performance and cost-effective smart contracts.",
    icon: Blocks,
  },
  {
    question: "What is Wizard IDE?",
    answer: "Wizard is a browser-based development environment specifically designed for Arbitrum Stylus. It provides a seamless experience for writing, testing, and deploying Rust smart contracts with features like real-time compilation, built-in ABI explorer, and one-click deployment to Arbitrum Sepolia - all without needing a wallet or managing gas fees.",
    icon: Wand2,
  },
  {
    question: "Do I need a wallet or test ETH?",
    answer: "No! Wizard handles all transaction costs through a pre-funded wallet system. You don't need to set up a wallet, request test ETH, or manage gas fees. Simply write your code and deploy - we handle all the blockchain interactions for you.",
    icon: Rocket,
  },
  {
    question: "What programming language does Stylus use?",
    answer: "Stylus uses Rust as its primary programming language. Rust is chosen for its performance, safety features, and strong type system. The code is then compiled to WebAssembly for deployment on Arbitrum.",
    icon: Code2,
  },
  {
    question: "How much does it cost to use Wizard?",
    answer: "Wizard is completely free to use! All development costs including compilation, deployment, and contract interactions on Arbitrum Sepolia testnet are covered by our platform. You can develop and test your contracts without worrying about gas fees or wallet management.",
    icon: Coins,
  },
];

export function FAQ() {
  return (
    <section id="faq" className="container mx-auto py-24 lg:py-32">
      <motion.div 
        className="text-center max-w-2xl mx-auto mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>
        <p className="text-lg text-muted-foreground">
          Everything you need to know about Stylus development with Wizard
        </p>
      </motion.div>

      <div className="max-w-3xl mx-auto">
        <Accordion type="single" collapsible className="w-full">
          {FAQ_ITEMS.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <AccordionItem value={`item-${index}`}>
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-left text-base font-medium">{item.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pl-12 pr-4 pb-4">
                    <p className="text-base text-muted-foreground">
                      {item.answer}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </section>
  );
}