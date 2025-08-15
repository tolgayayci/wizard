import { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  Search, 
  Loader2,
  AlertCircle,
  Filter,
  SortAsc,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  CrateInfo, 
  ProjectDependency,
  searchCrates,
  installPackage,
  removePackage,
  getProjectDependencies,
  getPopularCrates,
  getCrateInfo,
  POPULAR_PACKAGES 
} from '@/lib/packages';
import { PackageTable } from './PackageTable';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

interface PackageManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  userId: string;
}

type ViewMode = 'search' | 'installed' | 'popular';
type SortMode = 'name' | 'downloads' | 'version';

export function PackageManagerDialog({
  open,
  onOpenChange,
  projectId,
  userId,
}: PackageManagerDialogProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('downloads');
  const [searchResults, setSearchResults] = useState<CrateInfo[]>([]);
  const [installedPackages, setInstalledPackages] = useState<ProjectDependency[]>([]);
  const [popularPackages, setPopularPackages] = useState<CrateInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingInstalled, setIsLoadingInstalled] = useState(false);
  const [isLoadingPopular, setIsLoadingPopular] = useState(false);
  const [installingPackages, setInstallingPackages] = useState<Set<string>>(new Set());
  const [removingPackages, setRemovingPackages] = useState<Set<string>>(new Set());
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<Record<ViewMode, number>>({
    search: 1,
    installed: 1,
    popular: 1,
  });
  
  const { toast } = useToast();
  const itemsPerPage = 10;
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Search for crates when debounced query changes
  useEffect(() => {
    if (viewMode !== 'search') return;
    
    if (!debouncedSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      try {
        const results = await searchCrates(debouncedSearchQuery, 1, 50);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        toast({
          title: 'Search Failed',
          description: error instanceof Error ? error.message : 'Failed to search packages',
          variant: 'destructive',
        });
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery, viewMode, toast]);

  // Load installed packages
  const loadInstalledPackages = useCallback(async () => {
    setIsLoadingInstalled(true);
    try {
      const packages = await getProjectDependencies(projectId, userId);
      
      // Enhance each package with real crates.io data
      const enhancedPackages = await Promise.all(
        packages.map(async (pkg) => {
          try {
            // Fetch real data from crates.io
            const crateInfo = await getCrateInfo(pkg.name);
            return {
              ...pkg,
              description: crateInfo.description || (pkg.is_default ? 'Default Stylus dependency' : 'Installed package'),
              downloads: crateInfo.downloads,
              repository: crateInfo.repository,
              documentation: crateInfo.documentation,
            };
          } catch (error) {
            // If crates.io fetch fails, use fallback description
            console.warn(`Failed to fetch crate info for ${pkg.name}:`, error);
            return {
              ...pkg,
              description: pkg.is_default ? 'Default Stylus dependency' : 'Installed package',
              downloads: 0,
              repository: undefined,
              documentation: undefined,
            };
          }
        })
      );
      
      setInstalledPackages(enhancedPackages);
    } catch (error) {
      console.error('Failed to load installed packages:', error);
      toast({
        title: 'Load Failed',
        description: 'Failed to load installed packages',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingInstalled(false);
    }
  }, [projectId, userId, toast]);

  // Load popular packages
  const loadPopularPackages = useCallback(async () => {
    setIsLoadingPopular(true);
    try {
      const packages = await getPopularCrates();
      setPopularPackages(packages);
    } catch (error) {
      console.error('Failed to load popular packages:', error);
      toast({
        title: 'Load Failed',
        description: 'Failed to load popular packages',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPopular(false);
    }
  }, [toast]);

  // Load installed packages when dialog opens or view changes
  useEffect(() => {
    if (open) {
      loadInstalledPackages();
      loadPopularPackages();
    }
  }, [open, loadInstalledPackages, loadPopularPackages]);

  const handleInstallPackage = async (packageName: string, version: string) => {
    setInstallingPackages(prev => new Set(prev).add(packageName));
    try {
      await installPackage(projectId, userId, packageName, version);
      toast({
        title: 'Package Installed',
        description: `Successfully installed ${packageName} v${version}`,
      });
      loadInstalledPackages();
    } catch (error) {
      console.error('Install error:', error);
      toast({
        title: 'Installation Failed',
        description: error instanceof Error ? error.message : 'Failed to install package',
        variant: 'destructive',
      });
    } finally {
      setInstallingPackages(prev => {
        const next = new Set(prev);
        next.delete(packageName);
        return next;
      });
    }
  };

  const handleRemovePackage = async (packageName: string) => {
    setRemovingPackages(prev => new Set(prev).add(packageName));
    try {
      await removePackage(projectId, userId, packageName);
      toast({
        title: 'Package Removed',
        description: `Successfully removed ${packageName}`,
      });
      loadInstalledPackages();
    } catch (error) {
      console.error('Remove error:', error);
      toast({
        title: 'Removal Failed',
        description: error instanceof Error ? error.message : 'Failed to remove package',
        variant: 'destructive',
      });
    } finally {
      setRemovingPackages(prev => {
        const next = new Set(prev);
        next.delete(packageName);
        return next;
      });
    }
  };

  const sortPackages = <T extends CrateInfo | ProjectDependency>(packages: T[]): T[] => {
    return [...packages].sort((a, b) => {
      switch (sortMode) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'downloads':
          const aDownloads = 'downloads' in a ? a.downloads : 0;
          const bDownloads = 'downloads' in b ? b.downloads : 0;
          return bDownloads - aDownloads;
        case 'version':
          return b.version.localeCompare(a.version);
        default:
          return 0;
      }
    });
  };

  const getCurrentPackages = () => {
    let allPackages;
    switch (viewMode) {
      case 'search':
        allPackages = sortPackages(searchResults);
        break;
      case 'installed':
        allPackages = sortPackages(installedPackages);
        break;
      case 'popular':
        allPackages = sortPackages(popularPackages);
        break;
      default:
        allPackages = [];
    }
    
    // Apply pagination
    const startIndex = (currentPage[viewMode] - 1) * itemsPerPage;
    return allPackages.slice(startIndex, startIndex + itemsPerPage);
  };
  
  const getTotalPages = () => {
    let totalItems;
    switch (viewMode) {
      case 'search':
        totalItems = searchResults.length;
        break;
      case 'installed':
        totalItems = installedPackages.length;
        break;
      case 'popular':
        totalItems = popularPackages.length;
        break;
      default:
        totalItems = 0;
    }
    return Math.ceil(totalItems / itemsPerPage);
  };
  
  const getCurrentPageNumber = () => currentPage[viewMode];
  
  const setCurrentPageNumber = (page: number) => {
    setCurrentPage(prev => ({ ...prev, [viewMode]: page }));
  };
  
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    // Reset to page 1 when changing tabs
    setCurrentPage(prev => ({ ...prev, [mode]: 1 }));
  };

  const installedPackageNames = installedPackages.map(pkg => pkg.name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[60vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Package Manager
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-6 py-3 px-1 border-b bg-muted/30">
          {/* View Mode Selector */}
          <div className="flex items-center gap-1 bg-background rounded-md p-1 border">
            {(['search', 'installed', 'popular'] as ViewMode[]).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleViewModeChange(mode)}
                className={cn(
                  "h-7 px-3 text-xs capitalize transition-all",
                  viewMode === mode 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "hover:bg-muted"
                )}
              >
                {mode}
                {mode === 'installed' && installedPackages.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-xs bg-primary-foreground/20">
                    {installedPackages.length}
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={viewMode === 'search' ? 'Search crates.io...' : 'Filter packages...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 bg-background border-input"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Sort by:</span>
            <Select value={sortMode} onValueChange={(value: SortMode) => setSortMode(value)}>
              <SelectTrigger className="w-32 h-8 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="downloads">Downloads</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="version">Version</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'search' && !debouncedSearchQuery.trim() ? (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
              <div className="space-y-3">
                <Search className="h-16 w-16 mx-auto opacity-50" />
                <div>
                  <p className="text-lg">Search Rust Crates</p>
                  <p className="text-sm">Enter a package name to search crates.io</p>
                </div>
              </div>
            </div>
          ) : viewMode === 'installed' && isLoadingInstalled ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Loading installed packages...</p>
              </div>
            </div>
          ) : viewMode === 'popular' && isLoadingPopular ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Loading popular packages...</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <PackageTable
                packages={getCurrentPackages()}
                installedPackages={installedPackageNames}
                installingPackages={installingPackages}
                removingPackages={removingPackages}
                onInstall={handleInstallPackage}
                onRemove={handleRemovePackage}
                showInstallButton={viewMode !== 'installed'}
                isInstalled={viewMode === 'installed'}
                hideDownloads={viewMode === 'installed'}
                hideInstalledBadge={viewMode === 'installed'}
              />
            </ScrollArea>
          )}
        </div>

        {/* Status Bar with Pagination */}
        <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>
              {viewMode === 'installed' 
                ? `${installedPackages.length} packages installed`
                : viewMode === 'popular' 
                ? `${popularPackages.length} popular packages`
                : searchResults.length > 0
                ? `${searchResults.length} results found`
                : ''
              }
            </span>
          </div>
          
          {/* Pagination Controls */}
          {getTotalPages() > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPageNumber(getCurrentPageNumber() - 1)}
                disabled={getCurrentPageNumber() === 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map(page => {
                  const isCurrentPage = page === getCurrentPageNumber();
                  const showPage = page === 1 || page === getTotalPages() || 
                    Math.abs(page - getCurrentPageNumber()) <= 1;
                  
                  if (!showPage && page !== 2 && page !== getTotalPages() - 1) {
                    return page === getCurrentPageNumber() - 2 || page === getCurrentPageNumber() + 2 ? (
                      <span key={page} className="text-xs text-muted-foreground">...</span>
                    ) : null;
                  }
                  
                  return (
                    <Button
                      key={page}
                      variant={isCurrentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPageNumber(page)}
                      className="h-7 w-7 p-0 text-xs"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPageNumber(getCurrentPageNumber() + 1)}
                disabled={getCurrentPageNumber() === getTotalPages()}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
              
              <span className="text-xs text-muted-foreground ml-2">
                Page {getCurrentPageNumber()} of {getTotalPages()}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Press / to search
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}