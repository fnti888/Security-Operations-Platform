import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Plus, Search, Filter, Eye, Lock, Calendar, Tag, Award, ExternalLink } from 'lucide-react';

interface PortfolioEntry {
  id: string;
  title: string;
  entry_type: string;
  description: string;
  findings: string;
  tools_used: string[];
  mitre_techniques: string[];
  severity: string;
  date_analyzed: string;
  evidence_links: string[];
  is_public: boolean;
  tags: string[];
  created_at: string;
}

export function SecurityPortfolio() {
  const [entries, setEntries] = useState<PortfolioEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<PortfolioEntry | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    entry_type: 'pcap_analysis',
    description: '',
    findings: '',
    tools_used: '',
    mitre_techniques: '',
    severity: 'medium',
    evidence_links: '',
    is_public: false,
    tags: ''
  });

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('portfolio_entries')
        .select('*')
        .order('date_analyzed', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching portfolio entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('portfolio_entries').insert([{
        user_id: user.id,
        title: formData.title,
        entry_type: formData.entry_type,
        description: formData.description,
        findings: formData.findings,
        tools_used: formData.tools_used.split(',').map(t => t.trim()).filter(t => t),
        mitre_techniques: formData.mitre_techniques.split(',').map(t => t.trim()).filter(t => t),
        severity: formData.severity,
        evidence_links: formData.evidence_links.split(',').map(l => l.trim()).filter(l => l),
        is_public: formData.is_public,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t)
      }]);

      if (error) throw error;

      setShowAddForm(false);
      setFormData({
        title: '',
        entry_type: 'pcap_analysis',
        description: '',
        findings: '',
        tools_used: '',
        mitre_techniques: '',
        severity: 'medium',
        evidence_links: '',
        is_public: false,
        tags: ''
      });
      fetchEntries();
    } catch (error) {
      console.error('Error adding entry:', error);
    }
  };

  const filteredEntries = entries.filter(entry => {
    const matchesType = filterType === 'all' || entry.entry_type === filterType;
    const matchesSearch = entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-green-400">Loading portfolio...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-green-400 flex items-center gap-2">
            <Award className="w-8 h-8" />
            Security Analysis Portfolio
          </h2>
          <p className="text-gray-400 mt-1">Document your real security work and analysis</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-green-500 text-black rounded-lg hover:bg-green-400 transition-colors flex items-center gap-2 font-semibold"
        >
          <Plus className="w-4 h-4" />
          Add Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search portfolio entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="pcap_analysis">PCAP Analysis</option>
            <option value="log_analysis">Log Analysis</option>
            <option value="malware_analysis">Malware Analysis</option>
            <option value="threat_hunt">Threat Hunting</option>
            <option value="incident_response">Incident Response</option>
            <option value="vulnerability_assessment">Vulnerability Assessment</option>
          </select>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-green-500 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-green-400 mb-4">Add Portfolio Entry</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                  placeholder="E.g., Emotet Malware Traffic Analysis"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Entry Type</label>
                <select
                  value={formData.entry_type}
                  onChange={(e) => setFormData({ ...formData, entry_type: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                >
                  <option value="pcap_analysis">PCAP Analysis</option>
                  <option value="log_analysis">Log Analysis</option>
                  <option value="malware_analysis">Malware Analysis</option>
                  <option value="threat_hunt">Threat Hunting</option>
                  <option value="incident_response">Incident Response</option>
                  <option value="vulnerability_assessment">Vulnerability Assessment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                  rows={3}
                  placeholder="Brief description of the analysis scenario..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Findings</label>
                <textarea
                  required
                  value={formData.findings}
                  onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                  rows={5}
                  placeholder="Detailed findings, IOCs discovered, attack patterns identified..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tools Used</label>
                  <input
                    type="text"
                    value={formData.tools_used}
                    onChange={(e) => setFormData({ ...formData, tools_used: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                    placeholder="Wireshark, Splunk, etc. (comma-separated)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Severity</label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="info">Info</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">MITRE ATT&CK Techniques</label>
                <input
                  type="text"
                  value={formData.mitre_techniques}
                  onChange={(e) => setFormData({ ...formData, mitre_techniques: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                  placeholder="T1566, T1059, etc. (comma-separated)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Evidence Links</label>
                <input
                  type="text"
                  value={formData.evidence_links}
                  onChange={(e) => setFormData({ ...formData, evidence_links: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                  placeholder="GitHub links, screenshots, etc. (comma-separated)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tags</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                  placeholder="malware, phishing, botnet, etc. (comma-separated)"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={formData.is_public}
                  onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_public" className="text-sm text-gray-300">
                  Make this entry public (visible to employers/recruiters)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-500 text-black rounded-lg hover:bg-green-400 transition-colors font-semibold"
                >
                  Add Entry
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-green-500 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-green-400">{selectedEntry.title}</h3>
                <div className="flex items-center gap-4 mt-2">
                  <span className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded">
                    {getTypeLabel(selectedEntry.entry_type)}
                  </span>
                  <span className={`px-2 py-1 bg-gray-800 text-xs rounded ${getSeverityColor(selectedEntry.severity)}`}>
                    {selectedEntry.severity.toUpperCase()}
                  </span>
                  {selectedEntry.is_public ? (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <Eye className="w-3 h-3" /> Public
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Lock className="w-3 h-3" /> Private
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-2">DESCRIPTION</h4>
                <p className="text-white">{selectedEntry.description}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-2">FINDINGS</h4>
                <div className="text-white whitespace-pre-wrap">{selectedEntry.findings}</div>
              </div>

              {selectedEntry.tools_used.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">TOOLS USED</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedEntry.tools_used.map((tool, idx) => (
                      <span key={idx} className="px-3 py-1 bg-gray-800 text-green-400 rounded text-sm">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedEntry.mitre_techniques.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">MITRE ATT&CK TECHNIQUES</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedEntry.mitre_techniques.map((technique, idx) => (
                      <span key={idx} className="px-3 py-1 bg-red-900 bg-opacity-30 text-red-400 rounded text-sm font-mono">
                        {technique}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedEntry.evidence_links.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">EVIDENCE & LINKS</h4>
                  <div className="space-y-2">
                    {selectedEntry.evidence_links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedEntry.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">TAGS</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedEntry.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-400 pt-4 border-t border-gray-800">
                <Calendar className="w-4 h-4" />
                Analyzed: {new Date(selectedEntry.date_analyzed).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filteredEntries.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No Portfolio Entries Yet</h3>
            <p className="text-gray-500 mb-6">Start documenting your security analysis work to showcase your skills</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-green-500 text-black rounded-lg hover:bg-green-400 transition-colors font-semibold"
            >
              Add Your First Analysis
            </button>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => setSelectedEntry(entry)}
              className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-green-500 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-400 mb-1">{entry.title}</h3>
                  <p className="text-gray-400 text-sm line-clamp-2">{entry.description}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {entry.is_public ? (
                    <Eye className="w-4 h-4 text-green-400" />
                  ) : (
                    <Lock className="w-4 h-4 text-gray-500" />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded">
                  {getTypeLabel(entry.entry_type)}
                </span>
                <span className={`px-2 py-1 bg-gray-800 text-xs rounded ${getSeverityColor(entry.severity)}`}>
                  {entry.severity.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(entry.date_analyzed).toLocaleDateString()}
                </span>
              </div>

              {entry.tools_used.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {entry.tools_used.slice(0, 5).map((tool, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-800 text-green-400 rounded text-xs">
                      {tool}
                    </span>
                  ))}
                  {entry.tools_used.length > 5 && (
                    <span className="px-2 py-1 bg-gray-800 text-gray-400 rounded text-xs">
                      +{entry.tools_used.length - 5} more
                    </span>
                  )}
                </div>
              )}

              {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {entry.tags.slice(0, 4).map((tag, idx) => (
                    <span key={idx} className="text-xs text-gray-500">
                      <Tag className="w-3 h-3 inline mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
