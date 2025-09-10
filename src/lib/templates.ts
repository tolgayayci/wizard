import { Code2 } from 'lucide-react';

// Re-export the Template type from api.ts for backwards compatibility
export type { Template } from './api';

// Icon mapping for templates
export const TEMPLATE_ICONS: Record<string, typeof Code2> = {
  'hello-world': Code2,
  'default': Code2,
};

// Get icon for template
export function getTemplateIcon(templateId: string): typeof Code2 {
  return TEMPLATE_ICONS[templateId] || TEMPLATE_ICONS.default;
}