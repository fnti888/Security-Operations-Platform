import { useEffect } from 'react';
import { Shield, Terminal, Code, ChevronRight, Github, Linkedin, Mail } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

export function LandingPage({ onEnter }: LandingPageProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onEnter();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onEnter]);

  return (
    <div className="min-h-screen bg-cyber-bg text-cyber-primary overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-12 md:mb-20 animate-fade-in">
          <div className="flex justify-center mb-6">
            <img
              src="/image-new.png"
              alt="Defense Terminal"
              className="w-48 md:w-72 h-auto object-contain animate-fingerprint"
            />
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 font-mono cyber-glow">
            DEFENSE TERMINAL
          </h1>
          <p className="text-lg md:text-2xl text-cyber-secondary font-mono max-w-3xl mx-auto leading-relaxed">
            Enterprise-Grade Security Operations & Threat Intelligence Platform
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs md:text-sm font-mono text-cyber-primary/70">
            <span className="px-3 py-1 border border-cyber-primary/30 rounded">Real-Time Monitoring</span>
            <span className="px-3 py-1 border border-cyber-primary/30 rounded">Digital Forensics</span>
            <span className="px-3 py-1 border border-cyber-primary/30 rounded">Incident Response</span>
            <span className="px-3 py-1 border border-cyber-primary/30 rounded">MITRE ATT&CK</span>
          </div>
        </header>

        {/* Hero CTA */}
        <div className="text-center mb-16 md:mb-24 animate-slide-up">
          <button
            onClick={onEnter}
            className="cyber-button-primary px-10 py-5 text-xl font-bold font-mono inline-flex items-center gap-3 group shadow-lg shadow-cyber-primary/20"
            aria-label="Enter the platform"
          >
            ENTER TERMINAL
            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="mt-4 text-cyber-secondary text-sm font-mono">
            Auto-loading in 2 seconds...
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-16 md:mb-24">
          <div className="cyber-card p-6 md:p-8 animate-slide-up hover:scale-105 transition-transform" style={{ animationDelay: '0.1s' }}>
            <Shield className="w-14 h-14 text-cyber-primary mb-6" />
            <h3 className="text-xl md:text-2xl font-bold mb-3 font-mono">Threat Intelligence</h3>
            <p className="text-cyber-secondary font-mono text-sm md:text-base leading-relaxed">
              Real-time monitoring of global threats with live attack feeds, country-based statistics, and MITRE ATT&CK framework mapping
            </p>
            <ul className="mt-4 space-y-2 text-cyber-secondary/80 text-xs md:text-sm font-mono">
              <li>→ Live attack visualization</li>
              <li>→ Geographic threat mapping</li>
              <li>→ Attack pattern analysis</li>
            </ul>
          </div>

          <div className="cyber-card p-6 md:p-8 animate-slide-up hover:scale-105 transition-transform" style={{ animationDelay: '0.2s' }}>
            <Terminal className="w-14 h-14 text-cyber-primary mb-6" />
            <h3 className="text-xl md:text-2xl font-bold mb-3 font-mono">Digital Forensics</h3>
            <p className="text-cyber-secondary font-mono text-sm md:text-base leading-relaxed">
              Comprehensive forensics suite with network monitoring, memory analysis, timeline reconstruction, and evidence management
            </p>
            <ul className="mt-4 space-y-2 text-cyber-secondary/80 text-xs md:text-sm font-mono">
              <li>→ Network packet capture</li>
              <li>→ Memory forensics tools</li>
              <li>→ Evidence chain custody</li>
            </ul>
          </div>

          <div className="cyber-card p-6 md:p-8 animate-slide-up hover:scale-105 transition-transform" style={{ animationDelay: '0.3s' }}>
            <Code className="w-14 h-14 text-cyber-primary mb-6" />
            <h3 className="text-xl md:text-2xl font-bold mb-3 font-mono">Incident Management</h3>
            <p className="text-cyber-secondary font-mono text-sm md:text-base leading-relaxed">
              Full incident response workflow with classification, investigation tracking, and comprehensive reporting capabilities
            </p>
            <ul className="mt-4 space-y-2 text-cyber-secondary/80 text-xs md:text-sm font-mono">
              <li>→ Incident tracking dashboard</li>
              <li>→ Multi-format exports</li>
              <li>→ Custom analytics views</li>
            </ul>
          </div>
        </div>

        {/* Platform Showcase */}
        <div className="mb-16 md:mb-24 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 font-mono cyber-glow">
            Platform Capabilities
          </h2>
          <div className="grid md:grid-cols-2 gap-8 md:gap-12">
            <div className="cyber-card p-6 md:p-8">
              <h4 className="text-lg md:text-xl font-bold mb-4 font-mono text-cyber-primary">🎯 Real-Time Operations</h4>
              <ul className="space-y-3 text-cyber-secondary font-mono text-sm md:text-base">
                <li>• Live threat feed with geolocation</li>
                <li>• Active incident monitoring</li>
                <li>• System & network health metrics</li>
                <li>• Automated alert generation</li>
              </ul>
            </div>
            <div className="cyber-card p-6 md:p-8">
              <h4 className="text-lg md:text-xl font-bold mb-4 font-mono text-cyber-primary">🔍 Investigation Tools</h4>
              <ul className="space-y-3 text-cyber-secondary font-mono text-sm md:text-base">
                <li>• Forensic timeline builder</li>
                <li>• Memory dump analysis</li>
                <li>• Network traffic inspection</li>
                <li>• Evidence locker with chain of custody</li>
              </ul>
            </div>
            <div className="cyber-card p-6 md:p-8">
              <h4 className="text-lg md:text-xl font-bold mb-4 font-mono text-cyber-primary">📊 Analytics & Reporting</h4>
              <ul className="space-y-3 text-cyber-secondary font-mono text-sm md:text-base">
                <li>• Custom dashboard views</li>
                <li>• Export to PDF, CSV, JSON</li>
                <li>• Trend analysis & statistics</li>
                <li>• MITRE ATT&CK integration</li>
              </ul>
            </div>
            <div className="cyber-card p-6 md:p-8">
              <h4 className="text-lg md:text-xl font-bold mb-4 font-mono text-cyber-primary">⚡ Modern Tech Stack</h4>
              <ul className="space-y-3 text-cyber-secondary font-mono text-sm md:text-base">
                <li>• React 18 + TypeScript</li>
                <li>• Supabase (PostgreSQL + Auth)</li>
                <li>• Real-time subscriptions</li>
                <li>• Responsive design (mobile-ready)</li>
              </ul>
            </div>
          </div>
        </div>

        <footer className="border-t-2 border-cyber-primary/30 pt-8 mt-16">
          <div className="text-center mb-6">
            <h4 className="text-lg font-bold mb-4 font-mono text-cyber-primary">
              CONNECT WITH ME
            </h4>
            <div className="flex justify-center gap-4">
              <a
                href="https://github.com/cyberforensics"
                target="_blank"
                rel="noopener noreferrer"
                className="cyber-icon-button"
                aria-label="GitHub Profile"
              >
                <Github className="w-6 h-6" />
              </a>
              <a
                href="https://linkedin.com/in/cybersecurity-professional"
                target="_blank"
                rel="noopener noreferrer"
                className="cyber-icon-button"
                aria-label="LinkedIn Profile"
              >
                <Linkedin className="w-6 h-6" />
              </a>
              <a
                href="mailto:security@cyberforensics.io"
                className="cyber-icon-button"
                aria-label="Email Contact"
              >
                <Mail className="w-6 h-6" />
              </a>
            </div>
          </div>
          <div className="text-center text-cyber-secondary font-mono text-sm">
            <p>DEFENSE TERMINAL v3.7.9-ELITE</p>
            <p className="mt-2">Built with React + Vite + Supabase</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
