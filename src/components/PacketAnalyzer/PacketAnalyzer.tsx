import React, { useState, useEffect } from 'react';
import { Network, Play, Square, Filter, Download, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Packet {
  id: string;
  packet_number: number;
  timestamp: string;
  source_ip: string;
  dest_ip: string;
  source_port: number;
  dest_port: number;
  protocol: string;
  length: number;
  info: string;
  hex_data: string;
  decoded_layers: any;
  flags: string[];
}

interface CaptureSession {
  id: string;
  name: string;
  filter: string;
  packet_count: number;
  start_time: string;
  end_time: string | null;
  status: string;
}

export function PacketAnalyzer() {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [selectedPacket, setSelectedPacket] = useState<Packet | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [filter, setFilter] = useState('');
  const [displayFilter, setDisplayFilter] = useState('');
  const [currentSession, setCurrentSession] = useState<CaptureSession | null>(null);
  const [loading, setLoading] = useState(false);

  const getProtocolColor = (protocol: string) => {
    const colors: { [key: string]: string } = {
      'TCP': 'text-blue-400',
      'UDP': 'text-cyan-400',
      'HTTP': 'text-green-400',
      'HTTPS': 'text-emerald-400',
      'DNS': 'text-yellow-400',
      'ICMP': 'text-red-400',
      'ARP': 'text-purple-400',
      'TLS': 'text-indigo-400',
      'SSH': 'text-pink-400',
      'FTP': 'text-orange-400',
    };
    return colors[protocol] || 'text-gray-400';
  };

  const startCapture = async () => {
    try {
      setLoading(true);
      setPackets([]);
      setDisplayFilter('');

      const sessionName = `Capture ${new Date().toLocaleString()}`;
      const { data: session, error: sessionError } = await supabase
        .from('capture_sessions')
        .insert({
          name: sessionName,
          filter: filter,
          status: 'running'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      console.log('Created session:', session.id);
      setCurrentSession(session);
      setIsCapturing(true);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/packet-capture`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: session.id,
          duration: 30,
          filter: filter
        })
      }).then(res => res.json()).then(data => console.log('Capture started:', data)).catch(err => console.error('Capture error:', err));

    } catch (error) {
      console.error('Error starting capture:', error);
    } finally {
      setLoading(false);
    }
  };

  const stopCapture = async () => {
    if (!currentSession) return;

    try {
      await supabase
        .from('capture_sessions')
        .update({
          status: 'stopped',
          end_time: new Date().toISOString()
        })
        .eq('id', currentSession.id);

      setIsCapturing(false);
    } catch (error) {
      console.error('Error stopping capture:', error);
    }
  };

  const loadPackets = async (sessionId: string) => {
    try {
      console.log('Loading packets for session:', sessionId);
      const { data, error } = await supabase
        .from('packet_captures')
        .select('*')
        .eq('session_id', sessionId)
        .order('packet_number', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      console.log('Loaded packets:', data?.length || 0, 'packets');
      setPackets(data || []);
    } catch (error) {
      console.error('Error loading packets:', error);
    }
  };

  const clearCapture = () => {
    setPackets([]);
    setSelectedPacket(null);
    setCurrentSession(null);
  };

  const exportPCAP = () => {
    const pcapData = packets.map(p => ({
      number: p.packet_number,
      time: p.timestamp,
      source: `${p.source_ip}:${p.source_port}`,
      destination: `${p.dest_ip}:${p.dest_port}`,
      protocol: p.protocol,
      length: p.length,
      info: p.info
    }));

    const blob = new Blob([JSON.stringify(pcapData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `capture_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredPackets = packets.filter(packet => {
    if (!displayFilter || !displayFilter.trim()) return true;
    const searchStr = displayFilter.toLowerCase().trim();
    return (
      (packet.protocol?.toLowerCase() || '').includes(searchStr) ||
      (packet.source_ip || '').includes(searchStr) ||
      (packet.dest_ip || '').includes(searchStr) ||
      (packet.info?.toLowerCase() || '').includes(searchStr)
    );
  });

  console.log('Packets:', packets.length, 'Filtered:', filteredPackets.length, 'Filter:', displayFilter);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const formatHexDump = (hexData: string) => {
    if (!hexData) return [];
    const lines = [];
    for (let i = 0; i < hexData.length; i += 32) {
      const chunk = hexData.slice(i, i + 32);
      const hex = chunk.match(/.{1,2}/g)?.join(' ') || '';
      const ascii = chunk.match(/.{1,2}/g)?.map(byte => {
        const code = parseInt(byte, 16);
        return code >= 32 && code <= 126 ? String.fromCharCode(code) : '.';
      }).join('') || '';
      lines.push({ offset: i / 2, hex, ascii });
    }
    return lines;
  };

  useEffect(() => {
    if (isCapturing && currentSession) {
      const interval = setInterval(async () => {
        await loadPackets(currentSession.id);

        const { data: session } = await supabase
          .from('capture_sessions')
          .select('status')
          .eq('id', currentSession.id)
          .single();

        if (session?.status === 'completed') {
          await loadPackets(currentSession.id);
          setIsCapturing(false);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isCapturing, currentSession]);

  return (
    <div className="space-y-4">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-cyan-500/10 rounded-lg">
            <Network className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Packet Analyzer</h2>
            <p className="text-gray-400">Wireshark-style network traffic analysis</p>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Capture filter (e.g., tcp, udp, port 443)"
              disabled={isCapturing}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {!isCapturing ? (
            <button
              onClick={startCapture}
              disabled={loading}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          ) : (
            <button
              onClick={stopCapture}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          )}

          <button
            onClick={clearCapture}
            disabled={isCapturing}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={exportPCAP}
            disabled={packets.length === 0}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        <div className="relative mb-4">
          <input
            type="text"
            value={displayFilter}
            onChange={(e) => setDisplayFilter(e.target.value)}
            placeholder="Display filter (protocol, IP, port...)"
            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {isCapturing && (
          <div className="mb-4 flex items-center gap-2 text-green-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Capturing packets...</span>
            <span className="text-sm text-gray-400">({packets.length} packets)</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4" style={{ height: 'calc(100vh - 400px)' }}>
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 overflow-hidden flex flex-col" style={{ height: selectedPacket ? '50%' : '100%' }}>
          <div className="bg-gray-900/50 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-400">Packet List</span>
            <span className="text-xs text-gray-500">{filteredPackets.length} packets</span>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-gray-900/50 sticky top-0">
                <tr className="text-gray-400 text-xs">
                  <th className="px-4 py-2 text-left font-medium">No.</th>
                  <th className="px-4 py-2 text-left font-medium">Time</th>
                  <th className="px-4 py-2 text-left font-medium">Source</th>
                  <th className="px-4 py-2 text-left font-medium">Destination</th>
                  <th className="px-4 py-2 text-left font-medium">Protocol</th>
                  <th className="px-4 py-2 text-left font-medium">Length</th>
                  <th className="px-4 py-2 text-left font-medium">Info</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {filteredPackets.map((packet) => (
                  <tr
                    key={packet.id}
                    onClick={() => setSelectedPacket(packet)}
                    className={`border-b border-gray-800 cursor-pointer hover:bg-gray-700/30 transition-colors ${
                      selectedPacket?.id === packet.id ? 'bg-cyan-500/10' : ''
                    }`}
                  >
                    <td className="px-4 py-2 text-gray-400">{packet.packet_number}</td>
                    <td className="px-4 py-2 text-gray-300">{formatTimestamp(packet.timestamp)}</td>
                    <td className="px-4 py-2 text-cyan-400">{packet.source_ip}:{packet.source_port}</td>
                    <td className="px-4 py-2 text-purple-400">{packet.dest_ip}:{packet.dest_port}</td>
                    <td className={`px-4 py-2 font-semibold ${getProtocolColor(packet.protocol)}`}>{packet.protocol}</td>
                    <td className="px-4 py-2 text-gray-300">{packet.length}</td>
                    <td className="px-4 py-2 text-gray-400 truncate max-w-md">{packet.info}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPackets.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {isCapturing ? 'Waiting for packets...' : 'No packets captured. Click Start to begin.'}
              </div>
            )}
          </div>
        </div>

        {selectedPacket && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 overflow-hidden flex flex-col" style={{ height: '50%' }}>
            <div className="bg-gray-900/50 px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">Packet Details - #{selectedPacket.packet_number}</span>
            </div>
            <div className="overflow-auto flex-1 p-4">
              <div className="space-y-4 font-mono text-sm">
                <div>
                  <div className="text-cyan-400 font-semibold mb-2">▶ Frame {selectedPacket.packet_number}</div>
                  <div className="ml-4 space-y-1 text-gray-400">
                    <div>Length: {selectedPacket.length} bytes</div>
                    <div>Capture Time: {new Date(selectedPacket.timestamp).toISOString()}</div>
                    {selectedPacket.flags.length > 0 && (
                      <div>Flags: {selectedPacket.flags.join(', ')}</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-green-400 font-semibold mb-2">▶ {selectedPacket.protocol}</div>
                  <div className="ml-4 space-y-1 text-gray-400">
                    <div>Source: {selectedPacket.source_ip}:{selectedPacket.source_port}</div>
                    <div>Destination: {selectedPacket.dest_ip}:{selectedPacket.dest_port}</div>
                    <div>Info: {selectedPacket.info}</div>
                  </div>
                </div>

                {selectedPacket.hex_data && (
                  <div>
                    <div className="text-yellow-400 font-semibold mb-2">▶ Hex Dump</div>
                    <div className="ml-4 bg-gray-900/50 p-3 rounded border border-gray-700 overflow-auto">
                      {formatHexDump(selectedPacket.hex_data).map((line, idx) => (
                        <div key={idx} className="flex gap-4">
                          <span className="text-gray-500 w-16">{line.offset.toString(16).padStart(4, '0')}</span>
                          <span className="text-cyan-400 flex-1">{line.hex}</span>
                          <span className="text-gray-400">{line.ascii}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}