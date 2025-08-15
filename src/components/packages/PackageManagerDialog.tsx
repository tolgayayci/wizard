import { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  Search, 
  Download, 
  ExternalLink, 
  Trash2, 
  Plus,
  Check,
  Loader2,
  AlertCircle,
  Star,
  BookOpen,
  Github
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  CrateInfo, 
  ProjectDependency,
  searchCrates,
  installPackage,
  removePackage,
  getProjectDependencies,
  POPULAR_PACKAGES 
} from '@/lib/packages';
import { useDebounce } from '@/hooks/use-debounce';

interface PackageManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  userId: string;
}

export function PackageManagerDialog({
  open,
  onOpenChange,
  projectId,
  userId,
}: PackageManagerDialogProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'installed' | 'popular'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CrateInfo[]>([]);
  const [installedPackages, setInstalledPackages] = useState<ProjectDependency[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingInstalled, setIsLoadingInstalled] = useState(false);
  const [installingPackages, setInstallingPackages] = useState<Set<string>>(new Set());
  const [removingPackages, setRemovingPackages] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Search for crates when debounced query changes
  useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      try {
        const results = await searchCrates(debouncedSearchQuery, 1, 20);
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
  }, [debouncedSearchQuery, toast]);

  // Load installed packages
  const loadInstalledPackages = useCallback(async () => {
    setIsLoadingInstalled(true);
    try {
      const packages = await getProjectDependencies(projectId, userId);
      setInstalledPackages(packages);
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

  // Load installed packages when dialog opens or tab changes to installed
  useEffect(() => {
    if (open && activeTab === 'installed') {
      loadInstalledPackages();
    }
  }, [open, activeTab, loadInstalledPackages]);

  const handleInstallPackage = async (packageName: string, version: string) => {
    setInstallingPackages(prev => new Set(prev).add(packageName));
    try {
      await installPackage(projectId, userId, packageName, version);
      toast({
        title: 'Package Installed',
        description: `Successfully installed ${packageName} v${version}`,
      });
      // Reload installed packages if we're on that tab
      if (activeTab === 'installed') {
        loadInstalledPackages();
      }
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

  const isPackageInstalled = (packageName: string) => {
    return installedPackages.some(pkg => pkg.name === packageName);
  };

  const formatDownloads = (downloads: number): string => {
    if (downloads >= 1000000) {
      return `${(downloads / 1000000).toFixed(1)}M`;
    }
    if (downloads >= 1000) {
      return `${(downloads / 1000).toFixed(1)}K`;
    }
    return downloads.toString();
  };

  const PackageCard = ({ 
    crate, 
    showInstallButton = true, 
    isInstalled = false,
    onInstall,
    onRemove,
    canRemove = true
  }: {
    crate: CrateInfo;
    showInstallButton?: boolean;
    isInstalled?: boolean;
    onInstall?: () => void;
    onRemove?: () => void;
    canRemove?: boolean;
  }) => (
    <Card className="transition-colors hover:bg-muted/50">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="truncate">{crate.name}</span>
              <Badge variant="outline" className="text-xs">
                v{crate.version}
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {crate.description || 'No description available'}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              <span>{formatDownloads(crate.downloads)} downloads</span>
            </div>
            <div className="flex items-center gap-1">
              <a
                href={`https://crates.io/crates/${crate.name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
                title="View on crates.io"
              >
                <ExternalLink className="h-3 w-3" />
                <span>crates.io</span>
              </a>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {crate.documentation && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-7 w-7 p-0"
              >
                <a
                  href={crate.documentation}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View documentation"
                >
                  <BookOpen className="h-3 w-3" />
                </a>
              </Button>
            )}
            {crate.repository && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-7 w-7 p-0"
              >
                <a
                  href={crate.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View repository"
                >
                  <Github className="h-3 w-3" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-end gap-1">
          {showInstallButton && !isInstalled && onInstall && (
            <Button
              size="sm"
              onClick={onInstall}
              disabled={installingPackages.has(crate.name)}
              className="h-8"
            >
              {installingPackages.has(crate.name) ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              <span className="ml-1">Install</span>
            </Button>
          )}
          {isInstalled && (
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="h-8 px-2">
                <Check className="h-3 w-3 mr-1" />
                Installed
              </Badge>
              {canRemove && onRemove && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRemove}
                  disabled={removingPackages.has(crate.name)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  {removingPackages.has(crate.name) ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Manage Packages
          </DialogTitle>
          <DialogDescription>
            Install and manage Rust crates for your Stylus project
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="installed" className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              Installed
            </TabsTrigger>
            <TabsTrigger value="popular" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Popular
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="flex-1 flex flex-col overflow-hidden">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search packages on crates.io..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-3 pb-4">
                {searchResults.length === 0 && debouncedSearchQuery && !isSearching && (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No packages found for "{debouncedSearchQuery}"</p>
                  </div>
                )}
                
                {searchResults.length === 0 && !debouncedSearchQuery && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Enter a package name to search crates.io</p>
                  </div>
                )}
                
                {searchResults.map((crate) => (
                  <PackageCard
                    key={crate.name}
                    crate={crate}
                    isInstalled={isPackageInstalled(crate.name)}
                    onInstall={() => handleInstallPackage(crate.name, crate.version)}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="installed" className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-3 pb-4">
                {isLoadingInstalled ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">Loading installed packages...</p>
                  </div>
                ) : installedPackages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No packages installed yet</p>
                    <p className="text-sm mt-2">Install packages from the Search or Popular tabs</p>
                  </div>
                ) : (
                  installedPackages.map((pkg) => (
                    <PackageCard
                      key={pkg.name}
                      crate={{
                        name: pkg.name,
                        version: pkg.version,
                        description: pkg.is_default ? 'Default Stylus dependency' : 'Installed package',
                        downloads: 0,
                      }}
                      showInstallButton={false}
                      isInstalled={true}
                      canRemove={!pkg.is_default}
                      onRemove={() => handleRemovePackage(pkg.name)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="popular" className="flex-1 flex flex-col overflow-hidden">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Essential Stylus Packages</h3>
            </div>
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-3 pb-4">
                {POPULAR_PACKAGES.map((pkg) => {
                  const crate: CrateInfo = {
                    name: pkg.name,
                    version: pkg.version,
                    description: pkg.description,
                    downloads: pkg.downloads || 0,
                    repository: pkg.repository,
                    documentation: pkg.documentation,
                  };
                  const installed = isPackageInstalled(pkg.name);
                  
                  return (
                    <div key={pkg.name} className="relative">
                      <PackageCard
                        crate={crate}
                        isInstalled={installed}
                        onInstall={() => handleInstallPackage(pkg.name, pkg.version)}
                      />
                      {pkg.isDefault && (
                        <Badge className="absolute top-3 right-3 bg-primary/10 text-primary border-primary/20">
                          Default
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}