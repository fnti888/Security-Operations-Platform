import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Cpu, AlertTriangle, Search, Code, GitBranch, Download } from 'lucide-react';
import { exportToJSON } from '../../lib/exportUtils';

interface MemoryAnalysis {
  id: string;
  process_name: string;
  pid: number;
  parent_pid: number | null;
  memory_region: string | null;
  start_address: string | null;
  end_address: string | null;
  protection: string | null;
  hex_dump: string | null;
  strings_found: string[] | null;
  suspicious: boolean;
  analyzed_at: string;
}

export function MemoryForensics() {
  const [analyses, setAnalyses] = useState<MemoryAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<MemoryAnalysis | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlySuspicious, setShowOnlySuspicious] = useState(false);
  const [showProcessTree, setShowProcessTree] = useState(false);

  useEffect(() => {
    fetchMemoryAnalyses();

    const channel = supabase
      .channel('memory_forensics_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'memory_analysis',
        },
        (payload) => {
          const newAnalysis = payload.new as MemoryAnalysis;
          setAnalyses((prev) => [newAnalysis, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMemoryAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from('memory_analysis')
        .select('*')
        .order('analyzed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAnalyses(data || []);
    } catch (error) {
      console.error('Error fetching memory analyses:', error);
    }
  };

  const filteredAnalyses = analyses.filter((analysis) => {
    const matchesSearch =
      analysis.process_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      analysis.pid.toString().includes(searchQuery);
    const matchesSuspicious = !showOnlySuspicious || analysis.suspicious;
    return matchesSearch && matchesSuspicious;
  });

  const formatHexDump = (hexDump: string | null) => {
    if (!hexDump) return [];
    const lines = hexDump.split('\n');
    return lines.slice(0, 16);
  };

  const suspiciousCount = analyses.filter((a) => a.suspicious).length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 font-mono">MEMORY FORENSICS</h1>
        <p className="text-slate-400">Process memory analysis and artifact extraction</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-600/20 p-3 rounded-lg">
              <Cpu className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <p className="text-slate-400 text-sm mb-1">Processes Analyzed</p>
          <p className="text-3xl font-bold text-white font-mono">{analyses.length}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-600/20 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
          </div>
          <p className="text-slate-400 text-sm mb-1">Suspicious Processes</p>
          <p className="text-3xl font-bold text-white font-mono">{suspiciousCount}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-600/20 p-3 rounded-lg">
              <Code className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <p className="text-slate-400 text-sm mb-1">Artifacts Extracted</p>
          <p className="text-3xl font-bold text-white font-mono">
            {analyses.reduce((sum, a) => sum + (a.strings_found?.length || 0), 0)}
          </p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 mb-6 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="SEARCH BY PROCESS NAME OR PID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-600 rounded text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-400 font-mono cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlySuspicious}
              onChange={(e) => setShowOnlySuspicious(e.target.checked)}
              className="rounded bg-slate-900 border-slate-600"
            />
            SUSPICIOUS ONLY
          </label>
          <button
            onClick={() => setShowProcessTree(!showProcessTree)}
            className={`px-4 py-2 rounded text-sm font-mono transition-colors flex items-center gap-2 ${
              showProcessTree ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            TREE VIEW
          </button>
          <button
            onClick={() => exportToJSON(filteredAnalyses, `memory-forensics-${new Date().toISOString().split('T')[0]}.json`)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-mono transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            EXPORT
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-lg border border-slate-700">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-bold text-white font-mono">PROCESS LIST</h2>
          </div>
          <div className="p-4 max-h-[600px] overflow-y-auto">
            <div className="space-y-2">
              {filteredAnalyses.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-mono">
                  NO MEMORY DUMPS AVAILABLE
                </div>
              ) : (
                filteredAnalyses.map((analysis) => {
                  const children = showProcessTree ? filteredAnalyses.filter((a) => a.parent_pid === analysis.pid) : [];
                  const isParent = analysis.parent_pid === null || !filteredAnalyses.find((a) => a.pid === analysis.parent_pid);

                  if (showProcessTree && !isParent) return null;

                  return (
                    <div key={analysis.id}>
                      <button
                        onClick={() => setSelectedAnalysis(analysis)}
                        className={`w-full text-left p-3 rounded border transition-colors font-mono text-sm ${
                          selectedAnalysis?.id === analysis.id
                            ? 'bg-blue-900/20 border-blue-700'
                            : analysis.suspicious
                            ? 'bg-red-900/10 border-red-900 hover:border-red-700'
                            : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-semibold">{analysis.process_name}</span>
                          {analysis.suspicious && (
                            <span className="px-2 py-0.5 bg-red-900/20 text-red-400 text-xs rounded border border-red-700">
                              SUSPICIOUS
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span>PID: {analysis.pid}</span>
                          {analysis.parent_pid && <span>PPID: {analysis.parent_pid}</span>}
                          {analysis.memory_region && <span>REGION: {analysis.memory_region}</span>}
                        </div>
                      </button>
                      {showProcessTree && children.length > 0 && (
                        <div className="ml-6 mt-2 space-y-2 border-l-2 border-slate-700 pl-3">
                          {children.map((child) => (
                            <button
                              key={child.id}
                              onClick={() => setSelectedAnalysis(child)}
                              className={`w-full text-left p-2 rounded border transition-colors font-mono text-xs ${
                                selectedAnalysis?.id === child.id
                                  ? 'bg-blue-900/20 border-blue-700'
                                  : child.suspicious
                                  ? 'bg-red-900/10 border-red-900 hover:border-red-700'
                                  : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <GitBranch className="w-3 h-3 text-slate-500" />
                                <span className="text-white font-semibold">{child.process_name}</span>
                                {child.suspicious && (
                                  <span className="px-1 py-0.5 bg-red-900/20 text-red-400 text-xs rounded">SUSP</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500 ml-5">
                                <span>PID: {child.pid}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })

              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-bold text-white font-mono">MEMORY INSPECTION</h2>
          </div>
          <div className="p-4">
            {!selectedAnalysis ? (
              <div className="text-center py-12 text-slate-500 font-mono">
                SELECT A PROCESS TO VIEW DETAILS
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-black/50 rounded border border-slate-700 p-4 font-mono text-xs">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <span className="text-slate-500">PROCESS:</span>
                      <div className="text-white">{selectedAnalysis.process_name}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">PID:</span>
                      <div className="text-white">{selectedAnalysis.pid}</div>
                    </div>
                    {selectedAnalysis.start_address && (
                      <>
                        <div>
                          <span className="text-slate-500">START ADDR:</span>
                          <div className="text-green-400">{selectedAnalysis.start_address}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">END ADDR:</span>
                          <div className="text-green-400">{selectedAnalysis.end_address}</div>
                        </div>
                      </>
                    )}
                    {selectedAnalysis.protection && (
                      <div>
                        <span className="text-slate-500">PROTECTION:</span>
                        <div className="text-yellow-400">{selectedAnalysis.protection}</div>
                      </div>
                    )}
                  </div>

                  {selectedAnalysis.hex_dump && (
                    <div className="mb-4">
                      <div className="text-slate-500 mb-2">HEX DUMP:</div>
                      <div className="bg-black rounded p-3 overflow-x-auto">
                        <pre className="text-green-400 text-xs leading-relaxed">
                          {formatHexDump(selectedAnalysis.hex_dump).join('\n')}
                        </pre>
                      </div>
                    </div>
                  )}

                  {selectedAnalysis.strings_found && selectedAnalysis.strings_found.length > 0 && (
                    <div>
                      <div className="text-slate-500 mb-2">
                        STRINGS FOUND ({selectedAnalysis.strings_found.length}):
                      </div>
                      <div className="bg-black rounded p-3 max-h-48 overflow-y-auto">
                        {selectedAnalysis.strings_found.slice(0, 20).map((str, idx) => (
                          <div key={idx} className="text-cyan-400 py-0.5">
                            {str}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
