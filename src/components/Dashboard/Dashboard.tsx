import { useEffect, useState } from 'react';
import { AlertTriangle, Activity, Shield, Wifi, Radio, Zap, Terminal, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AnimatedCounter } from '../Layout/AnimatedCounter';
import { logTerminalMessage, recordSystemMetrics } from '../../lib/activityTracking';

interface ScanningProcess {
  id: string;
  name: string;
  progress: number;
  status: string;
}

interface TerminalLine {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export function Dashboard() {
  const [scans, setScans] = useState<ScanningProcess[]>([
    { id: '1', name: 'PORT_SCAN', progress: 0, status: 'running' },
    { id: '2', name: 'VULN_DETECTION', progress: 0, status: 'running' },
    { id: '3', name: 'PACKET_ANALYSIS', progress: 0, status: 'running' },
    { id: '4', name: 'MALWARE_SCAN', progress: 0, status: 'running' },
  ]);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [systemStats, setSystemStats] = useState({
    cpu: 0,
    memory: 0,
    network: 0,
    threats: 0,
  });
  const [packetStats, setPacketStats] = useState({
    total: 1247539,
    suspicious: 127,
    blocked: 43,
  });
  const [alerts, setAlerts] = useState(3);
  const [dbStats, setDbStats] = useState({
    totalThreats: 0,
    activeThreats: 0,
    totalIncidents: 0,
    openIncidents: 0,
  });

  useEffect(() => {
    fetchDbStats();

    const threatsChannel = supabase
      .channel('dashboard-threats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'threats' }, () => {
        fetchDbStats();
      })
      .subscribe();

    const incidentsChannel = supabase
      .channel('dashboard-incidents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
        fetchDbStats();
      })
      .subscribe();

    const scanInterval = setInterval(() => {
      setScans((prevScans) =>
        prevScans.map((scan) => {
          const newProgress = scan.progress + Math.random() * 15;
          if (newProgress >= 100) {
            return { ...scan, progress: 0, status: 'running' };
          }
          return { ...scan, progress: newProgress };
        })
      );
    }, 1000);

    const terminalMessages = [
      { text: '>>> Scanning subnet 192.168.1.0/24...', type: 'info' as const },
      { text: '[+] Open port detected: 22 (SSH)', type: 'success' as const },
      { text: '[+] Open port detected: 80 (HTTP)', type: 'success' as const },
      { text: '[!] Suspicious traffic pattern detected', type: 'warning' as const },
      { text: '[+] Analyzing packet headers...', type: 'info' as const },
      { text: '[X] Potential brute force attempt blocked', type: 'error' as const },
      { text: '[+] Firewall rules updated', type: 'success' as const },
      { text: '>>> Deep packet inspection in progress...', type: 'info' as const },
      { text: '[!] Anomalous behavior detected on port 443', type: 'warning' as const },
      { text: '[+] Vulnerability scan complete: 3 issues found', type: 'warning' as const },
      { text: '[+] IDS signature database updated', type: 'success' as const },
      { text: '>>> Correlating events across data sources...', type: 'info' as const },
    ];

    let messageIndex = 0;
    const terminalInterval = setInterval(() => {
      const message = terminalMessages[messageIndex % terminalMessages.length];
      const newLine = {
        id: Date.now().toString(),
        text: message.text,
        type: message.type,
      };
      setTerminalLines((prev) => {
        const newLines = [...prev, newLine];
        return newLines.slice(-20);
      });
      logTerminalMessage(message.text, message.type, 'dashboard');
      messageIndex++;
    }, 2000);

    const statsInterval = setInterval(() => {
      const newStats = {
        cpu: Math.floor(Math.random() * 40) + 60,
        memory: Math.floor(Math.random() * 30) + 50,
        network: Math.floor(Math.random() * 50) + 30,
        threats: Math.floor(Math.random() * 10) + 15,
      };
      setSystemStats(newStats);
      recordSystemMetrics({
        cpuUsage: newStats.cpu,
        memoryUsage: newStats.memory,
        networkUsage: newStats.network,
        activeThreats: newStats.threats,
      });
    }, 3000);

    const packetInterval = setInterval(() => {
      setPacketStats((prev) => ({
        total: prev.total + Math.floor(Math.random() * 500) + 100,
        suspicious: prev.suspicious + Math.floor(Math.random() * 5),
        blocked: prev.blocked + Math.floor(Math.random() * 3),
      }));
    }, 2000);

    const alertInterval = setInterval(() => {
      setAlerts((prev) => {
        const change = Math.random() > 0.7 ? 1 : 0;
        return Math.max(0, prev + change);
      });
    }, 5000);

    return () => {
      clearInterval(scanInterval);
      clearInterval(terminalInterval);
      clearInterval(statsInterval);
      clearInterval(packetInterval);
      clearInterval(alertInterval);
      supabase.removeChannel(threatsChannel);
      supabase.removeChannel(incidentsChannel);
    };
  }, []);

  const fetchDbStats = async () => {
    try {
      const { count: totalThreats } = await supabase
        .from('threats')
        .select('*', { count: 'exact', head: true });

      const { count: activeThreats } = await supabase
        .from('threats')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: totalIncidents } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true });

      const { count: openIncidents } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'investigating']);

      setDbStats({
        totalThreats: totalThreats || 0,
        activeThreats: activeThreats || 0,
        totalIncidents: totalIncidents || 0,
        openIncidents: openIncidents || 0,
      });
    } catch (error) {
      console.error('Error fetching database stats:', error);
    }
  };

  const getLineColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-green-500';
    }
  };

  return (
    <div className="p-4 forensic-grid">
      <div className="hacker-border rounded p-4 mb-4 bg-black/80">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold neon-green mb-1 font-mono animate-flicker">
              ► ACTIVE SURVEILLANCE TERMINAL
            </h1>
            <p className="text-green-500 font-mono text-xs">
              ALL SYSTEMS OPERATIONAL • CLASSIFICATION: TOP SECRET
            </p>
          </div>
          <div className="text-right font-mono text-xs text-green-600">
            <div>
              STATUS: <span className="text-green-400 animate-pulse">● LIVE</span>
            </div>
            <div>
              UPTIME: <span className="text-green-500">{new Date().toLocaleTimeString('en-US', { hour12: false })}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="hacker-border rounded bg-black/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <Shield className="w-8 h-8 text-green-500" />
            <Activity className="w-5 h-5 text-green-400 animate-pulse" />
          </div>
          <p className="text-green-600 text-xs mb-1 font-mono">CPU USAGE</p>
          <p className="text-3xl font-bold neon-green font-mono">{systemStats.cpu}%</p>
          <div className="mt-2 h-1 bg-green-950 rounded overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${systemStats.cpu}%` }}
            ></div>
          </div>
        </div>

        <div className="hacker-border rounded bg-black/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <Wifi className="w-8 h-8 text-green-500" />
            <Radio className="w-5 h-5 text-green-400 animate-pulse" />
          </div>
          <p className="text-green-600 text-xs mb-1 font-mono">NETWORK LOAD</p>
          <p className="text-3xl font-bold neon-green font-mono">{systemStats.network}%</p>
          <div className="mt-2 h-1 bg-green-950 rounded overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${systemStats.network}%` }}
            ></div>
          </div>
        </div>

        <div className="hacker-border rounded bg-black/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <Zap className="w-8 h-8 text-green-500" />
            <Activity className="w-5 h-5 text-green-400 animate-pulse" />
          </div>
          <p className="text-green-600 text-xs mb-1 font-mono">MEMORY USAGE</p>
          <p className="text-3xl font-bold neon-green font-mono">{systemStats.memory}%</p>
          <div className="mt-2 h-1 bg-green-950 rounded overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${systemStats.memory}%` }}
            ></div>
          </div>
        </div>

        <div className="hacker-border rounded bg-black/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <AlertTriangle className="w-8 h-8 text-red-500 animate-pulse" />
            <Lock className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-green-600 text-xs mb-1 font-mono">THREATS BLOCKED</p>
          <p className="text-3xl font-bold text-red-400 font-mono animate-pulse">{systemStats.threats}</p>
          <div className="mt-2 text-xs text-green-500 font-mono">LAST 60 SECONDS</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="hacker-border rounded bg-black/80 p-4">
          <div className="flex items-center gap-2 mb-4 border-b border-green-500/30 pb-2">
            <Terminal className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-bold neon-green font-mono">ACTIVE SCANS</h2>
          </div>
          <div className="space-y-4">
            {scans.map((scan) => (
              <div key={scan.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-green-400 font-mono text-sm">{scan.name}</span>
                  <span className="text-green-500 font-mono text-xs">
                    {Math.floor(scan.progress)}%
                  </span>
                </div>
                <div className="h-2 bg-green-950 rounded overflow-hidden relative">
                  <div
                    className="h-full bg-green-500 transition-all duration-300 relative animate-pulse-glow"
                    style={{ width: `${scan.progress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-300 to-transparent animate-scan"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hacker-border rounded bg-black/80 p-4">
          <div className="flex items-center gap-2 mb-4 border-b border-green-500/30 pb-2">
            <Activity className="w-5 h-5 text-green-500 animate-pulse" />
            <h2 className="text-lg font-bold neon-green font-mono">LIVE OUTPUT</h2>
          </div>
          <div className="h-[200px] overflow-y-auto font-mono text-xs space-y-1 screen-overlay">
            {terminalLines.map((line) => (
              <div key={line.id} className={`${getLineColor(line.type)} animate-fade-in`}>
                {line.text}
              </div>
            ))}
            <div className="terminal-cursor text-green-500"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="hacker-border rounded bg-black/80 p-4">
          <h3 className="text-green-600 font-mono text-xs mb-2">DATABASE THREATS</h3>
          <div className="text-3xl font-bold neon-green font-mono mb-1">
            <AnimatedCounter value={dbStats.totalThreats} />
          </div>
          <div className="text-xs font-mono">
            <span className="text-red-400">{dbStats.activeThreats} ACTIVE</span>
            <span className="text-green-800 mx-1">•</span>
            <span className="text-green-600">{dbStats.totalThreats - dbStats.activeThreats} MITIGATED</span>
          </div>
        </div>

        <div className="hacker-border rounded bg-black/80 p-4">
          <h3 className="text-green-600 font-mono text-xs mb-2">ACTIVE INCIDENTS</h3>
          <div className="text-3xl font-bold neon-green font-mono mb-1">
            <AnimatedCounter value={dbStats.totalIncidents} />
          </div>
          <div className="text-xs font-mono">
            <span className="text-orange-400">{dbStats.openIncidents} OPEN</span>
            <span className="text-green-800 mx-1">•</span>
            <span className="text-green-600">{dbStats.totalIncidents - dbStats.openIncidents} RESOLVED</span>
          </div>
        </div>

        <div className="hacker-border rounded bg-black/80 p-4">
          <h3 className="text-green-600 font-mono text-xs mb-2">SYSTEM HEALTH</h3>
          <div className="text-3xl font-bold text-green-400 font-mono mb-1">
            <AnimatedCounter value={100 - Math.floor((dbStats.activeThreats / Math.max(dbStats.totalThreats, 1)) * 100)} suffix="%" />
          </div>
          <div className="text-xs font-mono text-green-500">
            ALL SYSTEMS NOMINAL
          </div>
        </div>

        <div className="hacker-border rounded bg-black/80 p-4">
          <h3 className="text-green-600 font-mono text-xs mb-2">RESPONSE TIME</h3>
          <div className="text-3xl font-bold neon-green font-mono mb-1">
            &lt;2<span className="text-lg">ms</span>
          </div>
          <div className="text-xs font-mono text-green-500">
            REAL-TIME MONITORING
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="hacker-border rounded bg-black/80 p-4">
          <h3 className="text-green-500 font-mono text-sm mb-3">► PORT SCAN RESULTS</h3>
          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between text-green-400">
              <span>22/TCP</span>
              <span className="text-green-500">OPEN [SSH]</span>
            </div>
            <div className="flex justify-between text-green-400">
              <span>80/TCP</span>
              <span className="text-green-500">OPEN [HTTP]</span>
            </div>
            <div className="flex justify-between text-green-400">
              <span>443/TCP</span>
              <span className="text-green-500">OPEN [HTTPS]</span>
            </div>
            <div className="flex justify-between text-green-400">
              <span>3306/TCP</span>
              <span className="text-yellow-400">FILTERED [MySQL]</span>
            </div>
            <div className="flex justify-between text-green-400">
              <span>8080/TCP</span>
              <span className="text-red-400">VULNERABLE</span>
            </div>
          </div>
        </div>

        <div className="hacker-border rounded bg-black/80 p-4">
          <h3 className="text-green-500 font-mono text-sm mb-3">► PACKET ANALYSIS</h3>
          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-green-600">TOTAL PACKETS:</span>
              <span className="text-green-400">{packetStats.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">SUSPICIOUS:</span>
              <span className="text-yellow-400">{packetStats.suspicious}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">BLOCKED:</span>
              <span className="text-red-400">{packetStats.blocked}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">PROTOCOLS:</span>
              <span className="text-green-400">TCP/UDP/ICMP</span>
            </div>
          </div>
        </div>

        <div className="hacker-border rounded bg-black/80 p-4">
          <h3 className="text-green-500 font-mono text-sm mb-3">► INTRUSION DETECTION</h3>
          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center gap-2 text-green-400">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>IDS: ACTIVE</span>
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>IPS: ACTIVE</span>
            </div>
            <div className="flex items-center gap-2 text-yellow-400">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
              <span>ALERTS: {alerts} NEW</span>
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>FIREWALL: ENABLED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
