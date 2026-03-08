import { useState, useEffect } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { Footer } from './components/Layout/Footer';
import { Dashboard } from './components/Dashboard/Dashboard';
import { IncidentsView } from './components/Incidents/IncidentsView';
import { ThreatsView } from './components/Threats/ThreatsView';
import { AnalyticsView } from './components/Analytics/AnalyticsView';
import { NetworkMonitor } from './components/Forensics/NetworkMonitor';
import { SystemMonitor } from './components/Forensics/SystemMonitor';
import { ForensicTimeline } from './components/Forensics/ForensicTimeline';
import { MemoryForensics } from './components/Forensics/MemoryForensics';
import { EvidenceLocker } from './components/Forensics/EvidenceLocker';
import { NetworkScanner } from './components/NetworkScanner/NetworkScanner';
import { VulnerabilityScanner } from './components/VulnerabilityScanner/VulnerabilityScanner';
import { SSLAnalyzer } from './components/SSLAnalyzer/SSLAnalyzer';
import { SecurityPostureDashboard } from './components/SecurityPosture/SecurityPostureDashboard';
import { WhoisLookupEnhanced } from './components/WhoisLookup/WhoisLookupEnhanced';
import IPScore from './components/IPScore/IPScore';
import { PacketAnalyzer } from './components/PacketAnalyzer/PacketAnalyzer';
import { PublicResume } from './components/Resume/PublicResume';
import { ResumeManager } from './components/Resume/ResumeManager';
import { LandingPage } from './components/Landing/LandingPage';
import { AuthPage } from './components/Auth/AuthPage';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { GlobalSearch } from './components/Search/GlobalSearch';
import { KeyboardShortcuts } from './components/Layout/KeyboardShortcuts';
import { AutomationCenter } from './components/Automation/AutomationCenter';
import { ThreatHuntingCenter } from './components/ThreatHunting/ThreatHuntingCenter';
import { SmartAlerts } from './components/Alerts/SmartAlerts';
import { SecurityPortfolio } from './components/Portfolio/SecurityPortfolio';
import { IncidentPlaybooks } from './components/Playbooks/IncidentPlaybooks';
import { SkillsLab } from './components/Skills/SkillsLab';
import { Terminal, Menu, X, Settings } from 'lucide-react';
import { trackActivity } from './lib/activityTracking';
import { useAuth } from './contexts/AuthContext';

function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [bootText, setBootText] = useState<string[]>([]);

  useEffect(() => {
    const bootMessages = [
      '> INITIALIZING DEFENSE TERMINAL...',
      '> LOADING KERNEL MODULES...',
      '> MOUNTING ENCRYPTED FILESYSTEMS...',
      '> ESTABLISHING SECURE CONNECTION...',
      '> BYPASSING FIREWALL [████████] 100%',
      '> LOADING FORENSICS TOOLS...',
      '> SYSTEM READY',
      '> ACCESS GRANTED',
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index < bootMessages.length) {
        setBootText((prev) => [...prev, bootMessages[index]]);
        index++;
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 500);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-cyber-bg flex items-center justify-center p-4">
      <div className="w-full max-w-2xl" role="status" aria-live="polite">
        <div className="mb-8 text-center">
          <div className="inline-block p-4 border-2 border-cyber-primary rounded">
            <Terminal className="w-16 h-16 text-cyber-primary" />
          </div>
          <div className="mt-4 font-mono">
            <div className="text-cyber-primary text-2xl mb-2">DEFENSE TERMINAL</div>
            <div className="text-cyber-secondary text-sm">DIGITAL INVESTIGATION PLATFORM</div>
          </div>
        </div>
        <div className="bg-cyber-bg border-2 border-cyber-primary rounded-lg p-6 font-mono text-sm">
          {bootText.map((line, idx) => (
            <div
              key={idx}
              className="text-cyber-secondary mb-1 animate-fade-in"
            >
              {line}
            </div>
          ))}
          <div className="text-cyber-primary mt-2 terminal-cursor"></div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const { user, userProfile, loading, signOut } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [booted, setBooted] = useState(false);
  const [showLanding, setShowLanding] = useState(() => {
    return !localStorage.getItem('landing-seen');
  });
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handlePathChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePathChange);
    return () => window.removeEventListener('popstate', handlePathChange);
  }, []);

  useEffect(() => {
    trackActivity({
      actionType: 'view_change',
      viewName: activeView,
    });
  }, [activeView]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleEnterTerminal = () => {
    localStorage.setItem('landing-seen', 'true');
    setShowLanding(false);
  };

  if (currentPath === '/resume' || currentPath === '/resume/') {
    return <PublicResume />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-bg flex items-center justify-center">
        <div className="text-cyber-primary text-xl font-mono">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onSuccess={() => window.location.reload()} />;
  }

  if (user && userProfile && !userProfile.is_admin) {
    return (
      <div className="min-h-screen bg-cyber-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full border-2 border-red-500 rounded-lg p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠</div>
          <h1 className="text-2xl font-mono text-cyber-primary mb-4">ACCESS DENIED</h1>
          <p className="text-cyber-secondary mb-6">
            This system is restricted to administrators only. Your account does not have the required permissions.
          </p>
          <button
            onClick={async () => {
              await signOut();
              window.location.reload();
            }}
            className="px-6 py-2 border-2 border-cyber-primary text-cyber-primary hover:bg-cyber-primary hover:text-cyber-bg transition-all font-mono"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (showLanding) {
    return <LandingPage onEnter={handleEnterTerminal} />;
  }

  if (!booted) {
    return <BootSequence onComplete={() => setBooted(true)} />;
  }

  return (
    <div className="flex h-screen bg-cyber-bg">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-cyber-bg border-2 border-cyber-primary/50 rounded text-cyber-primary hover:bg-cyber-primary/20 transition-all"
        aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <button
        onClick={() => setSettingsOpen(true)}
        className="fixed top-4 right-4 z-40 p-2 bg-cyber-bg border-2 border-cyber-primary/50 rounded text-cyber-primary hover:bg-cyber-primary/20 transition-all"
        aria-label="Open settings"
        title="Settings"
      >
        <Settings className="w-6 h-6" />
      </button>

      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="flex-1 overflow-y-auto flex flex-col" role="main">
        <div className="flex-1">
          {activeView === 'dashboard' && <Dashboard />}
          {activeView === 'incidents' && <IncidentsView />}
          {activeView === 'threats' && <ThreatsView />}
          {activeView === 'analytics' && <AnalyticsView />}
          {activeView === 'network' && <NetworkMonitor />}
          {activeView === 'system' && <SystemMonitor />}
          {activeView === 'timeline' && <ForensicTimeline />}
          {activeView === 'memory' && <MemoryForensics />}
          {activeView === 'evidence' && <EvidenceLocker />}
          {activeView === 'scanner' && <NetworkScanner />}
          {activeView === 'vulnerabilities' && <VulnerabilityScanner />}
          {activeView === 'ssl-analyzer' && <SSLAnalyzer />}
          {activeView === 'security-posture' && <SecurityPostureDashboard />}
          {activeView === 'whois' && <WhoisLookupEnhanced />}
          {activeView === 'ip-score' && <IPScore />}
          {activeView === 'packet-analyzer' && <PacketAnalyzer />}
          {activeView === 'resume' && <ResumeManager />}
          {activeView === 'automation' && <AutomationCenter />}
          {activeView === 'threat-hunting' && <ThreatHuntingCenter />}
          {activeView === 'smart-alerts' && <SmartAlerts />}
          {activeView === 'portfolio' && <SecurityPortfolio />}
          {activeView === 'playbooks' && <IncidentPlaybooks />}
          {activeView === 'skills-lab' && <SkillsLab />}
        </div>
        <Footer />
      </main>

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <GlobalSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={(view) => {
          setActiveView(view);
        }}
      />
      <KeyboardShortcuts />
    </div>
  );
}

export default App;
