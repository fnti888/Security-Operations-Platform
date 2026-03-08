import { LayoutDashboard, AlertTriangle, Activity, BarChart3, FileText, Network, Cpu, Clock, Database, Package, Terminal, User, LogIn, LogOut, Lock, Wifi, Shield, Search, Boxes, Zap, Target, Bell, Award, BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ activeView, onViewChange, isOpen, onClose }: SidebarProps) {
  const { user, userProfile, signOut } = useAuth();
  const handleViewChange = (view: string) => {
    onViewChange(view);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent, view: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleViewChange(view);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'MAIN TERMINAL', icon: LayoutDashboard },
    { id: 'incidents', label: 'INCIDENTS', icon: AlertTriangle },
    { id: 'threats', label: 'THREAT INTEL', icon: Activity },
    { id: 'logs', label: 'AUDIT LOGS', icon: FileText },
    { id: 'analytics', label: 'ANALYTICS', icon: BarChart3 },
  ];

  const professionalItems = [
    { id: 'portfolio', label: 'PORTFOLIO', icon: Award },
    { id: 'playbooks', label: 'IR PLAYBOOKS', icon: BookOpen },
    { id: 'skills-lab', label: 'SKILLS LAB', icon: Target },
    { id: 'resume', label: 'MY RESUME', icon: User },
  ];

  const forensicsItems = [
    { id: 'network', label: 'NET CAPTURE', icon: Network },
    { id: 'system', label: 'SYS MONITOR', icon: Cpu },
    { id: 'timeline', label: 'TIMELINE', icon: Clock },
    { id: 'memory', label: 'MEM DUMP', icon: Database },
    { id: 'evidence', label: 'EVIDENCE', icon: Package },
  ];

  const toolsItems = [
    { id: 'security-posture', label: 'SECURITY POSTURE', icon: Shield },
    { id: 'scanner', label: 'NET SCANNER', icon: Wifi },
    { id: 'vulnerabilities', label: 'VULN SCANNER', icon: Shield },
    { id: 'ssl-analyzer', label: 'SSL/TLS ANALYZER', icon: Lock },
    { id: 'packet-analyzer', label: 'PACKET ANALYZER', icon: Boxes },
    { id: 'whois', label: 'WHOIS LOOKUP', icon: Search },
    { id: 'ip-score', label: 'IP SCORE', icon: Activity },
  ];

  const enterpriseItems = [
    { id: 'automation', label: 'AUTOMATION', icon: Zap },
    { id: 'threat-hunting', label: 'THREAT HUNTING', icon: Target },
    { id: 'smart-alerts', label: 'SMART ALERTS', icon: Bell },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}
      <nav
        className={`fixed lg:static w-64 bg-cyber-bg border-r-2 border-cyber-primary/30 flex flex-col h-screen z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Main navigation"
      >
      <div className="p-4 border-b-2 border-cyber-primary/30 bg-gradient-to-b from-cyber-primary/5 to-transparent">
        <div className="text-center mb-3">
          <img
            src="/image.png"
            alt="Security Lock Logo"
            className="w-20 h-20 mx-auto object-contain animate-pop-out hover:scale-150 transition-transform duration-500 cursor-pointer"
          />
        </div>
        <div className="text-center mt-2">
          <div className="text-cyber-primary font-mono text-base font-bold">DEFENSE TERMINAL</div>
          <div className="text-cyber-secondary font-mono text-sm">v3.7.9-ELITE</div>
        </div>
      </div>

      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        <div className="space-y-1" role="menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            const requiresAuth = item.id === 'incidents' || item.id === 'analytics';
            const isLocked = requiresAuth && !user;

            return (
              <button
                key={item.id}
                onClick={() => handleViewChange(item.id)}
                onKeyDown={(e) => handleKeyDown(e, item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 transition-all font-mono text-xs ${
                  isActive
                    ? 'bg-cyber-primary/20 text-cyber-accent border-l-2 border-cyber-primary'
                    : 'text-cyber-secondary hover:bg-cyber-primary/10 hover:text-cyber-primary border-l-2 border-transparent'
                } ${isLocked ? 'opacity-60' : ''}`}
                role="menuitem"
                aria-current={isActive ? 'page' : undefined}
                title={isLocked ? 'Authentication required' : ''}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span className="font-semibold tracking-wider">{item.label}</span>
                {isLocked && <Lock className="w-3 h-3 ml-auto" aria-label="Locked" />}
              </button>
            );
          })}
        </div>

        <div className="pt-3 border-t-2 border-cyber-primary/30">
          <div className="mb-2 px-3">
            <p className="text-[10px] font-bold text-cyber-secondary uppercase tracking-widest font-mono">
              ► LIVE FORENSICS
            </p>
          </div>
          <div className="space-y-1" role="menu" aria-label="Forensics tools">
            {forensicsItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleViewChange(item.id)}
                  onKeyDown={(e) => handleKeyDown(e, item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 transition-all font-mono text-xs ${
                    isActive
                      ? 'bg-cyber-primary/20 text-cyber-accent border-l-2 border-cyber-primary'
                      : 'text-cyber-secondary hover:bg-cyber-primary/10 hover:text-cyber-primary border-l-2 border-transparent'
                  }`}
                  role="menuitem"
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span className="font-semibold tracking-wider">{item.label}</span>
                  <span className="ml-auto w-1.5 h-1.5 bg-cyber-primary rounded-full animate-pulse shadow-lg shadow-cyber-primary/50" aria-label="Live"></span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-3 border-t-2 border-cyber-primary/30">
          <div className="mb-2 px-3">
            <p className="text-[10px] font-bold text-cyber-secondary uppercase tracking-widest font-mono">
              ► SECURITY TOOLS
            </p>
          </div>
          <div className="space-y-1" role="menu" aria-label="Security tools">
            {toolsItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleViewChange(item.id)}
                  onKeyDown={(e) => handleKeyDown(e, item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 transition-all font-mono text-xs ${
                    isActive
                      ? 'bg-cyber-primary/20 text-cyber-accent border-l-2 border-cyber-primary'
                      : 'text-cyber-secondary hover:bg-cyber-primary/10 hover:text-cyber-primary border-l-2 border-transparent'
                  }`}
                  role="menuitem"
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span className="font-semibold tracking-wider">{item.label}</span>
                  <span className="ml-auto w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50" aria-label="Active"></span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-3 border-t-2 border-cyber-primary/30">
          <div className="mb-2 px-3">
            <p className="text-[10px] font-bold text-cyber-secondary uppercase tracking-widest font-mono">
              ► ENTERPRISE SOC
            </p>
          </div>
          <div className="space-y-1" role="menu" aria-label="Enterprise automation">
            {enterpriseItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleViewChange(item.id)}
                  onKeyDown={(e) => handleKeyDown(e, item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 transition-all font-mono text-xs ${
                    isActive
                      ? 'bg-cyber-primary/20 text-cyber-accent border-l-2 border-cyber-primary'
                      : 'text-cyber-secondary hover:bg-cyber-primary/10 hover:text-cyber-primary border-l-2 border-transparent'
                  }`}
                  role="menuitem"
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span className="font-semibold tracking-wider">{item.label}</span>
                  <span className="ml-auto w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse shadow-lg shadow-yellow-400/50" aria-label="Enterprise"></span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-3 border-t-2 border-cyber-primary/30">
          <div className="mb-2 px-3">
            <p className="text-[10px] font-bold text-cyber-secondary uppercase tracking-widest font-mono">
              ► PROFESSIONAL DEV
            </p>
          </div>
          <div className="space-y-1" role="menu" aria-label="Professional development">
            {professionalItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleViewChange(item.id)}
                  onKeyDown={(e) => handleKeyDown(e, item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 transition-all font-mono text-xs ${
                    isActive
                      ? 'bg-cyber-primary/20 text-cyber-accent border-l-2 border-cyber-primary'
                      : 'text-cyber-secondary hover:bg-cyber-primary/10 hover:text-cyber-primary border-l-2 border-transparent'
                  }`}
                  role="menuitem"
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span className="font-semibold tracking-wider">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 border-t-2 border-cyber-primary/30 bg-gradient-to-t from-cyber-primary/5 to-transparent">
        <div className="bg-cyber-bg border-2 border-cyber-primary/70 rounded p-3 font-mono text-sm shadow-lg shadow-cyber-primary/20" role="status" aria-label="System status">
          <div className="flex justify-between mb-2">
            <span className="text-cyber-primary font-bold">STATUS:</span>
            <span className="text-cyber-secondary font-bold animate-pulse">ONLINE</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-cyber-primary font-bold">LEVEL:</span>
            <span className="text-red-400 font-bold">ROOT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyber-primary font-bold">UPTIME:</span>
            <span className="text-cyber-secondary font-bold" aria-live="polite">
              {new Date().toLocaleTimeString('en-US', { hour12: false })}
            </span>
          </div>
        </div>
        <div className="mt-3 text-center">
          {user && userProfile ? (
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-cyber-secondary text-sm font-mono font-bold bg-cyber-primary/5 px-3 py-2 rounded border border-cyber-primary/30 shadow-md shadow-cyber-primary/10">
                <Terminal className="w-4 h-4" aria-hidden="true" />
                <span className="animate-flicker">{userProfile.full_name.toUpperCase()}</span>
              </div>
              <button
                onClick={async () => {
                  await signOut();
                  handleViewChange('dashboard');
                }}
                className="w-full flex items-center justify-center gap-2 text-xs text-cyber-secondary hover:text-cyber-primary transition-colors py-1 px-2 rounded hover:bg-cyber-primary/10 font-mono"
                aria-label="Sign out"
              >
                <LogOut className="w-3 h-3" />
                <span>SIGN OUT</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-cyber-secondary text-sm font-mono font-bold bg-cyber-primary/5 px-3 py-2 rounded border border-cyber-primary/30 shadow-md shadow-cyber-primary/10">
                <Terminal className="w-4 h-4" aria-hidden="true" />
                <span className="animate-flicker">ANONYMOUS@DEFENSE</span>
              </div>
              <button
                onClick={() => handleViewChange('login')}
                className="w-full flex items-center justify-center gap-2 text-xs text-cyber-secondary hover:text-cyber-primary transition-colors py-1 px-2 rounded hover:bg-cyber-primary/10 font-mono"
                aria-label="Sign in"
              >
                <LogIn className="w-3 h-3" />
                <span>SIGN IN</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
    </>
  );
}
