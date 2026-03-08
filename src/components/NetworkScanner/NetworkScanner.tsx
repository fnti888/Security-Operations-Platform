import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, Wifi, Search, AlertCircle, CheckCircle, XCircle, Clock, Shield } from 'lucide-react';

interface NetworkScan {
  id: string;
  target: string;
  scan_type: 'ping' | 'port_scan' | 'full_scan';
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface ScanResult {
  id: string;
  scan_id: string;
  result_type: 'ping_response' | 'port_status' | 'service_info' | 'error';
  data: {
    port?: number;
    status?: string;
    service?: string;
    responseTime?: number;
    alive?: boolean;
    statusCode?: number;
    error?: string;
  };
  timestamp: string;
}

export function NetworkScanner() {
  const [scans, setScans] = useState<NetworkScan[]>([]);
  const [results, setResults] = useState<Record<string, ScanResult[]>>({});
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [target, setTarget] = useState('');
  const [scanType, setScanType] = useState<'ping' | 'port_scan' | 'full_scan'>('ping');
  const [customPorts, setCustomPorts] = useState('');

  useEffect(() => {
    fetchScans();

    const scansChannel = supabase
      .channel('network-scans-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'network_scans' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setScans((prev) => [payload.new as NetworkScan, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setScans((prev) =>
              prev.map((scan) =>
                scan.id === (payload.new as NetworkScan).id ? (payload.new as NetworkScan) : scan
              )
            );
          }
        }
      )
      .subscribe();

    const resultsChannel = supabase
      .channel('scan-results-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scan_results' },
        (payload) => {
          const result = payload.new as ScanResult;
          setResults((prev) => ({
            ...prev,
            [result.scan_id]: [...(prev[result.scan_id] || []), result],
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(scansChannel);
      supabase.removeChannel(resultsChannel);
    };
  }, []);

  const fetchScans = async () => {
    try {
      const { data: scansData, error: scansError } = await supabase
        .from('network_scans')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (scansError) throw scansError;
      setScans(scansData || []);

      if (scansData && scansData.length > 0) {
        const { data: resultsData, error: resultsError } = await supabase
          .from('scan_results')
          .select('*')
          .in('scan_id', scansData.map((s) => s.id))
          .order('timestamp', { ascending: true });

        if (resultsError) throw resultsError;

        const groupedResults: Record<string, ScanResult[]> = {};
        resultsData?.forEach((result) => {
          if (!groupedResults[result.scan_id]) {
            groupedResults[result.scan_id] = [];
          }
          groupedResults[result.scan_id].push(result as ScanResult);
        });
        setResults(groupedResults);
      }
    } catch (error) {
      console.error('Error fetching scans:', error);
    } finally {
      setLoading(false);
    }
  };

  const startScan = async () => {
    if (!target.trim()) return;

    setScanning(true);
    try {
      const { data: user } = await supabase.auth.getUser();

      const { data: scanData, error: scanError } = await supabase
        .from('network_scans')
        .insert({
          target: target.trim(),
          scan_type: scanType,
          status: 'running',
          started_at: new Date().toISOString(),
          created_by: user.user?.id || null,
        })
        .select()
        .single();

      if (scanError) throw scanError;

      const ports = customPorts
        ? customPorts.split(',').map((p) => parseInt(p.trim())).filter((p) => !isNaN(p))
        : undefined;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/network-scanner`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: target.trim(),
          scanType,
          ports,
        }),
      });

      const scanResults = await response.json();

      if (scanResults.success) {
        const resultsToInsert = [];

        if (scanType === 'ping' || scanType === 'full_scan') {
          const pingData = scanType === 'ping' ? scanResults.results : scanResults.results.ping;
          resultsToInsert.push({
            scan_id: scanData.id,
            result_type: 'ping_response',
            data: pingData,
          });
        }

        if (scanType === 'port_scan' || scanType === 'full_scan') {
          const portsData = scanType === 'port_scan' ? scanResults.results : scanResults.results.ports;
          portsData.forEach((portResult: { port: number; status: string; service?: string; responseTime: number }) => {
            resultsToInsert.push({
              scan_id: scanData.id,
              result_type: 'port_status',
              data: portResult,
            });
          });
        }

        if (resultsToInsert.length > 0) {
          await supabase.from('scan_results').insert(resultsToInsert);
        }

        await supabase
          .from('network_scans')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', scanData.id);
      } else {
        await supabase.from('scan_results').insert({
          scan_id: scanData.id,
          result_type: 'error',
          data: { error: scanResults.error || 'Scan failed' },
        });

        await supabase
          .from('network_scans')
          .update({ status: 'failed', completed_at: new Date().toISOString() })
          .eq('id', scanData.id);
      }

      setTarget('');
      setCustomPorts('');
    } catch (error) {
      console.error('Scan error:', error);
    } finally {
      setScanning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getPortStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'text-green-400 bg-green-900/20 border-green-700';
      case 'closed':
        return 'text-red-400 bg-red-900/20 border-red-700';
      case 'filtered':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
      default:
        return 'text-slate-400 bg-slate-900/20 border-slate-700';
    }
  };

  return (
    <div className="p-4 md:p-8 forensic-grid">
      <div className="hacker-border rounded p-4 mb-6 bg-black/80">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-blue-900/20 p-2 rounded border border-blue-800/50">
            <Wifi className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold neon-green font-mono">
              ► NETWORK SCANNER
            </h1>
            <p className="text-green-500 font-mono text-xs">
              REAL-TIME IP PING • PORT SCANNING • SERVICE DETECTION
            </p>
          </div>
        </div>
      </div>

      <div className="hacker-border rounded bg-black/80 mb-6 p-4 md:p-6">
        <h2 className="text-lg font-semibold text-cyber-primary mb-4 font-mono flex items-center gap-2">
          <Search className="w-5 h-5" />
          INITIATE SCAN
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-cyber-secondary mb-2 font-mono">
              TARGET (IP/HOSTNAME)
            </label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="e.g., 192.168.1.1 or example.com"
              className="w-full px-3 py-2 bg-black border-2 border-green-900/50 rounded text-cyber-primary placeholder-green-900 focus:outline-none focus:border-cyber-primary font-mono text-sm"
              disabled={scanning}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-cyber-secondary mb-2 font-mono">
                SCAN TYPE
              </label>
              <select
                value={scanType}
                onChange={(e) => setScanType(e.target.value as 'ping' | 'port_scan' | 'full_scan')}
                className="w-full px-3 py-2 bg-black border-2 border-green-900/50 rounded text-cyber-primary focus:outline-none focus:border-cyber-primary font-mono text-sm"
                disabled={scanning}
              >
                <option value="ping">PING ONLY</option>
                <option value="port_scan">PORT SCAN</option>
                <option value="full_scan">FULL SCAN (PING + PORTS)</option>
              </select>
            </div>

            {(scanType === 'port_scan' || scanType === 'full_scan') && (
              <div>
                <label className="block text-xs font-medium text-cyber-secondary mb-2 font-mono">
                  CUSTOM PORTS (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={customPorts}
                  onChange={(e) => setCustomPorts(e.target.value)}
                  placeholder="e.g., 80,443,8080"
                  className="w-full px-3 py-2 bg-black border-2 border-green-900/50 rounded text-cyber-primary placeholder-green-900 focus:outline-none focus:border-cyber-primary font-mono text-sm"
                  disabled={scanning}
                />
              </div>
            )}
          </div>

          <button
            onClick={startScan}
            disabled={scanning || !target.trim()}
            className="w-full cyber-button-primary py-3 px-4 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scanning ? '▶ SCANNING...' : '▶ START SCAN'}
          </button>
        </div>
      </div>

      <div className="hacker-border rounded bg-black/80 p-4 md:p-6">
        <h2 className="text-lg font-semibold text-cyber-primary mb-4 font-mono flex items-center gap-2">
          <Activity className="w-5 h-5" />
          SCAN HISTORY
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-cyber-secondary font-mono">▶ LOADING SCAN DATA...</div>
          </div>
        ) : scans.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-green-900 mx-auto mb-4" />
            <p className="text-cyber-secondary font-mono">NO SCANS PERFORMED YET</p>
          </div>
        ) : (
          <div className="space-y-4">
            {scans.map((scan) => (
              <div key={scan.id} className="hacker-border rounded bg-black/60 p-4 animate-fade-in">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(scan.status)}
                    <div>
                      <h3 className="text-cyber-primary font-semibold font-mono">{scan.target}</h3>
                      <p className="text-cyber-secondary text-xs font-mono">
                        {scan.scan_type.replace('_', ' ').toUpperCase()} • {new Date(scan.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded border font-mono ${
                      scan.status === 'completed'
                        ? 'text-green-400 bg-green-900/20 border-green-700'
                        : scan.status === 'failed'
                        ? 'text-red-400 bg-red-900/20 border-red-700'
                        : 'text-yellow-400 bg-yellow-900/20 border-yellow-700'
                    }`}
                  >
                    {scan.status.toUpperCase()}
                  </span>
                </div>

                {results[scan.id] && results[scan.id].length > 0 && (
                  <div className="mt-4 space-y-2">
                    {results[scan.id].map((result) => (
                      <div
                        key={result.id}
                        className="bg-black/40 border-l-2 border-green-900/50 p-3 text-xs font-mono"
                      >
                        {result.result_type === 'ping_response' && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-green-800">PING:</span>
                              <span className={result.data.alive ? 'text-green-400' : 'text-red-400'}>
                                {result.data.alive ? 'HOST ALIVE' : 'HOST DOWN'}
                              </span>
                            </div>
                            {result.data.responseTime && (
                              <div className="flex items-center gap-2">
                                <span className="text-green-800">RESPONSE TIME:</span>
                                <span className="text-cyber-primary">{result.data.responseTime}ms</span>
                              </div>
                            )}
                            {result.data.statusCode && (
                              <div className="flex items-center gap-2">
                                <span className="text-green-800">HTTP STATUS:</span>
                                <span className="text-cyber-primary">{result.data.statusCode}</span>
                              </div>
                            )}
                            {result.data.error && (
                              <div className="flex items-center gap-2">
                                <span className="text-red-800">ERROR:</span>
                                <span className="text-red-400">{result.data.error}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {result.result_type === 'port_status' && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-green-800">PORT {result.data.port}:</span>
                              <span className={`px-2 py-0.5 rounded border text-[10px] ${getPortStatusColor(result.data.status || '')}`}>
                                {result.data.status?.toUpperCase()}
                              </span>
                              {result.data.service && (
                                <span className="text-blue-400">({result.data.service})</span>
                              )}
                            </div>
                            {result.data.responseTime && (
                              <span className="text-cyber-secondary">{result.data.responseTime}ms</span>
                            )}
                          </div>
                        )}

                        {result.result_type === 'error' && (
                          <div className="flex items-center gap-2 text-red-400">
                            <XCircle className="w-4 h-4" />
                            <span>{result.data.error || 'Scan failed'}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
