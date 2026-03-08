import { Linkedin, FileText, Github } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AnimatedCounter } from './AnimatedCounter';
import { useTheme } from '../../contexts/ThemeContext';

interface CountryStats {
  country_code: string;
  country_name: string;
  country_flag: string;
  total_attacks: number;
  last_attack_time: string;
  risk_score?: number;
  threat_level?: string;
  attack_sophistication?: number;
}

export function Footer() {
  const [countryStats, setCountryStats] = useState<CountryStats[]>([]);
  const [totalBlocked, setTotalBlocked] = useState(0);
  const [flashingCountry, setFlashingCountry] = useState<string | null>(null);
  const { reduceMotion } = useTheme();

  useEffect(() => {
    fetchCountryStats();

    const channel = supabase
      .channel('country_stats_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'country_attack_stats',
        },
        (payload) => {
          const updatedCountry = payload.new as CountryStats;
          setCountryStats((prev) => {
            const updated = prev.map((c) =>
              c.country_code === updatedCountry.country_code ? updatedCountry : c
            );
            return updated;
          });

          if (!reduceMotion) {
            setFlashingCountry(updatedCountry.country_code);
            setTimeout(() => setFlashingCountry(null), 1000);
          }
        }
      )
      .subscribe();

    const simulateInterval = setInterval(() => {
      simulateAttack();
    }, 2000);

    return () => {
      channel.unsubscribe();
      clearInterval(simulateInterval);
    };
  }, [reduceMotion]);

  // Recalculate total whenever country stats change to ensure sync
  useEffect(() => {
    const total = countryStats.reduce((sum, c) => sum + c.total_attacks, 0);
    setTotalBlocked(total);
  }, [countryStats]);

  const fetchCountryStats = async () => {
    const { data, error } = await supabase
      .from('country_attack_stats')
      .select('*')
      .order('risk_score', { ascending: false });

    if (data && !error) {
      setCountryStats(data);
      const total = data.reduce((sum, c) => sum + c.total_attacks, 0);
      setTotalBlocked(total);
    }
  };

  const simulateAttack = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      await fetch(`${supabaseUrl}/functions/v1/simulate-attacks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Failed to simulate attack:', error);
    }
  };

  return (
    <footer className="bg-cyber-bg border-t border-cyber-primary/30 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-center gap-12 font-mono flex-wrap">
          <a
            href="https://www.linkedin.com/in/frank-nti-/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 text-cyber-secondary hover:text-cyber-primary transition-all duration-300 border border-cyber-primary/30 hover:border-cyber-primary px-6 py-4 rounded bg-cyber-bg/50 hover:bg-cyber-primary/10 hover:scale-110 hover:shadow-lg hover:shadow-cyber-primary/50"
            aria-label="Connect on LinkedIn"
          >
            <Linkedin className="w-10 h-10 group-hover:scale-125 transition-transform duration-300" aria-hidden="true" />
            <span className="text-xl font-bold tracking-wider group-hover:tracking-widest transition-all duration-300">
              LINKEDIN
            </span>
            <span className="text-cyber-primary text-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              &gt;&gt;
            </span>
          </a>

          <div className="text-cyber-primary/50 text-2xl" aria-hidden="true">|</div>

          <a
            href="https://github.com/fnti888/Security-Operations-Platform"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 text-cyber-secondary hover:text-cyber-primary transition-all duration-300 border border-cyber-primary/30 hover:border-cyber-primary px-6 py-4 rounded bg-cyber-bg/50 hover:bg-cyber-primary/10 hover:scale-110 hover:shadow-lg hover:shadow-cyber-primary/50"
            aria-label="View GitHub repository"
          >
            <Github className="w-10 h-10 group-hover:scale-125 transition-transform duration-300" aria-hidden="true" />
            <span className="text-xl font-bold tracking-wider group-hover:tracking-widest transition-all duration-300">
              GITHUB
            </span>
            <span className="text-cyber-primary text-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              &gt;&gt;
            </span>
          </a>

          <div className="text-cyber-primary/50 text-2xl" aria-hidden="true">|</div>

          <a
            href="/resume"
            className="group flex items-center gap-4 text-cyber-secondary hover:text-cyber-primary transition-all duration-300 border border-cyber-primary/30 hover:border-cyber-primary px-6 py-4 rounded bg-cyber-bg/50 hover:bg-cyber-primary/10 hover:scale-110 hover:shadow-lg hover:shadow-cyber-primary/50"
            aria-label="View resume"
          >
            <FileText className="w-10 h-10 group-hover:scale-125 transition-transform duration-300" aria-hidden="true" />
            <span className="text-xl font-bold tracking-wider group-hover:tracking-widest transition-all duration-300">
              RESUME
            </span>
            <span className="text-cyber-primary text-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              &gt;&gt;
            </span>
          </a>
        </div>

        {/* Attack Monitoring Section */}
        <div className="mt-8 border-t border-green-500/30 pt-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-red-500/5 animate-pulse"></div>

          <div className="relative">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-red-950/50 via-black to-red-950/50 border border-red-500/50 rounded-lg shadow-lg shadow-red-500/20">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500 blur-xl opacity-50 animate-pulse"></div>
                  <span className="relative text-red-400 text-2xl animate-pulse">⚠</span>
                </div>
                <span className="text-red-400 font-bold text-lg font-mono tracking-wider">
                  LIVE ATTACK MONITORING
                </span>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                <span className="text-green-400 font-bold text-lg font-mono tracking-wider">
                  BLOCKED THREATS
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {countryStats.map((country, idx) => {
                const riskScore = country.risk_score || 50;
                const threatLevel = country.threat_level || 'MODERATE';
                const sophistication = country.attack_sophistication || 5;

                // Determine border and glow colors based on threat level
                const getThreatColors = (level: string) => {
                  switch (level) {
                    case 'CRITICAL':
                      return {
                        border: 'border-red-600',
                        shadow: 'shadow-red-600/70',
                        hoverShadow: 'hover:shadow-red-600/90',
                        glow: 'from-red-600/20 via-red-500/10 to-red-600/20',
                        text: 'text-red-500',
                        badge: 'bg-red-950/80 border-red-600'
                      };
                    case 'HIGH':
                      return {
                        border: 'border-orange-600',
                        shadow: 'shadow-orange-600/60',
                        hoverShadow: 'hover:shadow-orange-600/80',
                        glow: 'from-orange-600/20 via-orange-500/10 to-orange-600/20',
                        text: 'text-orange-500',
                        badge: 'bg-orange-950/80 border-orange-600'
                      };
                    case 'ELEVATED':
                      return {
                        border: 'border-yellow-600',
                        shadow: 'shadow-yellow-600/50',
                        hoverShadow: 'hover:shadow-yellow-600/70',
                        glow: 'from-yellow-600/20 via-yellow-500/10 to-yellow-600/20',
                        text: 'text-yellow-500',
                        badge: 'bg-yellow-950/80 border-yellow-600'
                      };
                    default:
                      return {
                        border: 'border-blue-600',
                        shadow: 'shadow-blue-600/40',
                        hoverShadow: 'hover:shadow-blue-600/60',
                        glow: 'from-blue-600/20 via-blue-500/10 to-blue-600/20',
                        text: 'text-blue-500',
                        badge: 'bg-blue-950/80 border-blue-600'
                      };
                  }
                };

                const colors = getThreatColors(threatLevel);

                return (
                  <div
                    key={country.country_code}
                    className={`relative bg-gradient-to-br from-black via-red-950/20 to-black border-2 rounded-lg p-3 hover:scale-105 transition-all duration-300 group ${colors.border} ${colors.shadow} ${colors.hoverShadow} ${
                      flashingCountry === country.country_code
                        ? 'scale-105 shadow-2xl'
                        : ''
                    }`}
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${colors.glow} transition-opacity duration-300 rounded-lg ${
                      flashingCountry === country.country_code ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}></div>

                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xl">{country.country_flag}</span>
                          <span className={`${colors.text} font-bold text-xs font-mono`}>{country.country_code}</span>
                        </div>
                        <div className="relative">
                          <div className={`w-2 h-2 ${colors.text.replace('text-', 'bg-')} rounded-full ${
                            flashingCountry === country.country_code ? 'animate-ping' : 'animate-pulse'
                          }`}></div>
                          <div className={`absolute inset-0 ${colors.text.replace('text-', 'bg-')} rounded-full animate-ping`}></div>
                        </div>
                      </div>

                      <div className="text-green-400 text-[11px] font-mono mb-2 tracking-wide">
                        {country.country_name.toUpperCase()}
                      </div>

                      {/* Risk Score Badge */}
                      <div className={`mb-2 px-2 py-0.5 rounded border ${colors.badge} flex items-center justify-between`}>
                        <span className="text-[9px] font-mono text-slate-300">RISK</span>
                        <span className={`text-xs font-bold font-mono ${colors.text}`}>{riskScore}</span>
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className={`${colors.text} font-bold text-lg font-mono group-hover:scale-110 transition-transform`}>
                            <AnimatedCounter
                              value={country.total_attacks}
                              className={flashingCountry === country.country_code ? 'scale-125' : ''}
                            />
                          </div>
                          <div className="text-green-500 text-[10px] font-mono font-bold mt-0.5 tracking-wider">
                            BLOCKED
                          </div>
                        </div>
                        <div className={`${colors.text} opacity-50 text-xs font-mono`}>
                          {'▓'.repeat(Math.min(sophistication, 10))}
                        </div>
                      </div>

                      {/* Threat Level Progress Bar */}
                      <div className="mt-2 h-1.5 bg-black rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full bg-gradient-to-r ${colors.text.replace('text-', 'from-')} ${colors.text.replace('text-', 'to-').replace('500', '400')} rounded-full animate-pulse`}
                          style={{ width: `${riskScore}%` }}
                        ></div>
                      </div>

                      {/* Sophistication Indicator */}
                      <div className="mt-1 text-[9px] font-mono text-slate-500 text-center">
                        {threatLevel}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-center gap-8 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-400">ACTIVE THREATS</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-400">SYSTEM PROTECTED</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500/60">TOTAL BLOCKED:</span>
                <span className="text-green-400 font-bold">
                  <AnimatedCounter value={totalBlocked} />
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-cyber-primary/40 text-xs font-mono">
          <span className={reduceMotion ? '' : 'animate-blink'}>▋</span> DEFENSE TERMINAL v1.0.0{' '}
          <span className={reduceMotion ? '' : 'animate-blink'}>▋</span>
        </div>
      </div>
    </footer>
  );
}
