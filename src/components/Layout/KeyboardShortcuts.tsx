import { useEffect, useState } from 'react';
import { Keyboard, X } from 'lucide-react';

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 p-3 bg-black/80 border-2 border-cyber-primary/50 rounded-full text-cyber-primary hover:bg-cyber-primary/20 transition-all shadow-lg"
        aria-label="Show keyboard shortcuts"
        title="Keyboard shortcuts (Ctrl+/)"
      >
        <Keyboard className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="hacker-border rounded bg-black/95 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 md:p-6 border-b-2 border-cyber-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-cyber-primary font-mono flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            ► KEYBOARD SHORTCUTS
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-cyber-secondary hover:text-cyber-primary transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 md:p-6 space-y-4">
          <div>
            <h3 className="text-cyber-secondary font-mono text-sm mb-3">GLOBAL</h3>
            <div className="space-y-2">
              <ShortcutRow keys={['Ctrl', '/']} description="Show this help menu" />
              <ShortcutRow keys={['Esc']} description="Close modal/menu" />
            </div>
          </div>

          <div>
            <h3 className="text-cyber-secondary font-mono text-sm mb-3">THREATS VIEW</h3>
            <div className="space-y-2">
              <ShortcutRow keys={['Ctrl', 'K']} description="Focus search" />
              <ShortcutRow keys={['Ctrl', 'N']} description="Report new threat" />
            </div>
          </div>

          <div>
            <h3 className="text-cyber-secondary font-mono text-sm mb-3">NAVIGATION</h3>
            <div className="space-y-2">
              <ShortcutRow keys={['1-9']} description="Switch to view (when sidebar focused)" />
            </div>
          </div>
        </div>
        <div className="p-4 border-t-2 border-cyber-border bg-black/50">
          <p className="text-cyber-secondary font-mono text-xs text-center">
            Press <kbd className="px-2 py-1 bg-green-900/30 border border-green-900 rounded">ESC</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}

interface ShortcutRowProps {
  keys: string[];
  description: string;
}

function ShortcutRow({ keys, description }: ShortcutRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-green-900/30">
      <span className="text-cyber-secondary font-mono text-xs">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, idx) => (
          <span key={idx} className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-green-900/30 border border-green-900 rounded text-cyber-primary font-mono text-xs">
              {key}
            </kbd>
            {idx < keys.length - 1 && <span className="text-green-800">+</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
