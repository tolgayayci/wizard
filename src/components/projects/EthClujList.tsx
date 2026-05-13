import { Code2, Sparkles } from 'lucide-react';
import { TemplateListRow } from './TemplateListRow';
import { ETHCLUJ_TEMPLATES } from '@/lib/ethcluj-templates';
import type { Template } from '@/lib/api';
import type { SortOption } from './ProjectTabs';

interface EthClujListProps {
  searchQuery: string;
  sortBy: SortOption['value'];
  onUseTemplate: (template: Template) => void;
}

/**
 * Mirrors TemplateList visually but the data comes from a static list of GitHub-hosted
 * workshop challenges. Clicking "Use Template" hands the template back up so the parent
 * page can open the GitHub import dialog with the URL pre-filled.
 */
export function EthClujList({ searchQuery, sortBy, onUseTemplate }: EthClujListProps) {
  let items: Template[] = ETHCLUJ_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (sortBy === 'name_desc') {
    items = [...items].sort((a, b) => b.name.localeCompare(a.name));
  } else if (sortBy === 'name_asc') {
    items = [...items].sort((a, b) => a.name.localeCompare(b.name));
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[calc(100vh-16rem)] rounded-lg border bg-card flex items-center justify-center p-8">
        <div className="text-center max-w-sm mx-auto">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
            <div className="relative bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h3 className="text-2xl font-semibold mt-6">No Challenges Found</h3>
          <p className="text-muted-foreground mt-2">
            Try adjusting your search terms to see all EthCluj workshop challenges
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-11 px-6 text-left text-xs font-medium text-muted-foreground w-[30%]">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4" />
                  Challenge
                </div>
              </th>
              <th className="h-11 px-6 text-left text-xs font-medium text-muted-foreground w-[50%]">
                Description
              </th>
              <th className="h-11 px-6 text-right text-xs font-medium text-muted-foreground w-[20%]">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((template) => (
              <TemplateListRow
                key={template.id}
                template={template}
                onUseTemplate={onUseTemplate}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
