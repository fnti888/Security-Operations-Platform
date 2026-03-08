import { useState, useEffect } from 'react';
import { Search, X, FileText, AlertTriangle, Activity, Database } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SearchResult {
  id: string;
  type: 'incident' | 'threat' | 'log' | 'evidence';
  title: string;
  description: string;
  date: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string, id?: string) => void;
}

export function GlobalSearch({ isOpen, onClose, onNavigate }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const searchResults: SearchResult[] = [];

        const { data: incidents } = await supabase
          .from('incidents')
          .select('id, title, description, status, created_at')
          .ilike('title', `%${query}%`)
          .limit(5);

        if (incidents) {
          searchResults.push(
            ...incidents.map((inc) => ({
              id: inc.id,
              type: 'incident' as const,
              title: inc.title,
              description: inc.description || inc.status,
              date: new Date(inc.created_at).toLocaleString(),
            }))
          );
        }

        const { data: threats } = await supabase
          .from('threats')
          .select('id, name, description, severity, detected_at')
          .ilike('name', `%${query}%`)
          .limit(5);

        if (threats) {
          searchResults.push(
            ...threats.map((threat) => ({
              id: threat.id,
              type: 'threat' as const,
              title: threat.name,
              description: `${threat.severity} - ${threat.description}`,
              date: new Date(threat.detected_at).toLocaleString(),
            }))
          );
        }

        const { data: logs } = await supabase
          .from('terminal_logs')
          .select('id, message, log_type, created_at')
          .ilike('message', `%${query}%`)
          .limit(5);

        if (logs) {
          searchResults.push(
            ...logs.map((log) => ({
              id: log.id,
              type: 'log' as const,
              title: log.message,
              description: log.log_type,
              date: new Date(log.created_at).toLocaleString(),
            }))
          );
        }

        setResults(searchResults);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleResultClick(results[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'incident':
        onNavigate('incidents', result.id);
        break;
      case 'threat':
        onNavigate('threats', result.id);
        break;
      case 'log':
        onNavigate('dashboard');
        break;
      case 'evidence':
        onNavigate('evidence', result.id);
        break;
    }
    onClose();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'incident':
        return <AlertTriangle className="w-4 h-4" />;
      case 'threat':
        return <Activity className="w-4 h-4" />;
      case 'log':
        return <FileText className="w-4 h-4" />;
      case 'evidence':
        return <Database className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/80 z-50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-cyber-bg border-2 border-cyber-primary z-50 rounded shadow-2xl shadow-cyber-primary/20 animate-slide-up"
        role="dialog"
        aria-labelledby="search-title"
        aria-modal="true"
      >
        <div className="p-4 border-b-2 border-cyber-primary/30">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-cyber-primary" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SEARCH INCIDENTS, THREATS, LOGS..."
              className="flex-1 bg-transparent text-cyber-primary placeholder-cyber-secondary/50 outline-none font-mono text-sm"
              autoFocus
              aria-label="Search"
            />
            <button
              onClick={onClose}
              className="p-1 hover:bg-cyber-primary/20 rounded transition-colors"
              aria-label="Close search"
            >
              <X className="w-5 h-5 text-cyber-primary" />
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-8 text-center">
              <div className="text-cyber-secondary font-mono text-sm animate-pulse">
                SCANNING DATABASE...
              </div>
            </div>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="p-8 text-center">
              <div className="text-cyber-secondary font-mono text-sm">
                NO RESULTS FOUND
              </div>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className={`w-full px-4 py-3 flex items-start gap-3 transition-colors text-left ${
                    index === selectedIndex
                      ? 'bg-cyber-primary/20 border-l-2 border-cyber-primary'
                      : 'hover:bg-cyber-primary/10 border-l-2 border-transparent'
                  }`}
                >
                  <div className="text-cyber-primary mt-1">{getIcon(result.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-cyber-primary font-mono text-xs uppercase font-bold">
                        {result.type}
                      </span>
                      <span className="text-cyber-secondary font-mono text-xs">
                        {result.date}
                      </span>
                    </div>
                    <div className="text-cyber-primary font-mono text-sm font-bold truncate">
                      {result.title}
                    </div>
                    <div className="text-cyber-secondary font-mono text-xs truncate">
                      {result.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="p-8 text-center">
              <div className="text-cyber-secondary font-mono text-sm">
                TYPE AT LEAST 2 CHARACTERS TO SEARCH
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t-2 border-cyber-primary/30 bg-cyber-primary/5">
          <div className="flex items-center justify-between text-cyber-secondary font-mono text-xs">
            <span>USE ↑↓ TO NAVIGATE</span>
            <span>ENTER TO SELECT</span>
            <span>ESC TO CLOSE</span>
          </div>
        </div>
      </div>
    </>
  );
}
