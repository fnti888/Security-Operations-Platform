import { X, Palette, Zap, Monitor, Moon, Shield, Key } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { APIKeyManagement } from './APIKeyManagement';
import { useState } from 'react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { mode, setMode, reduceMotion, setReduceMotion } = useTheme();
  const [activeTab, setActiveTab] = useState<'appearance' | 'integrations'>('appearance');

  if (!isOpen) return null;

  const themes = [
    { id: 'classic' as const, name: 'Classic Green', icon: Monitor, desc: 'Original terminal look' },
    { id: 'accessible' as const, name: 'High Contrast', icon: Shield, desc: 'WCAG AAA compliant' },
    { id: 'midnight' as const, name: 'Midnight Blue', icon: Moon, desc: 'Easier on the eyes' },
    { id: 'matrix' as const, name: 'Matrix Code', icon: Zap, desc: 'Vibrant cyan theme' },
  ];

  return (
    <>
      <div
        className="fixed inset-0 bg-black/80 z-50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed right-0 top-0 h-full w-full md:w-[600px] bg-cyber-bg border-l-2 border-cyber-primary z-50 overflow-y-auto animate-slide-in-right"
        role="dialog"
        aria-labelledby="settings-title"
        aria-modal="true"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Palette className="w-6 h-6 text-cyber-primary" />
              <h2 id="settings-title" className="text-2xl font-bold text-cyber-primary font-mono">
                SETTINGS
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-cyber-primary/20 rounded transition-colors"
              aria-label="Close settings"
            >
              <X className="w-6 h-6 text-cyber-primary" />
            </button>
          </div>

          <div className="flex gap-2 mb-6 border-b border-cyber-primary/30">
            <button
              onClick={() => setActiveTab('appearance')}
              className={`flex items-center gap-2 px-4 py-2 font-mono transition-colors ${
                activeTab === 'appearance'
                  ? 'text-cyber-primary border-b-2 border-cyber-primary'
                  : 'text-cyber-secondary hover:text-cyber-primary'
              }`}
            >
              <Palette className="w-4 h-4" />
              Appearance
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={`flex items-center gap-2 px-4 py-2 font-mono transition-colors ${
                activeTab === 'integrations'
                  ? 'text-cyber-primary border-b-2 border-cyber-primary'
                  : 'text-cyber-secondary hover:text-cyber-primary'
              }`}
            >
              <Key className="w-4 h-4" />
              API Keys
            </button>
          </div>

          {activeTab === 'appearance' ? (
            <>
              <section className="mb-8">
                <h3 className="text-sm font-bold text-cyber-secondary uppercase tracking-wider mb-4 font-mono">
                  COLOR THEME
                </h3>
                <div className="space-y-2">
                  {themes.map((theme) => {
                    const Icon = theme.icon;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => setMode(theme.id)}
                        className={`w-full p-4 rounded border-2 transition-all text-left ${
                          mode === theme.id
                            ? 'border-cyber-primary bg-cyber-primary/20'
                            : 'border-cyber-primary/30 hover:border-cyber-primary/60 hover:bg-cyber-primary/10'
                        }`}
                        aria-pressed={mode === theme.id}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="w-5 h-5 text-cyber-primary mt-0.5" />
                          <div>
                            <div className="font-bold text-cyber-primary font-mono">{theme.name}</div>
                            <div className="text-sm text-cyber-secondary font-mono">{theme.desc}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-cyber-secondary uppercase tracking-wider mb-4 font-mono">
                  ACCESSIBILITY
                </h3>
                <label className="flex items-start gap-3 p-4 rounded border-2 border-cyber-primary/30 hover:border-cyber-primary/60 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={reduceMotion}
                    onChange={(e) => setReduceMotion(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-cyber-primary"
                    aria-describedby="motion-desc"
                  />
                  <div>
                    <div className="font-bold text-cyber-primary font-mono">Reduce Motion</div>
                    <div id="motion-desc" className="text-sm text-cyber-secondary font-mono">
                      Minimize animations and effects
                    </div>
                  </div>
                </label>
              </section>
            </>
          ) : (
            <APIKeyManagement />
          )}
        </div>
      </div>
    </>
  );
}
