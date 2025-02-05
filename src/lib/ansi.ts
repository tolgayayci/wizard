// Convert ANSI escape codes to CSS styles
export function parseAnsiOutput(text: string): { text: string; className: string }[] {
  const result: { text: string; className: string }[] = [];
  const parts = text.split(/(\x1b\[[0-9;]*m)/);
  let currentClasses: string[] = [];

  for (const part of parts) {
    if (part.startsWith('\x1b[')) {
      // Parse ANSI codes
      const codes = part.slice(2, -1).split(';').map(Number);
      for (const code of codes) {
        switch (code) {
          case 0: // Reset
            currentClasses = [];
            break;
          case 1: // Bold
            currentClasses.push('font-bold');
            break;
          case 90: // Gray
            currentClasses.push('text-gray-500');
            break;
          case 38: // Foreground color
            currentClasses.push('text-green-500');
            break;
        }
      }
    } else if (part) {
      // Add text with current styling
      result.push({
        text: part,
        className: currentClasses.join(' ') || 'text-muted-foreground'
      });
    }
  }

  return result;
}