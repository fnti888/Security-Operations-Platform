import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search, AlertCircle, CheckCircle, Clock, XCircle, Filter, X, Shield, Download, FileText, CheckSquare, Square, User, MessageSquare, RefreshCw } from 'lucide-react';
import { mitreMappings, type AlertType, type MitreMappingData } from '../../lib/mitreMappings';
import { exportToJSON, exportToCSV } from '../../lib/exportUtils';

// Helper function to map category to AlertType and get MITRE data
const getMitreDataFromCategory = (category: string): MitreMappingData => {
  const categoryUpper = category.toUpperCase();

  let alertType: AlertType | null = null;

  if (categoryUpper.includes('BRUTE') || categoryUpper.includes('CREDENTIAL')) {
    alertType = 'BRUTE_FORCE';
  } else if (categoryUpper.includes('SCAN') || categoryUpper.includes('RECON') || categoryUpper.includes('PORT')) {
    alertType = 'PORT_SCAN';
  } else if (categoryUpper.includes('POWERSHELL') || categoryUpper.includes('SCRIPT')) {
    alertType = 'POWERSHELL';
  } else if (categoryUpper.includes('WEB') || categoryUpper.includes('EXPLOIT') || categoryUpper.includes('SQL') || categoryUpper.includes('INJECTION')) {
    alertType = 'WEB_EXPLOIT';
  } else if (categoryUpper.includes('C2') || categoryUpper.includes('BEACON') || categoryUpper.includes('COMMAND')) {
    alertType = 'C2_BEACON';
  } else if (categoryUpper.includes('PRIV') || categoryUpper.includes('ESCALATION')) {
    alertType = 'PRIV_ESC';
  }

  // Return mapped data or "Unknown" defaults
  if (alertType && mitreMappings[alertType]) {
    return mitreMappings[alertType];
  }

  return {
    mitre_tactic: 'Unknown',
    mitre_technique_id: 'Unknown',
    mitre_technique_name: 'Unknown',
    mitre_description: 'Unknown',
    recommended_action: 'Unknown'
  };
};

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  category: string;
  created_at: string;
  updated_at: string;
  mitre_tactic?: string;
  mitre_technique_id?: string;
  mitre_technique_name?: string;
  mitre_description?: string;
  recommended_action?: string;
}

export function IncidentsView() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedIncidents, setSelectedIncidents] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'severity' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchIncidents();

    const channel = supabase
      .channel('incidents-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setIncidents((prev) => [payload.new as Incident, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setIncidents((prev) =>
              prev.map((inc) => (inc.id === (payload.new as Incident).id ? (payload.new as Incident) : inc))
            );
          } else if (payload.eventType === 'DELETE') {
            setIncidents((prev) => prev.filter((inc) => inc.id !== (payload.old as Incident).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchIncidents = async () => {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIncidents(data || []);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(incidents.map((i) => i.category))).filter(Boolean);

  const handleBulkStatusUpdate = async (newStatus: string) => {
    try {
      const updates = Array.from(selectedIncidents).map((id) =>
        supabase.from('incidents').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id)
      );
      await Promise.all(updates);
      setSelectedIncidents(new Set());
      setShowBulkActions(false);
      fetchIncidents();
    } catch (error) {
      console.error('Error updating incidents:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedIncidents.size === filteredIncidents.length) {
      setSelectedIncidents(new Set());
    } else {
      setSelectedIncidents(new Set(filteredIncidents.map((i) => i.id)));
    }
  };

  const handleSelectIncident = (id: string) => {
    const newSelected = new Set(selectedIncidents);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIncidents(newSelected);
  };

  const handleExportJSON = () => {
    exportToJSON(filteredIncidents, `incidents-${new Date().toISOString().split('T')[0]}.json`);
    setShowExportMenu(false);
  };

  const handleExportCSV = () => {
    exportToCSV(filteredIncidents as Record<string, unknown>[], `incidents-${new Date().toISOString().split('T')[0]}.csv`);
    setShowExportMenu(false);
  };

  const getSeverityPriority = (severity: string) => {
    switch (severity) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  };

  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch = incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = filterSeverity === 'all' || incident.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || incident.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || incident.category === filterCategory;
    return matchesSearch && matchesSeverity && matchesStatus && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === 'date') {
      return sortOrder === 'desc'
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortBy === 'severity') {
      return sortOrder === 'desc'
        ? getSeverityPriority(b.severity) - getSeverityPriority(a.severity)
        : getSeverityPriority(a.severity) - getSeverityPriority(b.severity);
    } else {
      return sortOrder === 'desc' ? b.status.localeCompare(a.status) : a.status.localeCompare(b.status);
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'investigating':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'closed':
        return <XCircle className="w-4 h-4 text-slate-400" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Incident Management</h1>
          <p className="text-slate-400">Track and manage security incidents</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
              Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10 min-w-[150px]">
                <button
                  onClick={handleExportJSON}
                  className="w-full px-4 py-2 text-left text-white hover:bg-slate-700 flex items-center gap-2 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  JSON
                </button>
                <button
                  onClick={handleExportCSV}
                  className="w-full px-4 py-2 text-left text-white hover:bg-slate-700 flex items-center gap-2 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  CSV
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Incident
          </button>
        </div>
      </div>

      {selectedIncidents.size > 0 && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg mb-6 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-blue-400 font-medium">{selectedIncidents.size} incident(s) selected</span>
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
              >
                Bulk Actions
              </button>
              {showBulkActions && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkStatusUpdate('investigating')}
                    className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm transition-colors"
                  >
                    Mark Investigating
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('resolved')}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                  >
                    Mark Resolved
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('closed')}
                    className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded text-sm transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedIncidents(new Set())}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-lg border border-slate-700 mb-6 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search incidents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">Sort by:</span>
            <button
              onClick={() => setSortBy('date')}
              className={`px-3 py-1 rounded ${sortBy === 'date' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-700'}`}
            >
              Date
            </button>
            <button
              onClick={() => setSortBy('severity')}
              className={`px-3 py-1 rounded ${sortBy === 'severity' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-700'}`}
            >
              Severity
            </button>
            <button
              onClick={() => setSortBy('status')}
              className={`px-3 py-1 rounded ${sortBy === 'status' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-700'}`}
            >
              Status
            </button>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-1 rounded bg-slate-900 text-slate-400 hover:bg-slate-700 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </button>
            <div className="flex-1"></div>
            <button
              onClick={handleSelectAll}
              className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
            >
              {selectedIncidents.size === filteredIncidents.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              Select All ({filteredIncidents.length})
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-400">Loading incidents...</div>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No incidents found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIncidents.map((incident) => (
            <div
              key={incident.id}
              className="bg-slate-800 rounded-lg border border-slate-700 p-6 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectIncident(incident.id);
                  }}
                  className="cursor-pointer mt-1"
                >
                  {selectedIncidents.has(incident.id) ? (
                    <CheckSquare className="w-5 h-5 text-blue-400" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                  )}
                </div>
                <div
                  onClick={() => setSelectedIncident(incident)}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(incident.status)}
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-lg mb-2">{incident.title}</h3>
                        <p className="text-slate-400 text-sm mb-3">{incident.description}</p>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`text-xs px-3 py-1 rounded-full border font-medium ${getSeverityColor(
                              incident.severity
                            )}`}
                          >
                            {incident.severity.toUpperCase()}
                          </span>
                          <span className="text-xs px-3 py-1 rounded-full border border-slate-700 text-slate-400 bg-slate-900/50">
                            {incident.category}
                          </span>
                          <span className="text-xs px-3 py-1 rounded-full border border-slate-700 text-slate-400 bg-slate-900/50 capitalize">
                            {incident.status}
                          </span>
                          {incident.mitre_technique_id && incident.mitre_technique_id !== 'Unknown' && (
                            <span className="text-xs px-3 py-1 rounded-full border border-blue-700 text-blue-400 bg-blue-900/20 flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              {incident.mitre_technique_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 border-t border-slate-700 pt-4">
                    Created: {formatDate(incident.created_at)} • Updated: {formatDate(incident.updated_at)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateIncidentModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchIncidents();
          }}
          userId={user?.id || ''}
        />
      )}

      {selectedIncident && (
        <IncidentDetailsModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </div>
  );
}

interface CreateIncidentModalProps {
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

function CreateIncidentModal({ onClose, onSuccess, userId }: CreateIncidentModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium' as 'critical' | 'high' | 'medium' | 'low',
    category: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Automatically attach MITRE fields based on category
      const mitreData = getMitreDataFromCategory(formData.category);

      const { error } = await supabase.from('incidents').insert({
        ...formData,
        status: 'open',
        created_by: userId,
        assigned_to: null,
        resolved_at: null,
        mitre_tactic: mitreData.mitre_tactic,
        mitre_technique_id: mitreData.mitre_technique_id,
        mitre_technique_name: mitreData.mitre_technique_name,
        mitre_description: mitreData.mitre_description,
        recommended_action: mitreData.recommended_action,
      });

      if (error) throw error;
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create incident');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-2xl w-full">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">Create New Incident</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of the incident"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Detailed description of the incident"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Severity</label>
              <select
                value={formData.severity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    severity: e.target.value as 'critical' | 'high' | 'medium' | 'low',
                  })
                }
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Malware, Phishing, DDoS"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Incident'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface IncidentDetailsModalProps {
  incident: Incident;
  onClose: () => void;
}

function IncidentDetailsModal({ incident, onClose }: IncidentDetailsModalProps) {
  const [status, setStatus] = useState(incident.status);
  const [updating, setUpdating] = useState(false);

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('incidents')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...(newStatus === 'resolved' ? { resolved_at: new Date().toISOString() } : {})
        })
        .eq('id', incident.id);

      if (error) throw error;
      setStatus(newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'investigating':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'resolved':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'closed':
        return <XCircle className="w-5 h-5 text-slate-400" />;
      default:
        return null;
    }
  };

  // Use stored MITRE data from incident, or compute if not available (for legacy incidents)
  const mitreData = incident.mitre_tactic && incident.mitre_tactic !== 'Unknown'
    ? {
        mitre_tactic: incident.mitre_tactic || 'Unknown',
        mitre_technique_id: incident.mitre_technique_id || 'Unknown',
        mitre_technique_name: incident.mitre_technique_name || 'Unknown',
        mitre_description: incident.mitre_description || 'Unknown',
        recommended_action: incident.recommended_action || 'Unknown'
      }
    : null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
          <div className="flex items-center gap-3">
            {getStatusIcon(incident.status)}
            <h2 className="text-2xl font-bold text-white">Incident Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-xl font-semibold text-white mb-3">{incident.title}</h3>
            <p className="text-slate-300 leading-relaxed">{incident.description}</p>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span
              className={`text-sm px-4 py-2 rounded-lg border font-semibold ${getSeverityColor(
                incident.severity
              )}`}
            >
              {incident.severity.toUpperCase()} SEVERITY
            </span>
            <span className="text-sm px-4 py-2 rounded-lg border border-slate-700 text-slate-300 bg-slate-900/50 font-semibold">
              {incident.category}
            </span>
            <span className="text-sm px-4 py-2 rounded-lg border border-slate-700 text-slate-300 bg-slate-900/50 font-semibold capitalize">
              Status: {status}
            </span>
          </div>

          {/* Quick Actions */}
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <h4 className="text-white font-semibold mb-3">Quick Actions</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleStatusUpdate('investigating')}
                disabled={updating || status === 'investigating'}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mark as Investigating
              </button>
              <button
                onClick={() => handleStatusUpdate('resolved')}
                disabled={updating || status === 'resolved'}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mark as Resolved
              </button>
              <button
                onClick={() => handleStatusUpdate('closed')}
                disabled={updating || status === 'closed'}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Close Incident
              </button>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 bg-slate-900 rounded-lg p-4 border border-slate-700">
            <div>
              <p className="text-slate-500 text-sm mb-1">Created</p>
              <p className="text-white font-medium">{new Date(incident.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-500 text-sm mb-1">Last Updated</p>
              <p className="text-white font-medium">{new Date(incident.updated_at).toLocaleString()}</p>
            </div>
          </div>

          {/* MITRE ATT&CK Information */}
          {mitreData && (
            <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-900/20 p-2 rounded border border-blue-800/50">
                  <Shield className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">MITRE ATT&CK Mapping</h3>
                  <p className="text-slate-400 text-sm">Framework Intelligence</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-slate-500 text-sm mb-1">Tactic</p>
                  <p className="text-blue-400 font-semibold">{mitreData.mitre_tactic}</p>
                </div>

                <div>
                  <p className="text-slate-500 text-sm mb-1">Technique</p>
                  <p className="text-white font-medium">
                    {mitreData.mitre_technique_id} - {mitreData.mitre_technique_name}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500 text-sm mb-2">Description</p>
                  <p className="text-slate-300 leading-relaxed">{mitreData.mitre_description}</p>
                </div>

                <div>
                  <p className="text-slate-500 text-sm mb-2">Recommended Actions</p>
                  <p className="text-slate-300 leading-relaxed">{mitreData.recommended_action}</p>
                </div>

                <a
                  href={`https://attack.mitre.org/techniques/${mitreData.mitre_technique_id}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-2"
                >
                  View on MITRE ATT&CK website →
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-700 bg-slate-900/50">
          <button
            onClick={onClose}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
