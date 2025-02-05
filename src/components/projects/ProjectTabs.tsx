import { SearchIcon, Code2Icon, FilterIcon, GitBranchIcon, Sparkles, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Section {
  id: 'projects' | 'templates';
  label: string;
  icon: any;
  count: number;
}

export type SortOption = {
  label: string;
  value: 'created_desc' | 'created_asc' | 'updated_desc' | 'updated_asc' | 'name_asc' | 'name_desc';
};

const PROJECT_SORT_OPTIONS: SortOption[] = [
  { label: 'Recently Created', value: 'created_desc' },
  { label: 'Oldest Created', value: 'created_asc' },
  { label: 'Recently Updated', value: 'updated_desc' },
  { label: 'Oldest Updated', value: 'updated_asc' },
  { label: 'Name (A-Z)', value: 'name_asc' },
  { label: 'Name (Z-A)', value: 'name_desc' },
];

const TEMPLATE_SORT_OPTIONS: SortOption[] = [
  { label: 'Name (A-Z)', value: 'name_asc' },
  { label: 'Name (Z-A)', value: 'name_desc' },
];

interface ProjectTabsProps {
  sections: Section[];
  activeSection: Section['id'];
  searchQuery: string;
  sortBy: SortOption['value'];
  onSectionChange: (section: Section['id']) => void;
  onSearchChange: (query: string) => void;
  onSortChange: (sort: SortOption['value']) => void;
}

export function ProjectTabs({
  sections,
  activeSection,
  searchQuery,
  sortBy,
  onSectionChange,
  onSearchChange,
  onSortChange,
}: ProjectTabsProps) {
  const sortOptions = activeSection === 'projects' ? PROJECT_SORT_OPTIONS : TEMPLATE_SORT_OPTIONS;
  const currentSort = sortOptions.find(option => option.value === sortBy);

  return (
    <div className="border rounded-lg bg-card/50">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          {sections.map((section) => (
            <Button
              key={section.id}
              variant="ghost"
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
                activeSection === section.id && "bg-primary/10 text-primary hover:bg-primary/20"
              )}
              onClick={() => onSectionChange(section.id)}
            >
              <section.icon className="h-4 w-4" />
              {section.label}
              <span className={cn(
                "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium",
                activeSection === section.id
                  ? "bg-primary/20 text-primary" 
                  : "bg-muted text-muted-foreground"
              )}>
                {section.count}
              </span>
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${sections.find(s => s.id === activeSection)?.label.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ArrowUpDown className="h-4 w-4" />
                <span className="hidden sm:inline">{currentSort?.label}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onSortChange(option.value)}
                  className={cn(
                    "cursor-pointer",
                    option.value === sortBy && "bg-primary/10 text-primary"
                  )}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}