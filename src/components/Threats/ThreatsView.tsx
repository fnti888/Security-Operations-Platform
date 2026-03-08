import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, Plus, Search, Shield, Download, FileText, X, CheckSquare, Square, RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react';
import { exportToJSON, exportToCSV } from '../../lib/exportUtils';
import { mitreMappings } from '../../lib/mitreMappings';

interface Threat {
  id: string;
  name: string;
  description: string;
  threat_level: 'critical' | 'high' | 'medium' | 'low';
  threat_type: string;
  source: string;
  indicators: string | null;
  status: 'active' | 'mitigated' | 'monitoring';
  detected_at: string;
  created_at: string;
}

export function ThreatsView() {
  const [threats, setThreats] = useState<Threat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedThreats, setSelectedThreats] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'level'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchThreats();

    const channel = supabase
      .channel('threats-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'threats' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setThreats((prev) => [payload.new as Threat, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setThreats((prev) =>
              prev.map((threat) =>
                threat.id === (payload.new as Threat).id ? (payload.new as Threat) : threat
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setThreats((prev) => prev.filter((threat) => threat.id !== (payload.old as Threat).id));
          }
        }
      )
      .subscribe();

    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowCreateModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  const handleExportJSON = () => {
    exportToJSON(filteredThreats, `threats-${new Date().toISOString().split('T')[0]}.json`);
    setShowExportMenu(false);
  };

  const handleExportCSV = () => {
    exportToCSV(filteredThreats as Record<string, unknown>[], `threats-${new Date().toISOString().split('T')[0]}.csv`);
    setShowExportMenu(false);
  };

  const fetchThreats = async () => {
    try {
      const { data, error } = await supabase
        .from('threats')
        .select('*')
        .order('detected_at', { ascending: false });

      if (error) throw error;
      setThreats(data || []);
    } catch (error) {
      console.error('Error fetching threats:', error);
    } finally {
      setLoading(false);
    }
  };

  const threatTypes = Array.from(new Set(threats.map((t) => t.threat_type))).filter(Boolean);

  const handleBulkStatusUpdate = async (newStatus: string) => {
    try {
      const updates = Array.from(selectedThreats).map((id) =>
        supabase.from('threats').update({ status: newStatus }).eq('id', id)
      );
      await Promise.all(updates);
      setSelectedThreats(new Set());
      setShowBulkActions(false);
      fetchThreats();
    } catch (error) {
      console.error('Error updating threats:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedThreats.size === filteredThreats.length) {
      setSelectedThreats(new Set());
    } else {
      setSelectedThreats(new Set(filteredThreats.map((t) => t.id)));
    }
  };

  const handleSelectThreat = (id: string) => {
    const newSelected = new Set(selectedThreats);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedThreats(newSelected);
  };

  const getThreatLevelPriority = (level: string) => {
    switch (level) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  };

  const filteredThreats = threats.filter((threat) => {
    const matchesSearch = threat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      threat.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = filterLevel === 'all' || threat.threat_level === filterLevel;
    const matchesStatus = filterStatus === 'all' || threat.status === filterStatus;
    const matchesType = filterType === 'all' || threat.threat_type === filterType;
    return matchesSearch && matchesLevel && matchesStatus && matchesType;
  }).sort((a, b) => {
    if (sortBy === 'date') {
      return sortOrder === 'desc'
        ? new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
        : new Date(a.detected_at).getTime() - new Date(b.detected_at).getTime();
    } else {
      return sortOrder === 'desc'
        ? getThreatLevelPriority(b.threat_level) - getThreatLevelPriority(a.threat_level)
        : getThreatLevelPriority(a.threat_level) - getThreatLevelPriority(b.threat_level);
    }
  });

  const threatStats = {
    total: threats.length,
    active: threats.filter((t) => t.status === 'active').length,
    mitigated: threats.filter((t) => t.status === 'mitigated').length,
    critical: threats.filter((t) => t.threat_level === 'critical').length,
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'text-red-400 bg-red-900/20 border-red-700';
      case 'high':
        return 'text-orange-400 bg-orange-900/20 border-orange-700';
      case 'medium':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
      case 'low':
        return 'text-blue-400 bg-blue-900/20 border-blue-700';
      default:
        return 'text-slate-400 bg-slate-900/20 border-slate-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-red-400 bg-red-900/20 border-red-700';
      case 'monitoring':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
      case 'mitigated':
        return 'text-green-400 bg-green-900/20 border-green-700';
      default:
        return 'text-slate-400 bg-slate-900/20 border-slate-700';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="p-4 md:p-8 forensic-grid">
      <div className="hacker-border rounded p-4 mb-6 bg-black/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold neon-green mb-1 font-mono">
              ► THREAT INTELLIGENCE DATABASE
            </h1>
            <p className="text-green-500 font-mono text-xs">
              REAL-TIME THREAT MONITORING • CLASSIFICATION: RESTRICTED
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="cyber-button-primary px-4 py-2 font-mono flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                EXPORT
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 hacker-border rounded bg-black/95 shadow-lg z-10 min-w-[150px]">
                  <button
                    onClick={handleExportJSON}
                    className="w-full px-4 py-2 text-left text-cyber-primary hover:bg-green-900/20 font-mono text-xs flex items-center gap-2"
                  >
                    <FileText className="w-3 h-3" />
                    JSON
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="w-full px-4 py-2 text-left text-cyber-primary hover:bg-green-900/20 font-mono text-xs flex items-center gap-2"
                  >
                    <FileText className="w-3 h-3" />
                    CSV
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="cyber-button-primary px-4 py-2 font-mono flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              REPORT THREAT
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="hacker-border rounded bg-black/80 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-800 text-xs font-mono">TOTAL THREATS</span>
            <Activity className="w-4 h-4 text-cyber-primary" />
          </div>
          <div className="text-2xl font-bold text-cyber-primary font-mono">{threatStats.total}</div>
        </div>
        <div className="hacker-border rounded bg-red-900/20 p-4 border-red-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-red-800 text-xs font-mono">ACTIVE THREATS</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 font-mono">{threatStats.active}</div>
        </div>
        <div className="hacker-border rounded bg-green-900/20 p-4 border-green-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-800 text-xs font-mono">MITIGATED</span>
            <Shield className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400 font-mono">{threatStats.mitigated}</div>
        </div>
        <div className="hacker-border rounded bg-red-900/20 p-4 border-red-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-red-800 text-xs font-mono">CRITICAL LEVEL</span>
            <TrendingUp className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 font-mono">{threatStats.critical}</div>
        </div>
      </div>

      {selectedThreats.size > 0 && (
        <div className="hacker-border rounded bg-blue-900/20 border-blue-800/50 mb-6 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-blue-400 font-medium font-mono">{selectedThreats.size} THREAT(S) SELECTED</span>
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="px-3 py-1 bg-blue-900/40 border border-blue-700 hover:bg-blue-900/60 text-blue-400 rounded text-sm transition-colors font-mono"
              >
                BULK ACTIONS
              </button>
              {showBulkActions && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkStatusUpdate('monitoring')}
                    className="px-3 py-1 bg-yellow-900/40 border border-yellow-700 hover:bg-yellow-900/60 text-yellow-400 rounded text-sm transition-colors font-mono"
                  >
                    SET MONITORING
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('mitigated')}
                    className="px-3 py-1 bg-green-900/40 border border-green-700 hover:bg-green-900/60 text-green-400 rounded text-sm transition-colors font-mono"
                  >
                    MARK MITIGATED
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedThreats(new Set())}
              className="text-blue-400 hover:text-blue-300 text-sm font-mono"
            >
              CLEAR
            </button>
          </div>
        </div>
      )}

      <div className="hacker-border rounded bg-black/80 mb-6 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600" />
            <input
              type="text"
              placeholder="SEARCH THREATS DATABASE..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black border-2 border-green-900/50 rounded text-cyber-primary placeholder-green-900 focus:outline-none focus:border-cyber-primary font-mono text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-3 py-2 bg-black border-2 border-green-900/50 rounded text-cyber-primary focus:outline-none focus:border-cyber-primary font-mono text-xs"
            >
              <option value="all">ALL LEVELS</option>
              <option value="critical">CRITICAL</option>
              <option value="high">HIGH</option>
              <option value="medium">MEDIUM</option>
              <option value="low">LOW</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-black border-2 border-green-900/50 rounded text-cyber-primary focus:outline-none focus:border-cyber-primary font-mono text-xs"
            >
              <option value="all">ALL STATUS</option>
              <option value="active">ACTIVE</option>
              <option value="monitoring">MONITORING</option>
              <option value="mitigated">MITIGATED</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-black border-2 border-green-900/50 rounded text-cyber-primary focus:outline-none focus:border-cyber-primary font-mono text-xs"
            >
              <option value="all">ALL TYPES</option>
              {threatTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-green-800 font-mono">SORT:</span>
          <button
            onClick={() => setSortBy('date')}
            className={`px-3 py-1 rounded font-mono ${sortBy === 'date' ? 'bg-green-900/40 border border-cyber-primary text-cyber-primary' : 'bg-black border border-green-900/50 text-green-800 hover:text-cyber-primary'}`}
          >
            DATE
          </button>
          <button
            onClick={() => setSortBy('level')}
            className={`px-3 py-1 rounded font-mono ${sortBy === 'level' ? 'bg-green-900/40 border border-cyber-primary text-cyber-primary' : 'bg-black border border-green-900/50 text-green-800 hover:text-cyber-primary'}`}
          >
            LEVEL
          </button>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-1 rounded bg-black border border-green-900/50 text-green-800 hover:text-cyber-primary flex items-center gap-1 font-mono"
          >
            <RefreshCw className="w-3 h-3" />
            {sortOrder === 'asc' ? 'ASC' : 'DESC'}
          </button>
          <div className="flex-1"></div>
          <button
            onClick={handleSelectAll}
            className="text-cyber-primary hover:text-green-400 flex items-center gap-2 font-mono"
          >
            {selectedThreats.size === filteredThreats.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            SELECT ALL ({filteredThreats.length})
          </button>
        </div>
      </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-cyber-secondary font-mono">▶ LOADING THREAT DATA...</div>
        </div>
      ) : filteredThreats.length === 0 ? (
        <div className="hacker-border rounded bg-black/80 p-12 text-center">
          <Shield className="w-12 h-12 text-green-900 mx-auto mb-4" />
          <p className="text-cyber-secondary font-mono">NO THREATS DETECTED</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredThreats.map((threat) => (
            <div
              key={threat.id}
              className="hacker-border rounded bg-black/80 p-4 hover:bg-black/60 transition-colors animate-fade-in"
            >
              <div className="flex items-start gap-3">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectThreat(threat.id);
                  }}
                  className="cursor-pointer mt-1"
                >
                  {selectedThreats.has(threat.id) ? (
                    <CheckSquare className="w-5 h-5 text-cyber-primary" />
                  ) : (
                    <Square className="w-5 h-5 text-green-900 hover:text-green-700" />
                  )}
                </div>
                <div
                  onClick={() => setSelectedThreat(threat)}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-start gap-3 mb-3">
                <div className="bg-red-900/20 p-2 rounded border border-red-800/50">
                  <Activity className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-cyber-primary font-semibold text-base mb-2 font-mono">{threat.name}</h3>
                  <p className="text-cyber-secondary text-xs mb-3 font-mono">{threat.description}</p>

                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-green-800">TYPE:</span>
                      <span className="text-green-500">{threat.threat_type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-green-800">SOURCE:</span>
                      <span className="text-green-500">{threat.source}</span>
                    </div>
                    {threat.indicators && (
                      <div className="flex items-start gap-2 text-xs font-mono">
                        <span className="text-green-800">IOCs:</span>
                        <span className="text-green-500 flex-1">{threat.indicators}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded border font-medium font-mono ${getThreatLevelColor(
                        threat.threat_level
                      )}`}
                    >
                      {threat.threat_level.toUpperCase()}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded border font-medium font-mono ${getStatusColor(
                        threat.status
                      )}`}
                    >
                      {threat.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
                  <div className="text-xs text-green-800 border-t border-green-900/50 pt-2 font-mono">
                    DETECTED: {formatDate(threat.detected_at)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateThreatModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchThreats();
          }}
        />
      )}

      {selectedThreat && (
        <ThreatDetailsModal
          threat={selectedThreat}
          onClose={() => setSelectedThreat(null)}
        />
      )}
    </div>
  );
}

interface CreateThreatModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateThreatModal({ onClose, onSuccess }: CreateThreatModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    threat_level: 'medium' as 'critical' | 'high' | 'medium' | 'low',
    threat_type: '',
    source: '',
    indicators: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.from('threats').insert({
        ...formData,
        status: 'active',
        detected_at: new Date().toISOString(),
      });

      if (error) throw error;
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to report threat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="hacker-border rounded bg-black/95 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 md:p-6 border-b-2 border-cyber-border sticky top-0 bg-black/95">
          <h2 className="text-xl md:text-2xl font-bold text-cyber-primary font-mono">► REPORT NEW THREAT</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          {error && (
            <div className="bg-red-900/20 border-2 border-red-700 rounded p-3 text-red-400 text-xs font-mono">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-cyber-secondary mb-2 font-mono">THREAT NAME</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 bg-black border-2 border-green-900/50 rounded text-cyber-primary placeholder-green-900 focus:outline-none focus:border-cyber-primary font-mono text-sm"
              placeholder="e.g., RANSOMWARE_CAMPAIGN_2026"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-cyber-secondary mb-2 font-mono">DESCRIPTION</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={3}
              className="w-full px-3 py-2 bg-black border-2 border-green-900/50 rounded text-cyber-primary placeholder-green-900 focus:outline-none focus:border-cyber-primary font-mono text-sm"
              placeholder="Detailed threat analysis..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-cyber-secondary mb-2 font-mono">THREAT LEVEL</label>
              <select
                value={formData.threat_level}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    threat_level: e.target.value as 'critical' | 'high' | 'medium' | 'low',
                  })
                }
                className="w-full px-3 py-2 bg-black border-2 border-green-900/50 rounded text-cyber-primary focus:outline-none focus:border-cyber-primary font-mono text-sm"
              >
                <option value="low">LOW</option>
                <option value="medium">MEDIUM</option>
                <option value="high">HIGH</option>
                <option value="critical">CRITICAL</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-cyber-secondary mb-2 font-mono">THREAT TYPE</label>
              <input
                type="text"
                value={formData.threat_type}
                onChange={(e) => setFormData({ ...formData, threat_type: e.target.value })}
                required
                className="w-full px-3 py-2 bg-black border-2 border-green-900/50 rounded text-cyber-primary placeholder-green-900 focus:outline-none focus:border-cyber-primary font-mono text-sm"
                placeholder="MALWARE, PHISHING, etc."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-cyber-secondary mb-2 font-mono">SOURCE</label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              required
              className="w-full px-3 py-2 bg-black border-2 border-green-900/50 rounded text-cyber-primary placeholder-green-900 focus:outline-none focus:border-cyber-primary font-mono text-sm"
              placeholder="Detection source..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-cyber-secondary mb-2 font-mono">
              INDICATORS OF COMPROMISE (OPTIONAL)
            </label>
            <textarea
              value={formData.indicators}
              onChange={(e) => setFormData({ ...formData, indicators: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-black border-2 border-green-900/50 rounded text-cyber-primary placeholder-green-900 focus:outline-none focus:border-cyber-primary font-mono text-sm"
              placeholder="IPs, domains, file hashes..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 cyber-button-primary py-2 px-4 font-mono text-sm disabled:opacity-50"
            >
              {loading ? '▶ REPORTING...' : '▶ REPORT THREAT'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border-2 border-red-900/50 text-red-400 hover:bg-red-900/20 hover:border-red-700 py-2 px-4 rounded font-mono text-sm transition-colors"
            >
              CANCEL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ThreatDetailsModalProps {
  threat: Threat;
  onClose: () => void;
}

function ThreatDetailsModal({ threat, onClose }: ThreatDetailsModalProps) {
  const [status, setStatus] = useState(threat.status);
  const [updating, setUpdating] = useState(false);

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('threats')
        .update({ status: newStatus })
        .eq('id', threat.id);

      if (error) throw error;
      setStatus(newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'text-red-400 bg-red-900/20 border-red-700';
      case 'high':
        return 'text-orange-400 bg-orange-900/20 border-orange-700';
      case 'medium':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
      case 'low':
        return 'text-blue-400 bg-blue-900/20 border-blue-700';
      default:
        return 'text-slate-400 bg-slate-900/20 border-slate-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-red-400 bg-red-900/20 border-red-700';
      case 'monitoring':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
      case 'mitigated':
        return 'text-green-400 bg-green-900/20 border-green-700';
      default:
        return 'text-slate-400 bg-slate-900/20 border-slate-700';
    }
  };

  // Map threat_type to MITRE technique
  const getMitreMapping = (threatType: string) => {
    const typeUpper = threatType.toUpperCase();
    if (typeUpper.includes('BRUTE') || typeUpper.includes('CREDENTIAL')) {
      return mitreMappings.BRUTE_FORCE;
    }
    if (typeUpper.includes('SCAN') || typeUpper.includes('RECON') || typeUpper.includes('DISCOVERY')) {
      return mitreMappings.PORT_SCAN;
    }
    if (typeUpper.includes('POWERSHELL') || typeUpper.includes('SCRIPT')) {
      return mitreMappings.POWERSHELL;
    }
    if (typeUpper.includes('WEB') || typeUpper.includes('EXPLOIT') || typeUpper.includes('SQL') || typeUpper.includes('INJECTION')) {
      return mitreMappings.WEB_EXPLOIT;
    }
    if (typeUpper.includes('C2') || typeUpper.includes('BEACON') || typeUpper.includes('COMMAND') || typeUpper.includes('CONTROL')) {
      return mitreMappings.C2_BEACON;
    }
    if (typeUpper.includes('PRIV') || typeUpper.includes('ESCALATION')) {
      return mitreMappings.PRIV_ESC;
    }
    return null;
  };

  const mitreData = getMitreMapping(threat.threat_type);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="hacker-border rounded bg-black/95 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 md:p-6 border-b-2 border-cyber-border flex items-center justify-between sticky top-0 bg-black/95 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-red-900/20 p-2 rounded border border-red-800/50">
              <Activity className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-cyber-primary font-mono">► THREAT DETAILS</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-green-900/20 rounded transition-colors"
          >
            <X className="w-5 h-5 text-cyber-primary" />
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-xl font-semibold text-cyber-primary mb-3 font-mono">{threat.name}</h3>
            <p className="text-cyber-secondary leading-relaxed font-mono text-sm">{threat.description}</p>
          </div>

          {/* Key Details */}
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm font-mono">
              <span className="text-green-800 min-w-[100px]">TYPE:</span>
              <span className="text-cyber-primary">{threat.threat_type}</span>
            </div>
            <div className="flex items-start gap-2 text-sm font-mono">
              <span className="text-green-800 min-w-[100px]">SOURCE:</span>
              <span className="text-cyber-primary">{threat.source}</span>
            </div>
            {threat.indicators && (
              <div className="flex items-start gap-2 text-sm font-mono">
                <span className="text-green-800 min-w-[100px]">IOCs:</span>
                <span className="text-cyber-primary flex-1">{threat.indicators}</span>
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span
              className={`text-xs px-3 py-2 rounded border font-semibold font-mono ${getThreatLevelColor(
                threat.threat_level
              )}`}
            >
              {threat.threat_level.toUpperCase()} THREAT LEVEL
            </span>
            <span
              className={`text-xs px-3 py-2 rounded border font-semibold font-mono ${getStatusColor(
                status
              )}`}
            >
              STATUS: {status.toUpperCase()}
            </span>
          </div>

          {/* Quick Actions */}
          <div className="hacker-border rounded bg-black/60 p-4">
            <h4 className="text-cyber-primary font-semibold mb-3 font-mono">QUICK ACTIONS</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleStatusUpdate('monitoring')}
                disabled={updating || status === 'monitoring'}
                className="px-4 py-2 bg-yellow-900/40 border border-yellow-700 hover:bg-yellow-900/60 text-yellow-400 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
              >
                SET MONITORING
              </button>
              <button
                onClick={() => handleStatusUpdate('mitigated')}
                disabled={updating || status === 'mitigated'}
                className="px-4 py-2 bg-green-900/40 border border-green-700 hover:bg-green-900/60 text-green-400 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
              >
                MARK MITIGATED
              </button>
              <button
                onClick={() => handleStatusUpdate('active')}
                disabled={updating || status === 'active'}
                className="px-4 py-2 bg-red-900/40 border border-red-700 hover:bg-red-900/60 text-red-400 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
              >
                REACTIVATE
              </button>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 hacker-border rounded bg-black/60 p-4">
            <div>
              <p className="text-green-800 text-xs mb-1 font-mono">DETECTED:</p>
              <p className="text-cyber-primary font-medium font-mono text-sm">{new Date(threat.detected_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-green-800 text-xs mb-1 font-mono">CREATED:</p>
              <p className="text-cyber-primary font-medium font-mono text-sm">{new Date(threat.created_at).toLocaleString()}</p>
            </div>
          </div>

          {/* MITRE ATT&CK Information */}
          {mitreData && (
            <div className="hacker-border rounded bg-black/60 p-4 md:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-900/20 p-2 rounded border border-blue-800/50">
                  <Shield className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-cyber-primary font-mono">MITRE ATT&CK MAPPING</h3>
                  <p className="text-cyber-secondary text-xs font-mono">FRAMEWORK INTELLIGENCE</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-green-800 text-xs mb-1 font-mono">TACTIC:</p>
                  <p className="text-blue-400 font-semibold font-mono">{mitreData.mitre_tactic}</p>
                </div>

                <div>
                  <p className="text-green-800 text-xs mb-1 font-mono">TECHNIQUE:</p>
                  <p className="text-cyber-primary font-medium font-mono">
                    {mitreData.mitre_technique_id} - {mitreData.mitre_technique_name}
                  </p>
                </div>

                <div>
                  <p className="text-green-800 text-xs mb-2 font-mono">DESCRIPTION:</p>
                  <p className="text-cyber-secondary leading-relaxed font-mono text-sm">{mitreData.mitre_description}</p>
                </div>

                <div>
                  <p className="text-green-800 text-xs mb-2 font-mono">RECOMMENDED ACTIONS:</p>
                  <p className="text-cyber-secondary leading-relaxed font-mono text-sm">{mitreData.recommended_action}</p>
                </div>

                <a
                  href={`https://attack.mitre.org/techniques/${mitreData.mitre_technique_id}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-2 font-mono"
                >
                  VIEW ON MITRE ATT&CK WEBSITE →
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 border-t-2 border-cyber-border bg-black/80">
          <button
            onClick={onClose}
            className="w-full cyber-button-primary py-3 px-4 font-mono"
          >
            ◄ CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
