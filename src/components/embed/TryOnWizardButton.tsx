import { useState } from 'react';
import { Wand2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TryOnWizardButtonProps {
  code: string;
  projectName: string;
  description?: string;
  dependencies?: string[];
  sourceUrl?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

export function TryOnWizardButton({
  code,
  projectName,
  description,
  dependencies,
  sourceUrl,
  className,
  variant = 'default',
  size = 'default',
}: TryOnWizardButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setIsLoading(true);

    try {
      // Create embed data
      const embedData = {
        code: code.trim(),
        projectName,
        description,
        dependencies,
        sourceUrl: sourceUrl || window.location.href,
      };

      // Encode data to base64
      const encodedData = btoa(JSON.stringify(embedData));
      
      // Open Wizard in new tab
      const wizardUrl = `${window.location.protocol}//${window.location.hostname}:5173/tryonwizard/${encodedData}`;
      window.open(wizardUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to create embed URL:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading ? (
        <>
          <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
          Opening...
        </>
      ) : (
        <>
          <Wand2 className="w-4 h-4 mr-2" />
          Try on Wizard
          <ExternalLink className="w-3 h-3 ml-1" />
        </>
      )}
    </Button>
  );
}

// Standalone iframe-embeddable version
export function createTryOnWizardButton(containerId: string, props: TryOnWizardButtonProps) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found`);
    return;
  }

  // Create button element
  const button = document.createElement('button');
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px; display: inline-block; vertical-align: middle;">
      <path d="m15 18-6-6 6-6"/>
      <path d="M9 12h12"/>
    </svg>
    Try on Wizard
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: 4px; display: inline-block; vertical-align: middle;">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15,3 21,3 21,9"/>
      <line x1="10" x2="21" y1="14" y2="3"/>
    </svg>
  `;
  
  // Style the button
  Object.assign(button.style, {
    backgroundColor: '#000',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  });

  // Add hover effects
  button.onmouseenter = () => {
    button.style.backgroundColor = '#333';
    button.style.transform = 'translateY(-1px)';
  };
  
  button.onmouseleave = () => {
    button.style.backgroundColor = '#000';
    button.style.transform = 'translateY(0)';
  };

  // Add click handler
  button.onclick = () => {
    try {
      const embedData = {
        code: props.code.trim(),
        projectName: props.projectName,
        description: props.description,
        dependencies: props.dependencies,
        sourceUrl: props.sourceUrl || window.location.href,
      };

      const encodedData = btoa(JSON.stringify(embedData));
      const wizardUrl = `https://thewizard.app/tryonwizard/${encodedData}`;
      window.open(wizardUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to create embed URL:', error);
    }
  };

  // Replace container content with button
  container.innerHTML = '';
  container.appendChild(button);
}