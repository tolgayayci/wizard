import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const CODE_SNIPPETS = [
  {
    title: 'Digital Piggy Bank',
    description: 'A simple smart contract that works like a digital piggy bank. You can put money in and check how much you have saved!',
    explanation: [
      'Think of this like a magical jar that can hold digital money',
      'You can add money to it anytime you want',
      'Check your savings with one click',
      'Perfect for learning how smart contracts work',
    ],
    code: `use stylus_sdk::{
  alloy_primitives::U256,
  prelude::*,
};

sol_storage! {
  #[entrypoint]
  pub struct PiggyBank {
    uint256 savings;  // This stores how much money you have
  }
}

#[public]
impl PiggyBank {
  // Check how much money you have saved
  pub fn get_savings(&self) -> U256 {
    self.savings.get()
  }

  // Add more money to your piggy bank
  pub fn add_savings(&mut self, amount: U256) {
    let current = self.savings.get();
    self.savings.set(current + amount);
  }
}`
  },
  {
    title: 'Digital Ticket System',
    description: 'Create and manage digital tickets for your events. Like concert tickets, but on the blockchain!',
    explanation: [
      'Works just like real-world event tickets',
      'Each ticket has a unique number',
      'Keep track of who owns which ticket',
      'Great for events and gatherings',
    ],
    code: `use stylus_sdk::{
  alloy_primitives::U256,
  prelude::*,
};

sol_storage! {
  #[entrypoint]
  pub struct TicketSystem {
    uint256 total_tickets;     // How many tickets exist
    mapping tickets_owned;     // Who owns which ticket
  }
}

#[public]
impl TicketSystem {
  // Create a new ticket for someone
  pub fn mint_ticket(&mut self, to: Address) {
    let ticket_id = self.total_tickets.get() + 1;
    self.total_tickets.set(ticket_id);
    self.tickets_owned.set(to, ticket_id);
  }
}`
  }
];

interface CodePreviewProps {
  className?: string;
}

export function CodePreview({ className }: CodePreviewProps) {
  return (
    <div className={cn("grid gap-8 lg:grid-cols-2", className)}>
      {CODE_SNIPPETS.map((snippet, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.2 }}
          viewport={{ once: true }}
          className="space-y-6"
        >
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold">{snippet.title}</h3>
            <p className="text-muted-foreground">{snippet.description}</p>
            <div className="space-y-3">
              {snippet.explanation.map((point, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 text-primary flex-none" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg border bg-muted">
            <div className="flex items-center justify-between border-b p-4">
              <h4 className="font-mono text-sm">Example Code</h4>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <div className="h-2 w-2 rounded-full bg-green-500" />
              </div>
            </div>
            <pre className="p-4 text-sm font-mono overflow-x-auto">
              <code>{snippet.code}</code>
            </pre>
          </div>

          <Button variant="outline" className="w-full">Try This Example</Button>
        </motion.div>
      ))}
    </div>
  );
}