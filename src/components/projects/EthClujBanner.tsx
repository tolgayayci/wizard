import { Trophy, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ETHCLUJ_TEMPLATES } from '@/lib/ethcluj-templates';

interface EthClujBannerProps {
  onOpen: () => void;
}

/**
 * Promo card that nudges workshop attendees toward the EthCluj challenges tab. Visible on
 * every tab except ETH Cluj itself.
 */
export function EthClujBanner({ onOpen }: EthClujBannerProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group relative w-full text-left overflow-hidden rounded-xl border',
        'bg-gradient-to-br from-primary/10 via-blue-500/10 to-purple-500/10',
        'hover:from-primary/15 hover:via-blue-500/15 hover:to-purple-500/15',
        'border-primary/20 hover:border-primary/40',
        'transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
      )}
    >
      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />

      <div className="relative flex items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'flex-none p-3 rounded-lg border border-primary/30',
              'bg-gradient-to-br from-primary/20 via-blue-500/20 to-purple-500/20',
              'group-hover:scale-105 transition-transform duration-300',
            )}
          >
            <Trophy className="h-6 w-6 text-primary" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold tracking-tight">
                Attending EthCluj 2026?
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
                <Sparkles className="h-3 w-3" />
                Workshop
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {ETHCLUJ_TEMPLATES.length} Stylus challenges ready to fork &mdash;{' '}
              {ETHCLUJ_TEMPLATES.map(t => t.name.replace(/^\d+\.\s*/, '')).join(', ')}.
            </p>
          </div>
        </div>

        <Button
          asChild={false}
          size="sm"
          className="flex-none gap-1.5 shadow-sm group-hover:gap-2.5 transition-all"
        >
          View Challenges
          <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Button>
      </div>
    </button>
  );
}
