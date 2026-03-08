import { useEffect, useState } from 'react';
import { Cpu, HardDrive, Zap, Activity, TrendingUp, AlertTriangle } from 'lucide-react';

interface Process {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: string;
  user: string;
}

export function SystemMonitor() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(20).fill(0));
  const [memHistory, setMemHistory] = useState<number[]>(Array(20).fill(0));
  const [stats, setStats] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
    uptime: 0,
  });

  useEffect(() => {
    const processNames = [
      'kernel_task', 'systemd', 'sshd', 'nginx', 'mysqld', 'apache2',
      'postgres', 'dockerd', 'containerd', 'NetworkManager', 'firewalld',
      'auditd', 'rsyslog', 'cron', 'dbus-daemon', 'forensic_scanner',
      'packet_analyzer', 'threat_detector', 'malware_scanner', 'ids_monitor'
    ];

    const users = ['root', 'daemon', 'www-data', 'mysql', 'postgres', 'forensic'];

    const generateProcesses = () => {
      return Array.from({ length: 25 }, (_, i) => ({
        pid: 1000 + Math.floor(Math.random() * 9000),
        name: processNames[Math.floor(Math.random() * processNames.length)],
        cpu: Math.random() * 100,
        memory: Math.random() * 2048,
        status: Math.random() > 0.1 ? 'running' : 'sleeping',
        user: users[Math.floor(Math.random() * users.length)],
      })).sort((a, b) => b.cpu - a.cpu);
    };

    setProcesses(generateProcesses());

    const processInterval = setInterval(() => {
      setProcesses(generateProcesses());
    }, 3000);

    const statsInterval = setInterval(() => {
      const newCpu = Math.floor(Math.random() * 40) + 50;
      const newMem = Math.floor(Math.random() * 30) + 60;

      setStats({
        cpu: newCpu,
        memory: newMem,
        disk: Math.floor(Math.random() * 20) + 70,
        uptime: Math.floor(Date.now() / 1000 / 60),
      });

      setCpuHistory((prev) => [...prev.slice(1), newCpu]);
      setMemHistory((prev) => [...prev.slice(1), newMem]);
    }, 1500);

    return () => {
      clearInterval(processInterval);
      clearInterval(statsInterval);
    };
  }, []);

  const renderMiniGraph = (data: number[], color: string) => {
    const max = 100;
    const height = 40;
    const width = 200;
    const points = data.map((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (value / max) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="opacity-80">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          className="animate-pulse-glow"
        />
        <polyline
          points={`0,${height} ${points} ${width},${height}`}
          fill={color}
          fillOpacity="0.2"
        />
      </svg>
    );
  };

  return (
    <div className="p-6 forensic-grid min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold neon-green mb-2 font-mono">
          ► SYSTEM RESOURCE MONITOR
        </h1>
        <p className="text-green-500 font-mono text-sm">LIVE PROCESS TRACKING • RESOURCE ANALYSIS</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="hacker-border rounded bg-black/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-6 h-6 text-green-500" />
              <span className="text-green-600 font-mono text-sm">CPU</span>
            </div>
            <Activity className="w-4 h-4 text-green-500 animate-pulse" />
          </div>
          <div className="text-3xl font-bold neon-green font-mono mb-2">{stats.cpu}%</div>
          <div className="mt-2">{renderMiniGraph(cpuHistory, '#22c55e')}</div>
        </div>

        <div className="hacker-border rounded bg-black/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-green-500" />
              <span className="text-green-600 font-mono text-sm">MEMORY</span>
            </div>
            <Activity className="w-4 h-4 text-green-500 animate-pulse" />
          </div>
          <div className="text-3xl font-bold neon-green font-mono mb-2">{stats.memory}%</div>
          <div className="mt-2">{renderMiniGraph(memHistory, '#22c55e')}</div>
        </div>

        <div className="hacker-border rounded bg-black/80 p-4">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-6 h-6 text-green-500" />
            <span className="text-green-600 font-mono text-sm">DISK I/O</span>
          </div>
          <div className="text-3xl font-bold neon-green font-mono mb-2">{stats.disk}%</div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs text-green-500 font-mono">
              <span>READ:</span>
              <span>124 MB/s</span>
            </div>
            <div className="flex justify-between text-xs text-green-500 font-mono">
              <span>WRITE:</span>
              <span>87 MB/s</span>
            </div>
          </div>
        </div>

        <div className="hacker-border rounded bg-black/80 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-6 h-6 text-green-500" />
            <span className="text-green-600 font-mono text-sm">UPTIME</span>
          </div>
          <div className="text-3xl font-bold neon-green font-mono mb-2">
            {Math.floor(stats.uptime / 60)}h
          </div>
          <div className="mt-2 space-y-1 text-xs text-green-500 font-mono">
            <div>PROCESSES: {processes.length}</div>
            <div>THREADS: {processes.length * 4}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 hacker-border rounded bg-black/80 p-4">
          <h2 className="text-lg font-bold neon-green mb-4 font-mono flex items-center gap-2">
            <Activity className="w-5 h-5 animate-pulse" />
            RUNNING PROCESSES
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-green-500/30 text-green-600">
                  <th className="text-left py-2 px-2">PID</th>
                  <th className="text-left py-2 px-2">NAME</th>
                  <th className="text-left py-2 px-2">USER</th>
                  <th className="text-right py-2 px-2">CPU%</th>
                  <th className="text-right py-2 px-2">MEM</th>
                  <th className="text-left py-2 px-2">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {processes.map((proc) => (
                  <tr
                    key={proc.pid}
                    className="border-b border-green-500/10 hover:bg-green-950/30 transition-colors text-green-400"
                  >
                    <td className="py-2 px-2 text-green-500">{proc.pid}</td>
                    <td className="py-2 px-2">{proc.name}</td>
                    <td className="py-2 px-2 text-cyan-400">{proc.user}</td>
                    <td className="py-2 px-2 text-right">
                      <span className={proc.cpu > 50 ? 'text-red-400' : proc.cpu > 20 ? 'text-yellow-400' : 'text-green-400'}>
                        {proc.cpu.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right text-green-400">{proc.memory.toFixed(0)}MB</td>
                    <td className="py-2 px-2">
                      <span className={proc.status === 'running' ? 'text-green-500' : 'text-green-700'}>
                        {proc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="hacker-border rounded bg-black/80 p-4">
            <h3 className="text-green-500 font-mono text-sm mb-3">► SYSTEM INFO</h3>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-green-600">KERNEL:</span>
                <span className="text-green-400">5.15.0-76</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-600">ARCH:</span>
                <span className="text-green-400">x86_64</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-600">CORES:</span>
                <span className="text-green-400">8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-600">RAM:</span>
                <span className="text-green-400">32GB</span>
              </div>
            </div>
          </div>

          <div className="hacker-border rounded bg-black/80 p-4">
            <h3 className="text-green-500 font-mono text-sm mb-3">► NETWORK</h3>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-green-600">RX:</span>
                <span className="text-green-400">1.2 GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-600">TX:</span>
                <span className="text-green-400">847 MB</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-green-400">INTERFACE: eth0</span>
              </div>
            </div>
          </div>

          <div className="hacker-border rounded bg-black/80 p-4">
            <h3 className="text-green-500 font-mono text-sm mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 animate-pulse" />
              ALERTS
            </h3>
            <div className="space-y-2 font-mono text-xs">
              <div className="text-yellow-400">
                [!] High CPU usage detected
              </div>
              <div className="text-yellow-400">
                [!] Memory threshold: 85%
              </div>
              <div className="text-green-400">
                [+] All services running
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="hacker-border rounded bg-black/80 p-4">
          <h3 className="text-green-500 font-mono text-sm mb-3">► TOP CPU</h3>
          <div className="space-y-2 font-mono text-xs">
            {processes.slice(0, 5).map((proc, idx) => (
              <div key={proc.pid} className="flex items-center justify-between">
                <span className="text-green-400">{idx + 1}. {proc.name}</span>
                <span className="text-green-500">{proc.cpu.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hacker-border rounded bg-black/80 p-4">
          <h3 className="text-green-500 font-mono text-sm mb-3">► DISK USAGE</h3>
          <div className="space-y-3 font-mono text-xs">
            <div>
              <div className="flex justify-between mb-1 text-green-400">
                <span>/</span>
                <span>78%</span>
              </div>
              <div className="h-1.5 bg-green-950 rounded overflow-hidden">
                <div className="h-full bg-green-500 animate-pulse-glow" style={{ width: '78%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1 text-green-400">
                <span>/var</span>
                <span>45%</span>
              </div>
              <div className="h-1.5 bg-green-950 rounded overflow-hidden">
                <div className="h-full bg-green-500 animate-pulse-glow" style={{ width: '45%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1 text-green-400">
                <span>/home</span>
                <span>62%</span>
              </div>
              <div className="h-1.5 bg-green-950 rounded overflow-hidden">
                <div className="h-full bg-green-500 animate-pulse-glow" style={{ width: '62%' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="hacker-border rounded bg-black/80 p-4">
          <h3 className="text-green-500 font-mono text-sm mb-3">► SERVICES</h3>
          <div className="space-y-2 font-mono text-xs">
            {['sshd', 'nginx', 'firewalld', 'auditd', 'forensic_agent'].map((service) => (
              <div key={service} className="flex items-center gap-2 text-green-400">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span>{service}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
