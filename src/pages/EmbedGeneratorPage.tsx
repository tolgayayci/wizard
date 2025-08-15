import { useState } from 'react';
import { Copy, Plus, X, Sparkles, Package, Code2, Settings, Eye, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { TryOnWizardButton } from '@/components/embed/TryOnWizardButton';
import { SEO } from '@/components/seo/SEO';
import { cn } from '@/lib/utils';

const defaultCode = `use stylus_sdk::prelude::*;

sol_storage! {
    #[entrypoint]
    pub struct Counter {
        uint256 number;
    }
}

#[public]
impl Counter {
    pub fn increment(&mut self) {
        let number = self.number.get();
        self.number.set(number + U256::from(1));
    }
}`;

interface Dependency {
  name: string;
  version: string;
}

const quickDeps = [
  { name: 'stylus-sdk', version: '0.6.0' },
  { name: 'alloy-primitives', version: '0.8.5' },
  { name: 'alloy-sol-types', version: '0.8.5' },
  { name: 'hex', version: '0.4.3' },
];

const quickDevDeps = [
  { name: 'tokio', version: '1.32', features: ['full'] },
  { name: 'ethers', version: '2.0' },
  { name: 'eyre', version: '0.6' },
];

export function EmbedGeneratorPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    projectName: 'Counter Contract',
    description: 'A simple counter smart contract',
    code: defaultCode,
    sourceUrl: '',
  });
  
  const [dependencies, setDependencies] = useState<Dependency[]>([
    { name: 'stylus-sdk', version: '0.6.0' },
  ]);
  
  const [devDependencies, setDevDependencies] = useState<Dependency[]>([]);
  
  const [newDep, setNewDep] = useState({ name: '', version: '' });
  const [newDevDep, setNewDevDep] = useState({ name: '', version: '' });
  const [copied, setCopied] = useState(false);

  const addDependency = () => {
    if (newDep.name && newDep.version) {
      setDependencies([...dependencies, { ...newDep }]);
      setNewDep({ name: '', version: '' });
    }
  };

  const addDevDependency = () => {
    if (newDevDep.name && newDevDep.version) {
      setDevDependencies([...devDependencies, { ...newDevDep }]);
      setNewDevDep({ name: '', version: '' });
    }
  };

  const removeDependency = (index: number) => {
    setDependencies(dependencies.filter((_, i) => i !== index));
  };

  const removeDevDependency = (index: number) => {
    setDevDependencies(devDependencies.filter((_, i) => i !== index));
  };

  const generateEmbedCode = () => {
    const embedData = {
      code: formData.code.trim(),
      projectName: formData.projectName,
      description: formData.description || undefined,
      dependencies: dependencies.length > 0 
        ? dependencies.map(d => `${d.name} = "${d.version}"`)
        : undefined,
      devDependencies: devDependencies.length > 0
        ? devDependencies.map(d => `${d.name} = "${d.version}"`)
        : undefined,
      sourceUrl: formData.sourceUrl || undefined,
    };

    const buttonId = 'wizard-' + Math.random().toString(36).substr(2, 9);
    
    return `<!-- Try on Wizard Button -->
<div id="${buttonId}"></div>
<script>
(function() {
  const embedData = ${JSON.stringify(embedData, null, 2)};
  const button = document.createElement('button');
  button.innerHTML = \`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px; display: inline-block; vertical-align: middle;">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
    <path d="M2 17l10 5 10-5"/>
    <path d="M2 12l10 5 10-5"/>
  </svg>Try on Wizard\`;
  Object.assign(button.style, {
    backgroundColor: '#000',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  });
  button.onmouseenter = () => {
    button.style.backgroundColor = '#333';
  };
  button.onmouseleave = () => {
    button.style.backgroundColor = '#000';
  };
  button.onclick = () => {
    const encodedData = btoa(JSON.stringify(embedData));
    window.open(\`https://thewizard.app/tryonwizard/\${encodedData}\`, '_blank');
  };
  document.getElementById('${buttonId}').appendChild(button);
})();
</script>`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied!',
      description: 'Embed code copied to clipboard',
    });
  };

  const embedCode = generateEmbedCode();

  return (
    <div className="h-screen flex flex-col bg-background">
      <SEO 
        title="Embed Generator"
        description="Generate embeddable Try on Wizard buttons"
      />
      
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Embed Generator</h1>
            <p className="text-xs text-muted-foreground">Create embeddable buttons for your Stylus contracts</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 max-w-7xl mx-auto w-full flex gap-6 p-6">
          {/* Left Column */}
          <div className="w-80 flex flex-col gap-4">
            {/* Project Configuration */}
            <div className="border rounded-lg overflow-hidden bg-card">
              <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center gap-2">
                <Settings className="h-3.5 w-3.5" />
                <span className="text-sm font-medium">Configuration</span>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Project Name</Label>
                    <Input
                      value={formData.projectName}
                      onChange={(e) => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
                      className="h-8 mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="h-8 mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Source URL</Label>
                    <Input
                      value={formData.sourceUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, sourceUrl: e.target.value }))}
                      className="h-8 mt-1 text-sm"
                      placeholder="https://github.com/..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Dependencies */}
            <div className="border rounded-lg overflow-hidden bg-card flex-1 flex flex-col">
              <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center gap-2">
                <Package className="h-3.5 w-3.5" />
                <span className="text-sm font-medium">Dependencies</span>
              </div>
              <div className="flex-1 p-4">
                <Tabs defaultValue="deps" className="h-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-2 h-8">
                    <TabsTrigger value="deps" className="text-xs">
                      Dependencies ({dependencies.length})
                    </TabsTrigger>
                    <TabsTrigger value="dev" className="text-xs">
                      Dev ({devDependencies.length})
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Regular Dependencies */}
                  <TabsContent value="deps" className="flex-1 flex flex-col mt-3 space-y-3">
                    <div className="flex-1 overflow-y-auto space-y-1.5">
                      {dependencies.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4 text-center">No dependencies</p>
                      ) : (
                        dependencies.map((dep, index) => (
                          <div key={index} className="flex items-center gap-2 p-1.5 bg-muted/50 rounded text-xs group">
                            <code className="flex-1">
                              {dep.name}@{dep.version}
                            </code>
                            <button
                              onClick={() => removeDependency(index)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="space-y-2 border-t pt-3">
                      <div className="flex gap-1">
                        <Input
                          placeholder="Package"
                          value={newDep.name}
                          onChange={(e) => setNewDep(prev => ({ ...prev, name: e.target.value }))}
                          className="flex-1 h-7 text-xs"
                        />
                        <Input
                          placeholder="0.1.0"
                          value={newDep.version}
                          onChange={(e) => setNewDep(prev => ({ ...prev, version: e.target.value }))}
                          className="w-16 h-7 text-xs"
                        />
                        <Button
                          size="sm"
                          onClick={addDependency}
                          disabled={!newDep.name || !newDep.version}
                          className="h-7 px-2"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {quickDeps.filter(dep => !dependencies.some(d => d.name === dep.name)).slice(0, 3).map((dep) => (
                          <button
                            key={dep.name}
                            onClick={() => setDependencies([...dependencies, dep])}
                            className="px-1.5 py-0.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors"
                          >
                            + {dep.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                  
                  {/* Dev Dependencies */}
                  <TabsContent value="dev" className="flex-1 flex flex-col mt-3 space-y-3">
                    <div className="flex-1 overflow-y-auto space-y-1.5">
                      {devDependencies.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4 text-center">No dev dependencies</p>
                      ) : (
                        devDependencies.map((dep, index) => (
                          <div key={index} className="flex items-center gap-2 p-1.5 bg-muted/50 rounded text-xs group">
                            <code className="flex-1">
                              {dep.name}@{dep.version}
                            </code>
                            <button
                              onClick={() => removeDevDependency(index)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="space-y-2 border-t pt-3">
                      <div className="flex gap-1">
                        <Input
                          placeholder="Package"
                          value={newDevDep.name}
                          onChange={(e) => setNewDevDep(prev => ({ ...prev, name: e.target.value }))}
                          className="flex-1 h-7 text-xs"
                        />
                        <Input
                          placeholder="0.1.0"
                          value={newDevDep.version}
                          onChange={(e) => setNewDevDep(prev => ({ ...prev, version: e.target.value }))}
                          className="w-16 h-7 text-xs"
                        />
                        <Button
                          size="sm"
                          onClick={addDevDependency}
                          disabled={!newDevDep.name || !newDevDep.version}
                          className="h-7 px-2"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {quickDevDeps.slice(0, 3).map((dep) => (
                          <button
                            key={dep.name}
                            onClick={() => !devDependencies.some(d => d.name === dep.name) && 
                              setDevDependencies([...devDependencies, { name: dep.name, version: dep.version }])}
                            disabled={devDependencies.some(d => d.name === dep.name)}
                            className={cn(
                              "px-1.5 py-0.5 text-xs rounded transition-colors",
                              devDependencies.some(d => d.name === dep.name)
                                ? "bg-muted text-muted-foreground cursor-not-allowed"
                                : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 cursor-pointer"
                            )}
                          >
                            + {dep.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>

          {/* Middle Column - Code Editor */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 border rounded-lg overflow-hidden bg-card flex flex-col">
              <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="h-3.5 w-3.5" />
                  <span className="text-sm font-medium">Contract Code</span>
                </div>
                <Badge variant="secondary" className="text-xs px-2 py-0">
                  {formData.code.length} chars
                </Badge>
              </div>
              <Textarea
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                className="flex-1 font-mono text-xs border-0 rounded-none resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-4 bg-background"
                placeholder="Enter your Stylus code..."
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="w-80 flex flex-col gap-4">
            {/* Preview */}
            <div className="border rounded-lg overflow-hidden bg-card">
              <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center gap-2">
                <Eye className="h-3.5 w-3.5" />
                <span className="text-sm font-medium">Button Preview</span>
              </div>
              <div className="p-4">
                <div className="p-6 bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg flex justify-center">
                  <TryOnWizardButton
                    code={formData.code}
                    projectName={formData.projectName}
                    description={formData.description}
                    dependencies={dependencies.map(d => `${d.name} = "${d.version}"`)}
                    sourceUrl={formData.sourceUrl}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  This is how your button will appear
                </p>
              </div>
            </div>

            {/* Embed Code */}
            <div className="border rounded-lg overflow-hidden bg-card flex-1 flex flex-col">
              <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="h-3.5 w-3.5" />
                  <span className="text-sm font-medium">Embed Code</span>
                </div>
                <Button
                  size="sm"
                  variant={copied ? "secondary" : "outline"}
                  onClick={copyToClipboard}
                  className="h-6 text-xs px-2"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="flex-1 p-4 flex flex-col">
                <div className="flex-1 bg-muted/30 rounded p-3 overflow-y-auto">
                  <pre className="text-xs leading-relaxed">
                    <code className="text-muted-foreground">{embedCode}</code>
                  </pre>
                </div>
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                  Paste this code into your HTML where you want the button
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}