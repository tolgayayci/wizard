import React from 'react';
import { 
  Download, 
  ExternalLink, 
  Trash2, 
  Plus,
  Check,
  Loader2,
  BookOpen,
  Github,
  Package,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CrateInfo, ProjectDependency } from '@/lib/packages';
import { cn } from '@/lib/utils';

interface PackageTableProps {
  packages: (CrateInfo | ProjectDependency)[];
  installedPackages: string[];
  installingPackages: Set<string>;
  removingPackages: Set<string>;
  onInstall: (packageName: string, version: string) => void;
  onRemove: (packageName: string) => void;
  showInstallButton?: boolean;
  isInstalled?: boolean;
  hideDownloads?: boolean;
  hideInstalledBadge?: boolean;
}

export function PackageTable({
  packages,
  installedPackages,
  installingPackages,
  removingPackages,
  onInstall,
  onRemove,
  showInstallButton = true,
  isInstalled = false,
  hideDownloads = false,
  hideInstalledBadge = false,
}: PackageTableProps) {
  const formatDownloads = (downloads: number): string => {
    if (downloads >= 1000000) {
      return `${(downloads / 1000000).toFixed(1)}M`;
    }
    if (downloads >= 1000) {
      return `${(downloads / 1000).toFixed(1)}K`;
    }
    return downloads.toString();
  };

  const isPackageInstalled = (packageName: string) => {
    return installedPackages.includes(packageName);
  };

  const getPackageInfo = (pkg: CrateInfo | ProjectDependency) => {
    if ('downloads' in pkg) {
      // It's a CrateInfo
      return {
        name: pkg.name,
        version: pkg.version,
        description: pkg.description || 'No description available',
        downloads: pkg.downloads,
        repository: pkg.repository,
        documentation: pkg.documentation,
        isDefault: false,
      };
    } else {
      // It's a ProjectDependency - for installed packages, try to get more info
      return {
        name: pkg.name,
        version: pkg.version,
        description: pkg.is_default ? 'Default Stylus dependency' : 'Installed package',
        downloads: pkg.downloads || 0, // Use actual downloads if available
        repository: pkg.repository,
        documentation: pkg.documentation,
        isDefault: pkg.is_default,
      };
    }
  };

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b">
            <TableHead className={cn(
              "py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wide",
              hideDownloads ? "w-[380px]" : "w-[280px]"
            )}>Package</TableHead>
            <TableHead className="w-[100px] py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wide">Version</TableHead>
            {!hideDownloads && (
              <TableHead className="w-[120px] py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wide">Downloads</TableHead>
            )}
            <TableHead className={cn(
              "py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wide",
              hideDownloads ? "min-w-[400px]" : "min-w-[300px]"
            )}>Description</TableHead>
            <TableHead className="w-[80px] py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wide text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {packages.length === 0 ? (
            <TableRow>
              <TableCell colSpan={hideDownloads ? 5 : 6} className="h-24 text-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <Package className="h-8 w-8 opacity-50" />
                  <p>No packages found</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            packages.map((pkg) => {
              const info = getPackageInfo(pkg);
              const installed = isInstalled || isPackageInstalled(info.name);
              const installing = installingPackages.has(info.name);
              const removing = removingPackages.has(info.name);

              return (
                <TableRow key={info.name} className="hover:bg-muted/50 border-b border-border/50">
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          {installed && (
                            <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full" />
                          )}
                        </div>
                        <span className="font-medium text-sm">{info.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {info.isDefault && (
                          <Badge variant="secondary" className="text-xs px-2 py-1">
                            Default
                          </Badge>
                        )}
                        {installed && !hideInstalledBadge && (
                          <Badge variant="outline" className="text-xs px-2 py-1 text-green-700 border-green-200 bg-green-50">
                            <Check className="h-3 w-3 mr-1" />
                            Installed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="py-3 px-4">
                    <Badge variant="outline" className="text-xs font-mono">
                      {info.version}
                    </Badge>
                  </TableCell>
                  
                  {!hideDownloads && (
                    <TableCell className="py-3 px-4">
                      {info.downloads > 0 ? (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Download className="h-3 w-3" />
                          <span className="font-medium">{formatDownloads(info.downloads)}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  
                  <TableCell className="py-3 px-4">
                    <p className={cn(
                      "text-sm text-muted-foreground line-clamp-2",
                      hideDownloads ? "max-w-[500px]" : "max-w-[400px]"
                    )} title={info.description}>
                      {info.description}
                    </p>
                  </TableCell>
                  
                  <TableCell className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end">
                      {showInstallButton && !installed ? (
                        <Button
                          size="sm"
                          onClick={() => onInstall(info.name, info.version)}
                          disabled={installing}
                          className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700"
                        >
                          {installing ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                          ) : (
                            <Plus className="h-3 w-3 mr-1.5" />
                          )}
                          Install
                        </Button>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-muted"
                              disabled={removing}
                            >
                              {removing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild>
                              <a
                                href={`https://crates.io/crates/${info.name}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2"
                              >
                                <ExternalLink className="h-4 w-4" />
                                View on crates.io
                              </a>
                            </DropdownMenuItem>
                            {info.documentation && (
                              <DropdownMenuItem asChild>
                                <a
                                  href={info.documentation}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2"
                                >
                                  <BookOpen className="h-4 w-4" />
                                  Documentation
                                </a>
                              </DropdownMenuItem>
                            )}
                            {info.repository && (
                              <DropdownMenuItem asChild>
                                <a
                                  href={info.repository}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2"
                                >
                                  <Github className="h-4 w-4" />
                                  Repository
                                </a>
                              </DropdownMenuItem>
                            )}
                            {installed && !info.isDefault && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => onRemove(info.name)}
                                  className="flex items-center gap-2 text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Remove Package
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}