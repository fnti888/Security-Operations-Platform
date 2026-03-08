import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Package, Shield, Clock, FileText, Plus, Search, AlertCircle } from 'lucide-react';

interface Evidence {
  id: string;
  evidence_number: string;
  evidence_type: 'file' | 'memory' | 'network' | 'log' | 'disk' | 'volatile';
  file_path: string | null;
  file_hash_md5: string | null;
  file_hash_sha1: string | null;
  file_hash_sha256: string | null;
  file_size: number;
  description: string;
  collected_at: string;
  chain_of_custody: ChainEntry[];
}

interface ChainEntry {
  timestamp: string;
  action: string;
  user: string;
  notes: string;
}

interface Investigation {
  id: string;
  case_number: string;
  title: string;
}

export function EvidenceLocker() {
  const { user } = useAuth();
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedInvestigation, setSelectedInvestigation] = useState<string>('');
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCollectModal, setShowCollectModal] = useState(false);

  useEffect(() => {
    fetchInvestigations();
  }, []);

  useEffect(() => {
    if (selectedInvestigation) {
      fetchEvidence();
    }
  }, [selectedInvestigation]);

  const fetchInvestigations = async () => {
    try {
      const { data, error } = await supabase
        .from('investigations')
        .select('id, case_number, title')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvestigations(data || []);
      if (data && data.length > 0) {
        setSelectedInvestigation(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching investigations:', error);
    }
  };

  const fetchEvidence = async () => {
    try {
      const { data, error } = await supabase
        .from('evidence')
        .select('*')
        .eq('investigation_id', selectedInvestigation)
        .order('collected_at', { ascending: false });

      if (error) throw error;
      setEvidence(data || []);
    } catch (error) {
      console.error('Error fetching evidence:', error);
    }
  };

  const filteredEvidence = evidence.filter(
    (item) =>
      item.evidence_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.file_hash_sha256?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getEvidenceTypeColor = (type: string) => {
    switch (type) {
      case 'file':
        return 'text-purple-400 bg-purple-900/20 border-purple-700';
      case 'memory':
        return 'text-blue-400 bg-blue-900/20 border-blue-700';
      case 'network':
        return 'text-cyan-400 bg-cyan-900/20 border-cyan-700';
      case 'log':
        return 'text-green-400 bg-green-900/20 border-green-700';
      case 'disk':
        return 'text-orange-400 bg-orange-900/20 border-orange-700';
      case 'volatile':
        return 'text-red-400 bg-red-900/20 border-red-700';
      default:
        return 'text-slate-400 bg-slate-900/20 border-slate-700';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 font-mono">EVIDENCE LOCKER</h1>
        <p className="text-slate-400">Digital evidence collection and chain of custody</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-600/20 p-3 rounded-lg">
              <Package className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <p className="text-slate-400 text-sm mb-1">Total Evidence</p>
          <p className="text-3xl font-bold text-white font-mono">{evidence.length}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-600/20 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <p className="text-slate-400 text-sm mb-1">File Evidence</p>
          <p className="text-3xl font-bold text-white font-mono">
            {evidence.filter((e) => e.evidence_type === 'file').length}
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-cyan-600/20 p-3 rounded-lg">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <p className="text-slate-400 text-sm mb-1">Network Evidence</p>
          <p className="text-3xl font-bold text-white font-mono">
            {evidence.filter((e) => e.evidence_type === 'network').length}
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-600/20 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-red-400" />
            </div>
          </div>
          <p className="text-slate-400 text-sm mb-1">Volatile Evidence</p>
          <p className="text-3xl font-bold text-white font-mono">
            {evidence.filter((e) => e.evidence_type === 'volatile').length}
          </p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 mb-6 p-4">
        <div className="flex items-center gap-4">
          <select
            value={selectedInvestigation}
            onChange={(e) => setSelectedInvestigation(e.target.value)}
            className="px-4 py-2 bg-slate-900 border border-slate-600 rounded text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {investigations.map((inv) => (
              <option key={inv.id} value={inv.id}>
                [{inv.case_number}] {inv.title}
              </option>
            ))}
          </select>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="SEARCH EVIDENCE NUMBER, HASH, OR DESCRIPTION..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-600 rounded text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowCollectModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-mono transition-colors"
          >
            <Plus className="w-5 h-5" />
            COLLECT
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800 rounded-lg border border-slate-700">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-bold text-white font-mono">EVIDENCE ITEMS</h2>
          </div>
          <div className="p-4">
            {filteredEvidence.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-mono">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                NO EVIDENCE COLLECTED
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvidence.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedEvidence(item)}
                    className={`w-full text-left p-4 rounded border transition-colors ${
                      selectedEvidence?.id === item.id
                        ? 'bg-blue-900/20 border-blue-700'
                        : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-mono">
                        <div className="text-white font-semibold text-lg mb-1">
                          {item.evidence_number}
                        </div>
                        <div className="text-slate-400 text-sm">{item.description}</div>
                      </div>
                      <span
                        className={`text-xs px-3 py-1 rounded border font-mono uppercase ${getEvidenceTypeColor(
                          item.evidence_type
                        )}`}
                      >
                        {item.evidence_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                      <span>SIZE: {formatBytes(item.file_size)}</span>
                      <span>COLLECTED: {formatTimestamp(item.collected_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-bold text-white font-mono">EVIDENCE DETAILS</h2>
          </div>
          <div className="p-4">
            {!selectedEvidence ? (
              <div className="text-center py-12 text-slate-500 font-mono">
                SELECT EVIDENCE TO VIEW DETAILS
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-black/50 rounded border border-slate-700 p-4 font-mono text-xs">
                  <div className="space-y-3">
                    <div>
                      <span className="text-slate-500">EVIDENCE #:</span>
                      <div className="text-white text-lg font-semibold">
                        {selectedEvidence.evidence_number}
                      </div>
                    </div>

                    {selectedEvidence.file_path && (
                      <div>
                        <span className="text-slate-500">FILE PATH:</span>
                        <div className="text-cyan-400 break-all">{selectedEvidence.file_path}</div>
                      </div>
                    )}

                    {selectedEvidence.file_hash_sha256 && (
                      <div>
                        <span className="text-slate-500">SHA-256:</span>
                        <div className="text-green-400 break-all font-mono">
                          {selectedEvidence.file_hash_sha256}
                        </div>
                      </div>
                    )}

                    {selectedEvidence.file_hash_sha1 && (
                      <div>
                        <span className="text-slate-500">SHA-1:</span>
                        <div className="text-green-400 break-all font-mono">
                          {selectedEvidence.file_hash_sha1}
                        </div>
                      </div>
                    )}

                    {selectedEvidence.file_hash_md5 && (
                      <div>
                        <span className="text-slate-500">MD5:</span>
                        <div className="text-green-400 break-all font-mono">
                          {selectedEvidence.file_hash_md5}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="text-slate-500">SIZE:</span>
                      <div className="text-white">{formatBytes(selectedEvidence.file_size)}</div>
                    </div>

                    <div>
                      <span className="text-slate-500">COLLECTED:</span>
                      <div className="text-white">{formatTimestamp(selectedEvidence.collected_at)}</div>
                    </div>
                  </div>
                </div>

                {selectedEvidence.chain_of_custody && selectedEvidence.chain_of_custody.length > 0 && (
                  <div className="bg-black/50 rounded border border-slate-700 p-4">
                    <div className="flex items-center gap-2 mb-3 text-slate-400 font-mono text-xs">
                      <Shield className="w-4 h-4" />
                      CHAIN OF CUSTODY
                    </div>
                    <div className="space-y-2">
                      {selectedEvidence.chain_of_custody.map((entry, idx) => (
                        <div
                          key={idx}
                          className="border-l-2 border-blue-600 pl-3 py-2 text-xs font-mono"
                        >
                          <div className="text-white font-semibold">{entry.action}</div>
                          <div className="text-slate-400">
                            {entry.user} • {formatTimestamp(entry.timestamp)}
                          </div>
                          {entry.notes && <div className="text-slate-500 mt-1">{entry.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
