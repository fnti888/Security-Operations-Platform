import { useEffect, useState } from 'react';
import { Network, Radio, Wifi, Activity, Filter } from 'lucide-react';

interface Packet {
  id: string;
  timestamp: string;
  srcIP: string;
  dstIP: string;
  srcPort: number;
  dstPort: number;
  protocol: string;
  size: number;
  flags: string;
}

export function NetworkMonitor() {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [hexDump, setHexDump] = useState<string[]>([]);
  const [stats, setStats] = useState({
    packetsPerSec: 0,
    bandwidth: 0,
    connections: 0,
  });
  const [protocolFilter, setProtocolFilter] = useState<string>('ALL');

  useEffect(() => {
    const protocols = ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'DNS', 'SSH'];
    const flags = ['SYN', 'ACK', 'FIN', 'PSH', 'RST', 'SYN-ACK'];

    const generateIP = () => `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

    const packetInterval = setInterval(() => {
      const newPacket: Packet = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + `.${Math.floor(Math.random() * 1000)}`,
        srcIP: generateIP(),
        dstIP: generateIP(),
        srcPort: Math.floor(Math.random() * 65535),
        dstPort: [80, 443, 22, 21, 3306, 8080, 53][Math.floor(Math.random() * 7)],
        protocol: protocols[Math.floor(Math.random() * protocols.length)],
        size: Math.floor(Math.random() * 1500) + 60,
        flags: flags[Math.floor(Math.random() * flags.length)],
      };

      setPackets((prev) => [newPacket, ...prev.slice(0, 49)]);
    }, 500);

    const hexInterval = setInterval(() => {
      const generateHexLine = () => {
        const offset = Math.floor(Math.random() * 65536).toString(16).padStart(4, '0');
        const hex = Array.from({ length: 16 }, () =>
          Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
        ).join(' ');
        const ascii = Array.from({ length: 16 }, () => {
          const char = Math.floor(Math.random() * 94) + 33;
          return String.fromCharCode(char);
        }).join('');
        return `0x${offset}  ${hex}  |${ascii}|`;
      };

      setHexDump(Array.from({ length: 20 }, generateHexLine));
    }, 2000);

    const statsInterval = setInterval(() => {
      setStats({
        packetsPerSec: Math.floor(Math.random() * 500) + 100,
        bandwidth: Math.floor(Math.random() * 100) + 20,
        connections: Math.floor(Math.random() * 50) + 20,
      });
    }, 1500);

    return () => {
      clearInterval(packetInterval);
      clearInterval(hexInterval);
      clearInterval(statsInterval);
    };
  }, []);

  return (
    <div className="p-6 forensic-grid min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold neon-green mb-2 font-mono">
            ► NETWORK PACKET ANALYZER
          </h1>
          <p className="text-green-500 font-mono text-sm">LIVE TRAFFIC MONITORING • DEEP PACKET INSPECTION</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-green-600" />
          <select
            value={protocolFilter}
            onChange={(e) => setProtocolFilter(e.target.value)}
            className="px-4 py-2 bg-black border-2 border-green-900/50 rounded text-cyber-primary focus:outline-none focus:border-cyber-primary font-mono text-sm"
          >
            <option value="ALL">ALL PROTOCOLS</option>
            <option value="TCP">TCP ONLY</option>
            <option value="UDP">UDP ONLY</option>
            <option value="HTTP">HTTP ONLY</option>
            <option value="HTTPS">HTTPS ONLY</option>
            <option value="DNS">DNS ONLY</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="hacker-border rounded bg-black/80 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Network className="w-6 h-6 text-green-500" />
            <span className="text-green-600 font-mono text-sm">PACKETS/SEC</span>
          </div>
          <div className="text-3xl font-bold neon-green font-mono">{stats.packetsPerSec}</div>
          <div className="flex items-center gap-2 mt-2">
            <Activity className="w-4 h-4 text-green-500 animate-pulse" />
            <span className="text-green-500 text-xs font-mono">CAPTURING</span>
          </div>
        </div>

        <div className="hacker-border rounded bg-black/80 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Wifi className="w-6 h-6 text-green-500" />
            <span className="text-green-600 font-mono text-sm">BANDWIDTH</span>
          </div>
          <div className="text-3xl font-bold neon-green font-mono">{stats.bandwidth} MB/s</div>
          <div className="mt-2 h-1 bg-green-950 rounded overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500 animate-pulse-glow"
              style={{ width: `${stats.bandwidth}%` }}
            ></div>
          </div>
        </div>

        <div className="hacker-border rounded bg-black/80 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Radio className="w-6 h-6 text-green-500" />
            <span className="text-green-600 font-mono text-sm">CONNECTIONS</span>
          </div>
          <div className="text-3xl font-bold neon-green font-mono">{stats.connections}</div>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-green-500 text-xs font-mono">ACTIVE</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="hacker-border rounded bg-black/80 p-4">
          <h2 className="text-lg font-bold neon-green mb-4 font-mono flex items-center gap-2">
            <Activity className="w-5 h-5 animate-pulse" />
            PACKET STREAM
          </h2>
          <div className="h-[500px] overflow-y-auto font-mono text-xs">
            <div className="grid gap-3 pb-2 border-b border-green-500/30 sticky top-0 bg-black text-green-600 mb-2" style={{ gridTemplateColumns: '90px 140px 20px 140px 60px 60px 70px' }}>
              <div>TIME</div>
              <div>SOURCE</div>
              <div>→</div>
              <div>DEST</div>
              <div>PROTO</div>
              <div>SIZE</div>
              <div>FLAGS</div>
            </div>
            {packets.filter((p) => protocolFilter === 'ALL' || p.protocol === protocolFilter).map((packet) => (
              <div
                key={packet.id}
                className="grid gap-3 py-1 text-green-400 hover:bg-green-950/30 transition-colors animate-fade-in"
                style={{ gridTemplateColumns: '90px 140px 20px 140px 60px 60px 70px' }}
              >
                <div className="text-green-500 truncate">{packet.timestamp}</div>
                <div className="truncate">{packet.srcIP}:{packet.srcPort}</div>
                <div className="text-green-600">→</div>
                <div className="truncate">{packet.dstIP}:{packet.dstPort}</div>
                <div className="text-yellow-400 truncate">{packet.protocol}</div>
                <div className="truncate">{packet.size}B</div>
                <div className="text-cyan-400 truncate">{packet.flags}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hacker-border rounded bg-black/80 p-4">
          <h2 className="text-lg font-bold neon-green mb-4 font-mono">HEX DUMP</h2>
          <div className="h-[500px] overflow-y-auto font-mono text-xs hex-display screen-overlay">
            {hexDump.map((line, idx) => (
              <div key={idx} className="text-green-400 leading-relaxed">
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="hacker-border rounded bg-black/80 p-4">
          <h3 className="text-green-500 font-mono text-sm mb-3">► PROTOCOL DISTRIBUTION</h3>
          <div className="space-y-3 font-mono text-xs">
            {[
              { name: 'TCP', count: 2847, color: 'bg-green-500' },
              { name: 'UDP', count: 1523, color: 'bg-cyan-500' },
              { name: 'ICMP', count: 342, color: 'bg-yellow-500' },
              { name: 'HTTP', count: 1129, color: 'bg-blue-500' },
            ].map((proto) => (
              <div key={proto.name}>
                <div className="flex justify-between mb-1 text-green-400">
                  <span>{proto.name}</span>
                  <span>{proto.count}</span>
                </div>
                <div className="h-1.5 bg-green-950 rounded overflow-hidden">
                  <div
                    className={`h-full ${proto.color} animate-pulse-glow`}
                    style={{ width: `${(proto.count / 3000) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hacker-border rounded bg-black/80 p-4">
          <h3 className="text-green-500 font-mono text-sm mb-3">► TOP DESTINATIONS</h3>
          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between text-green-400">
              <span>8.8.8.8</span>
              <span className="text-green-500">1,247 pkts</span>
            </div>
            <div className="flex justify-between text-green-400">
              <span>192.168.1.1</span>
              <span className="text-green-500">892 pkts</span>
            </div>
            <div className="flex justify-between text-green-400">
              <span>1.1.1.1</span>
              <span className="text-green-500">673 pkts</span>
            </div>
            <div className="flex justify-between text-green-400">
              <span>10.0.0.1</span>
              <span className="text-yellow-400">421 pkts</span>
            </div>
            <div className="flex justify-between text-green-400">
              <span>203.0.113.45</span>
              <span className="text-red-400">127 pkts [!]</span>
            </div>
          </div>
        </div>

        <div className="hacker-border rounded bg-black/80 p-4">
          <h3 className="text-green-500 font-mono text-sm mb-3">► CAPTURE STATUS</h3>
          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center gap-2 text-green-400">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>INTERFACE: eth0</span>
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>MODE: PROMISCUOUS</span>
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>FILTER: ALL TRAFFIC</span>
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>BUFFER: 89% FULL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
