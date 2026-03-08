import React, { useState, useEffect } from 'react';
import { Shield, Search, AlertTriangle, CheckCircle, XCircle, Globe, Server, Wifi, Activity, Database, Download, TrendingUp, GitCompare, Bell, Map, BarChart3, FileText, Upload, Play, Pause, Trash2, Eye, Network, Lock, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { trackActivity } from '../../lib/activityTracking';

interface IPScoreResult {
  ip_address: string;
  score: number;
  risk_level: string;
  is_vpn: boolean;
  is_proxy: boolean;
  is_tor: boolean;
  is_hosting: boolean;
  country?: string;
  country_code?: string;
  city?: string;
  region?: string;
  isp?: string;
  asn?: string;
  organization?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  abuse_score: number;
  blacklists: string[];
  threat_types: string[];
  scan_metadata: Record<string, unknown>;
}

interface BatchScan {
  id: string;
  name: string;
  status: string;
  total_ips: number;
  completed_ips: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  created_at: string;
}

interface IPAlert {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    min_abuse_score?: number;
    risk_levels?: string[];
    threat_types?: string[];
    is_tor?: boolean;
    is_vpn?: boolean;
  };
}

interface AlertHistory {
  id: string;
  ip_address: string;
  alert_data: any;
  acknowledged: boolean;
  created_at: string;
}

interface ReputationTrend {
  ip_address: string;
  score: number;
  risk_level: string;
  abuse_score: number;
  recorded_at: string;
}

type ViewMode = 'lookup' | 'batch' | 'comparison' | 'trends' | 'alerts' | 'map';

export default function IPScore() {
  const [viewMode, setViewMode] = useState<ViewMode>('lookup');
  const [ipAddress, setIpAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IPScoreResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<IPScoreResult[]>([]);

  const [batchIPs, setBatchIPs] = useState('');
  const [batchScans, setBatchScans] = useState<BatchScan[]>([]);
  const [currentBatchScan, setCurrentBatchScan] = useState<BatchScan | null>(null);

  const [comparisonIPs, setComparisonIPs] = useState<string[]>(['', '']);
  const [comparisonResults, setComparisonResults] = useState<IPScoreResult[]>([]);

  const [selectedIPForTrends, setSelectedIPForTrends] = useState('');
  const [trends, setTrends] = useState<ReputationTrend[]>([]);

  const [alerts, setAlerts] = useState<IPAlert[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([]);
  const [showNewAlertForm, setShowNewAlertForm] = useState(false);

  const getCountryFlagUrl = (countryCode?: string, size: number = 80) => {
    if (!countryCode || countryCode.length !== 2) return null;
    return `https://flagcdn.com/w${size}/${countryCode.toLowerCase()}.png`;
  };

  const getCountryRiskLevel = (countryCode?: string) => {
    const highRiskCountries = ['CN', 'RU', 'KP', 'IR'];
    const mediumRiskCountries = ['VN', 'IN', 'BR', 'PK'];

    if (!countryCode) return 'unknown';
    if (highRiskCountries.includes(countryCode.toUpperCase())) return 'high';
    if (mediumRiskCountries.includes(countryCode.toUpperCase())) return 'medium';
    return 'low';
  };

  const loadHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      let query = supabase
        .from('ip_score_lookups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (user) {
        query = query.eq('created_by', user.id);
      } else {
        query = query.is('created_by', null);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      if (data) {
        setHistory(data);
      }
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  const loadBatchScans = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from('ip_batch_scans')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      if (data) setBatchScans(data);
    } catch (err) {
      console.error('Error loading batch scans:', err);
    }
  };

  const loadAlerts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from('ip_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      if (data) setAlerts(data);
    } catch (err) {
      console.error('Error loading alerts:', err);
    }
  };

  const loadAlertHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from('ip_alert_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      if (data) setAlertHistory(data);
    } catch (err) {
      console.error('Error loading alert history:', err);
    }
  };

  useEffect(() => {
    loadHistory();
    loadBatchScans();
    loadAlerts();
    loadAlertHistory();
  }, []);

  const checkCache = async (ip: string): Promise<IPScoreResult | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('ip_reputation_cache')
        .select('*')
        .eq('ip_address', ip)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (data) {
        return {
          ...data,
          blacklists: Array.isArray(data.blacklists) ? data.blacklists : [],
          threat_types: Array.isArray(data.threat_types) ? data.threat_types : [],
          scan_metadata: data.scan_metadata || {},
        };
      }
      return null;
    } catch (err) {
      console.error('Error checking cache:', err);
      return null;
    }
  };

  const saveToCache = async (result: IPScoreResult) => {
    try {
      await supabase.from('ip_reputation_cache').upsert({
        ip_address: result.ip_address,
        score: result.score,
        risk_level: result.risk_level,
        is_vpn: result.is_vpn,
        is_proxy: result.is_proxy,
        is_tor: result.is_tor,
        is_hosting: result.is_hosting,
        country: result.country,
        country_code: result.country_code,
        city: result.city,
        region: result.region,
        isp: result.isp,
        asn: result.asn,
        organization: result.organization,
        timezone: result.timezone,
        latitude: result.latitude,
        longitude: result.longitude,
        abuse_score: result.abuse_score,
        blacklists: result.blacklists,
        threat_types: result.threat_types,
        scan_metadata: result.scan_metadata,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    } catch (err) {
      console.error('Error saving to cache:', err);
    }
  };

  const saveToTrends = async (result: IPScoreResult) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('ip_reputation_trends').insert({
        ip_address: result.ip_address,
        score: result.score,
        risk_level: result.risk_level,
        abuse_score: result.abuse_score,
        is_vpn: result.is_vpn,
        is_proxy: result.is_proxy,
        is_tor: result.is_tor,
        threat_types: result.threat_types,
        blacklists: result.blacklists,
        metadata: result.scan_metadata,
        created_by: user.id,
      });
    } catch (err) {
      console.error('Error saving to trends:', err);
    }
  };

  const checkAlerts = async (result: IPScoreResult) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (const alert of alerts) {
        if (!alert.enabled) continue;

        let triggered = false;
        const conditions = alert.conditions;

        if (conditions.min_abuse_score && result.abuse_score >= conditions.min_abuse_score) {
          triggered = true;
        }
        if (conditions.risk_levels && conditions.risk_levels.includes(result.risk_level)) {
          triggered = true;
        }
        if (conditions.is_tor && result.is_tor) {
          triggered = true;
        }
        if (conditions.is_vpn && result.is_vpn) {
          triggered = true;
        }
        if (conditions.threat_types) {
          const hasMatchingThreat = result.threat_types.some(t =>
            conditions.threat_types?.includes(t)
          );
          if (hasMatchingThreat) triggered = true;
        }

        if (triggered) {
          await supabase.from('ip_alert_history').insert({
            alert_id: alert.id,
            ip_address: result.ip_address,
            alert_data: result,
            created_by: user.id,
          });
        }
      }

      loadAlertHistory();
    } catch (err) {
      console.error('Error checking alerts:', err);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(ipAddress)) {
        throw new Error('Please enter a valid IP address');
      }

      const cached = await checkCache(ipAddress);
      if (cached) {
        setResult(cached);
        setLoading(false);
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ip-score-lookup?ip=${encodeURIComponent(ipAddress)}`;

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch IP score');
      }

      const data = await response.json();
      setResult(data);

      await saveToCache(data);
      await saveToTrends(data);
      await checkAlerts(data);

      // Track analyst activity
      await trackActivity({
        actionType: 'ip_score_lookup',
        viewName: 'IP Score Intelligence',
        metadata: {
          ip_address: data.ip_address,
          score: data.score,
          risk_level: data.risk_level,
          country: data.country,
        }
      });

      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('ip_score_lookups').insert({
        ip_address: data.ip_address,
        score: data.score,
        risk_level: data.risk_level,
        is_vpn: data.is_vpn,
        is_proxy: data.is_proxy,
        is_tor: data.is_tor,
        is_hosting: data.is_hosting,
        country: data.country,
        city: data.city,
        isp: data.isp,
        abuse_score: data.abuse_score,
        blacklists: data.blacklists,
        threat_types: data.threat_types,
        scan_metadata: data.scan_metadata,
        created_by: user?.id || null,
      });

      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchScan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please sign in to use batch scanning');
        return;
      }

      const ips = batchIPs.split('\n').map(ip => ip.trim()).filter(ip => ip);
      if (ips.length === 0) {
        setError('Please enter at least one IP address');
        return;
      }

      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      const invalidIPs = ips.filter(ip => !ipRegex.test(ip));
      if (invalidIPs.length > 0) {
        setError(`Invalid IP addresses: ${invalidIPs.join(', ')}`);
        return;
      }

      const { data: scanData, error: insertError } = await supabase
        .from('ip_batch_scans')
        .insert({
          name: `Batch Scan ${new Date().toLocaleString()}`,
          status: 'running',
          total_ips: ips.length,
          completed_ips: 0,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Track batch scan start
      await trackActivity({
        actionType: 'ip_batch_scan_started',
        viewName: 'IP Score Intelligence',
        metadata: {
          total_ips: ips.length,
          scan_id: scanData.id,
        }
      });

      setCurrentBatchScan(scanData);

      const results = [];
      let completed = 0;
      let highRisk = 0;
      let mediumRisk = 0;
      let lowRisk = 0;

      for (const ip of ips) {
        try {
          const cached = await checkCache(ip);
          let ipResult: IPScoreResult;

          if (cached) {
            ipResult = cached;
          } else {
            const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ip-score-lookup?ip=${encodeURIComponent(ip)}`;
            const response = await fetch(apiUrl, {
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
            });

            if (!response.ok) throw new Error('Failed to fetch IP score');

            ipResult = await response.json();
            await saveToCache(ipResult);
            await saveToTrends(ipResult);
            await checkAlerts(ipResult);
          }

          results.push(ipResult);
          completed++;

          if (ipResult.risk_level === 'high' || ipResult.risk_level === 'critical') {
            highRisk++;
          } else if (ipResult.risk_level === 'medium') {
            mediumRisk++;
          } else {
            lowRisk++;
          }

          await supabase
            .from('ip_batch_scans')
            .update({
              completed_ips: completed,
              high_risk_count: highRisk,
              medium_risk_count: mediumRisk,
              low_risk_count: lowRisk,
              results: results,
            })
            .eq('id', scanData.id);

        } catch (err) {
          console.error(`Error scanning ${ip}:`, err);
        }
      }

      await supabase
        .from('ip_batch_scans')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', scanData.id);

      // Track batch scan completion
      await trackActivity({
        actionType: 'ip_batch_scan_completed',
        viewName: 'IP Score Intelligence',
        metadata: {
          scan_id: scanData.id,
          total_ips: ips.length,
          high_risk: highRisk,
          medium_risk: mediumRisk,
          low_risk: lowRisk,
        }
      });

      loadBatchScans();
      setBatchIPs('');
      setCurrentBatchScan(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch scan failed');
    }
  };

  const handleComparison = async () => {
    try {
      setLoading(true);
      setError('');

      const validIPs = comparisonIPs.filter(ip => ip.trim());
      if (validIPs.length < 2) {
        setError('Please enter at least 2 IP addresses to compare');
        return;
      }

      const results: IPScoreResult[] = [];

      for (const ip of validIPs) {
        const cached = await checkCache(ip);
        if (cached) {
          results.push(cached);
          continue;
        }

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ip-score-lookup?ip=${encodeURIComponent(ip)}`;
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        });

        if (!response.ok) throw new Error(`Failed to fetch data for ${ip}`);

        const data = await response.json();
        await saveToCache(data);
        results.push(data);
      }

      setComparisonResults(results);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('ip_comparisons').insert({
          name: `Comparison ${new Date().toLocaleString()}`,
          ip_addresses: validIPs,
          comparison_data: results,
          created_by: user.id,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  const loadTrends = async () => {
    try {
      if (!selectedIPForTrends) return;

      const { data, error: fetchError } = await supabase
        .from('ip_reputation_trends')
        .select('*')
        .eq('ip_address', selectedIPForTrends)
        .order('recorded_at', { ascending: true });

      if (fetchError) throw fetchError;
      if (data) setTrends(data);
    } catch (err) {
      console.error('Error loading trends:', err);
    }
  };

  const exportToJSON = async (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    await trackActivity({
      actionType: 'ip_score_export',
      viewName: 'IP Score Intelligence',
      metadata: {
        format: 'json',
        filename,
      }
    });
  };

  const exportToCSV = async (data: IPScoreResult[], filename: string) => {
    const headers = ['IP Address', 'Score', 'Risk Level', 'Abuse Score', 'Country', 'City', 'ISP', 'VPN', 'Proxy', 'TOR', 'Hosting'];
    const rows = data.map(item => [
      item.ip_address,
      item.score,
      item.risk_level,
      item.abuse_score,
      item.country || '',
      item.city || '',
      item.isp || '',
      item.is_vpn ? 'Yes' : 'No',
      item.is_proxy ? 'Yes' : 'No',
      item.is_tor ? 'Yes' : 'No',
      item.is_hosting ? 'Yes' : 'No',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    await trackActivity({
      actionType: 'ip_score_export',
      viewName: 'IP Score Intelligence',
      metadata: {
        format: 'csv',
        filename,
        record_count: data.length,
      }
    });
  };

  const createAlert = async (alertData: Partial<IPAlert>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('ip_alerts').insert({
        ...alertData,
        created_by: user.id,
      });

      loadAlerts();
      setShowNewAlertForm(false);
    } catch (err) {
      console.error('Error creating alert:', err);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low':
        return 'text-green-400 bg-green-400/10';
      case 'medium':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'high':
        return 'text-orange-400 bg-orange-400/10';
      case 'critical':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    if (score >= 25) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Shield className="w-8 h-8" />
            IP Score Intelligence Platform
          </h1>
          <p className="text-gray-400 mt-1">Advanced threat intelligence and reputation analysis</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setViewMode('lookup')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            viewMode === 'lookup'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Search className="w-4 h-4" />
          Single Lookup
        </button>
        <button
          onClick={() => setViewMode('batch')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            viewMode === 'batch'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Upload className="w-4 h-4" />
          Batch Scan
        </button>
        <button
          onClick={() => setViewMode('comparison')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            viewMode === 'comparison'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <GitCompare className="w-4 h-4" />
          Compare IPs
        </button>
        <button
          onClick={() => setViewMode('trends')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            viewMode === 'trends'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Reputation Trends
        </button>
        <button
          onClick={() => setViewMode('alerts')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            viewMode === 'alerts'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Bell className="w-4 h-4" />
          Alerts
          {alertHistory.filter(a => !a.acknowledged).length > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
              {alertHistory.filter(a => !a.acknowledged).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setViewMode('map')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            viewMode === 'map'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Map className="w-4 h-4" />
          Threat Map
        </button>
      </div>

      {viewMode === 'lookup' && (
        <>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  IP Address
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    placeholder="Enter IP address (e.g., 8.8.8.8)"
                    className="flex-1 bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Search className="w-4 h-4" />
                    {loading ? 'Checking...' : 'Check IP'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-red-300">{error}</div>
                </div>
              )}
            </form>
          </div>

          {result && (
            <div className="space-y-6">
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => exportToJSON(result, `ip-score-${result.ip_address}.json`)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export JSON
                </button>
                <button
                  onClick={() => exportToCSV([result], `ip-score-${result.ip_address}.csv`)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent" />
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <h3 className="text-lg font-semibold text-white">Overall Score</h3>
                    <Shield className={`w-6 h-6 ${getScoreColor(result.score)}`} />
                  </div>
                  <div className="flex items-center justify-center mb-4 relative z-10">
                    <div className="relative w-32 h-32">
                      <svg className="transform -rotate-90 w-32 h-32">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-gray-700"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 56}`}
                          strokeDashoffset={`${2 * Math.PI * 56 * (1 - result.score / 100)}`}
                          className={getScoreColor(result.score)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className={`text-3xl font-bold ${getScoreColor(result.score)}`}>
                            {result.score}
                          </div>
                          <div className="text-xs text-gray-400">/ 100</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-center relative z-10">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(result.risk_level)}`}>
                      {result.risk_level.toUpperCase()} RISK
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Abuse Score</h3>
                    <AlertTriangle className={`w-6 h-6 ${getScoreColor(100 - result.abuse_score)}`} />
                  </div>
                  <div className="text-4xl font-bold mb-2" style={{ color: getScoreColor(100 - result.abuse_score).split('-')[1] }}>
                    {result.abuse_score}%
                  </div>
                  <div className="text-sm text-gray-400">
                    Confidence of malicious activity
                  </div>
                </div>

                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6 relative overflow-hidden">
                  {result.country_code && getCountryFlagUrl(result.country_code, 320) && (
                    <img
                      src={getCountryFlagUrl(result.country_code, 320)!}
                      alt={result.country || 'Flag'}
                      className="absolute top-0 right-0 w-64 h-auto opacity-5 -mt-4 -mr-4"
                    />
                  )}
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <h3 className="text-lg font-semibold text-white">Location Intelligence</h3>
                    <Globe className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center gap-3">
                      {result.country_code && getCountryFlagUrl(result.country_code, 160) && (
                        <img
                          src={getCountryFlagUrl(result.country_code, 160)!}
                          alt={result.country || 'Flag'}
                          className="w-24 h-auto rounded-md shadow-lg border border-gray-600"
                          title={result.country || 'Unknown Country'}
                        />
                      )}
                      <div className="flex-1">
                        <div className="text-xl font-bold text-white">
                          {result.city || 'Unknown'}, {result.country || 'Unknown'}
                        </div>
                        {result.region && (
                          <div className="text-sm text-gray-400">
                            {result.region}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-700">
                      <div className="text-sm text-gray-400 mb-1">Internet Service Provider</div>
                      <div className="text-white font-medium">{result.isp || 'Unknown ISP'}</div>
                    </div>
                    {result.country_code && (
                      <div className="flex items-center gap-2 pt-2">
                        <span className="text-xs text-gray-400">Country Risk:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          getCountryRiskLevel(result.country_code) === 'high' ? 'bg-red-900/30 text-red-300 border border-red-700' :
                          getCountryRiskLevel(result.country_code) === 'medium' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-700' :
                          'bg-green-900/30 text-green-300 border border-green-700'
                        }`}>
                          {getCountryRiskLevel(result.country_code).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {result.latitude && result.longitude && (
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Map className="w-5 h-5" />
                    Location Map
                  </h3>
                  <div className="aspect-video bg-gray-900 rounded-lg border border-gray-700 flex items-center justify-center relative overflow-hidden">
                    <iframe
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${result.longitude - 0.5},${result.latitude - 0.5},${result.longitude + 0.5},${result.latitude + 0.5}&layer=mapnik&marker=${result.latitude},${result.longitude}`}
                      className="w-full h-full"
                      style={{ border: 0 }}
                    />
                  </div>
                </div>
              )}

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  Technical Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.asn && (
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700 hover:border-blue-600 transition-colors">
                      <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                        <Network className="w-3 h-3" />
                        ASN
                      </div>
                      <div className="text-sm text-white font-mono">{result.asn}</div>
                    </div>
                  )}
                  {result.organization && (
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700 hover:border-blue-600 transition-colors">
                      <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Organization
                      </div>
                      <div className="text-sm text-white font-mono">{result.organization}</div>
                    </div>
                  )}
                  {result.timezone && (
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700 hover:border-blue-600 transition-colors">
                      <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        Timezone
                      </div>
                      <div className="text-sm text-white font-mono">{result.timezone}</div>
                    </div>
                  )}
                  {result.latitude && result.longitude && (
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700 hover:border-blue-600 transition-colors">
                      <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                        <Map className="w-3 h-3" />
                        Coordinates
                      </div>
                      <div className="text-sm text-white font-mono">
                        {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Network className="w-5 h-5 text-purple-400" />
                    Network Intelligence
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-400 mb-1">IP Type</div>
                      <div className="text-sm text-white font-medium">
                        {result.is_hosting ? 'Hosting/Data Center' : result.is_vpn ? 'VPN Service' : result.is_proxy ? 'Proxy Server' : result.is_tor ? 'TOR Exit Node' : 'Residential/Business'}
                      </div>
                    </div>
                    {result.asn && (
                      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                        <div className="text-xs text-gray-400 mb-1">Network Range</div>
                        <div className="text-sm text-white font-mono">
                          ASN {result.asn}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Multiple IPs in this autonomous system
                        </div>
                      </div>
                    )}
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-400 mb-1">Infrastructure Provider</div>
                      <div className="text-sm text-white">
                        {result.organization || result.isp || 'Unknown'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-red-400" />
                    Threat Intelligence
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-400 mb-1">Threat Level</div>
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(result.risk_level)}`}>
                        {result.risk_level.toUpperCase()}
                      </div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-400 mb-1">Abuse Confidence</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              result.abuse_score > 75 ? 'bg-red-500' :
                              result.abuse_score > 50 ? 'bg-orange-500' :
                              result.abuse_score > 25 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${result.abuse_score}%` }}
                          />
                        </div>
                        <span className="text-white font-bold">{result.abuse_score}%</span>
                      </div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-400 mb-1">Detection Flags</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {result.is_vpn && <span className="px-2 py-1 bg-orange-900/30 text-orange-300 rounded text-xs">VPN</span>}
                        {result.is_proxy && <span className="px-2 py-1 bg-orange-900/30 text-orange-300 rounded text-xs">Proxy</span>}
                        {result.is_tor && <span className="px-2 py-1 bg-red-900/30 text-red-300 rounded text-xs">TOR</span>}
                        {result.is_hosting && <span className="px-2 py-1 bg-yellow-900/30 text-yellow-300 rounded text-xs">Hosting</span>}
                        {!result.is_vpn && !result.is_proxy && !result.is_tor && !result.is_hosting && (
                          <span className="px-2 py-1 bg-green-900/30 text-green-300 rounded text-xs">Clean</span>
                        )}
                      </div>
                    </div>
                    {result.blacklists.length > 0 && (
                      <div className="bg-red-900/20 rounded-lg p-3 border border-red-700">
                        <div className="text-xs text-red-400 mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Blacklisted
                        </div>
                        <div className="text-sm text-red-300">
                          Found on {result.blacklists.length} blacklist{result.blacklists.length > 1 ? 's' : ''}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Detection Flags
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${result.is_vpn ? 'bg-orange-900/20 border border-orange-700' : 'bg-gray-900/50 border border-gray-700'}`}>
                    {result.is_vpn ? <XCircle className="w-5 h-5 text-orange-400" /> : <CheckCircle className="w-5 h-5 text-green-400" />}
                    <div>
                      <div className="text-sm font-medium text-white">VPN</div>
                      <div className="text-xs text-gray-400">{result.is_vpn ? 'Detected' : 'Not Detected'}</div>
                    </div>
                  </div>

                  <div className={`flex items-center gap-3 p-3 rounded-lg ${result.is_proxy ? 'bg-orange-900/20 border border-orange-700' : 'bg-gray-900/50 border border-gray-700'}`}>
                    {result.is_proxy ? <XCircle className="w-5 h-5 text-orange-400" /> : <CheckCircle className="w-5 h-5 text-green-400" />}
                    <div>
                      <div className="text-sm font-medium text-white">Proxy</div>
                      <div className="text-xs text-gray-400">{result.is_proxy ? 'Detected' : 'Not Detected'}</div>
                    </div>
                  </div>

                  <div className={`flex items-center gap-3 p-3 rounded-lg ${result.is_tor ? 'bg-red-900/20 border border-red-700' : 'bg-gray-900/50 border border-gray-700'}`}>
                    {result.is_tor ? <XCircle className="w-5 h-5 text-red-400" /> : <CheckCircle className="w-5 h-5 text-green-400" />}
                    <div>
                      <div className="text-sm font-medium text-white">TOR</div>
                      <div className="text-xs text-gray-400">{result.is_tor ? 'Detected' : 'Not Detected'}</div>
                    </div>
                  </div>

                  <div className={`flex items-center gap-3 p-3 rounded-lg ${result.is_hosting ? 'bg-yellow-900/20 border border-yellow-700' : 'bg-gray-900/50 border border-gray-700'}`}>
                    {result.is_hosting ? <Server className="w-5 h-5 text-yellow-400" /> : <CheckCircle className="w-5 h-5 text-green-400" />}
                    <div>
                      <div className="text-sm font-medium text-white">Hosting</div>
                      <div className="text-xs text-gray-400">{result.is_hosting ? 'Detected' : 'Not Detected'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {result.threat_types.length > 0 && (
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                    Detected Threats
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.threat_types.map((threat, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-orange-900/20 border border-orange-700 rounded-full text-sm text-orange-300"
                      >
                        {threat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.blacklists.length > 0 && (
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-red-400" />
                    Blacklist Status
                  </h3>
                  <div className="space-y-2">
                    {result.blacklists.map((blacklist, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-700 rounded-lg"
                      >
                        <XCircle className="w-5 h-5 text-red-400" />
                        <span className="text-sm text-red-300">{blacklist}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {history.length > 0 && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Wifi className="w-5 h-5" />
                Recent Lookups
              </h3>
              <div className="space-y-2">
                {history.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg hover:bg-gray-900/70 transition-colors cursor-pointer"
                    onClick={() => setResult(item)}
                  >
                    <div className="flex items-center gap-3">
                      <Shield className={`w-5 h-5 ${getScoreColor(item.score)}`} />
                      {item.country_code && getCountryFlagUrl(item.country_code, 40) && (
                        <img
                          src={getCountryFlagUrl(item.country_code, 40)!}
                          alt={item.country || 'Flag'}
                          className="w-10 h-auto rounded shadow-sm border border-gray-600"
                          title={item.country}
                        />
                      )}
                      <div>
                        <div className="text-white font-medium">{item.ip_address}</div>
                        <div className="text-sm text-gray-400">
                          {item.city && item.country ? `${item.city}, ${item.country}` : 'Unknown Location'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getScoreColor(item.score)}`}>
                          {item.score}
                        </div>
                        <div className={`text-xs px-2 py-0.5 rounded ${getRiskColor(item.risk_level)}`}>
                          {item.risk_level}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {viewMode === 'batch' && (
        <div className="space-y-6">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Batch IP Scanner</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Enter IP Addresses (one per line)
                </label>
                <textarea
                  value={batchIPs}
                  onChange={(e) => setBatchIPs(e.target.value)}
                  placeholder="8.8.8.8&#10;1.1.1.1&#10;9.9.9.9"
                  rows={10}
                  className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <button
                onClick={handleBatchScan}
                disabled={loading || !batchIPs.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Play className="w-4 h-4" />
                Start Batch Scan
              </button>
            </div>
          </div>

          {currentBatchScan && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Scan Progress</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300"
                      style={{ width: `${(currentBatchScan.completed_ips / currentBatchScan.total_ips) * 100}%` }}
                    />
                  </div>
                  <span className="text-white font-medium">
                    {currentBatchScan.completed_ips} / {currentBatchScan.total_ips}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-400">{currentBatchScan.high_risk_count}</div>
                    <div className="text-sm text-gray-400">High Risk</div>
                  </div>
                  <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-400">{currentBatchScan.medium_risk_count}</div>
                    <div className="text-sm text-gray-400">Medium Risk</div>
                  </div>
                  <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-400">{currentBatchScan.low_risk_count}</div>
                    <div className="text-sm text-gray-400">Low Risk</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {batchScans.length > 0 && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Previous Batch Scans</h3>
              <div className="space-y-2">
                {batchScans.map((scan) => (
                  <div key={scan.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-white">{scan.name}</div>
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        scan.status === 'completed' ? 'bg-green-900/20 border border-green-700 text-green-300' :
                        scan.status === 'running' ? 'bg-blue-900/20 border border-blue-700 text-blue-300' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {scan.status}
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-400">
                      <span>{scan.total_ips} IPs</span>
                      <span className="text-red-400">{scan.high_risk_count} High</span>
                      <span className="text-yellow-400">{scan.medium_risk_count} Medium</span>
                      <span className="text-green-400">{scan.low_risk_count} Low</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'comparison' && (
        <div className="space-y-6">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Compare IP Addresses</h3>
            <div className="space-y-4">
              {comparisonIPs.map((ip, index) => (
                <div key={index} className="flex gap-3">
                  <input
                    type="text"
                    value={ip}
                    onChange={(e) => {
                      const newIPs = [...comparisonIPs];
                      newIPs[index] = e.target.value;
                      setComparisonIPs(newIPs);
                    }}
                    placeholder={`IP Address ${index + 1}`}
                    className="flex-1 bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {index > 1 && (
                    <button
                      onClick={() => setComparisonIPs(comparisonIPs.filter((_, i) => i !== index))}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <div className="flex gap-3">
                <button
                  onClick={() => setComparisonIPs([...comparisonIPs, ''])}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                >
                  Add IP
                </button>
                <button
                  onClick={handleComparison}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <GitCompare className="w-4 h-4" />
                  Compare
                </button>
              </div>
            </div>
          </div>

          {comparisonResults.length > 0 && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Comparison Results</h3>
                <button
                  onClick={() => exportToCSV(comparisonResults, 'ip-comparison.csv')}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr className="text-left text-sm text-gray-400">
                      <th className="p-3">IP Address</th>
                      <th className="p-3">Score</th>
                      <th className="p-3">Risk</th>
                      <th className="p-3">Abuse Score</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">VPN</th>
                      <th className="p-3">TOR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonResults.map((result, index) => (
                      <tr key={index} className="border-t border-gray-700 hover:bg-gray-900/30">
                        <td className="p-3 text-white font-mono">{result.ip_address}</td>
                        <td className="p-3">
                          <span className={`font-bold ${getScoreColor(result.score)}`}>{result.score}</span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${getRiskColor(result.risk_level)}`}>
                            {result.risk_level}
                          </span>
                        </td>
                        <td className="p-3 text-white">{result.abuse_score}%</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {result.country_code && getCountryFlagUrl(result.country_code, 40) && (
                              <img
                                src={getCountryFlagUrl(result.country_code, 40)!}
                                alt={result.country || 'Flag'}
                                className="w-10 h-auto rounded shadow-sm border border-gray-600"
                                title={result.country}
                              />
                            )}
                            <span className="text-gray-300">{result.city}, {result.country}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          {result.is_vpn ? (
                            <XCircle className="w-4 h-4 text-orange-400" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          )}
                        </td>
                        <td className="p-3">
                          {result.is_tor ? (
                            <XCircle className="w-4 h-4 text-red-400" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'trends' && (
        <div className="space-y-6">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Reputation Trends</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={selectedIPForTrends}
                onChange={(e) => setSelectedIPForTrends(e.target.value)}
                placeholder="Enter IP address to view trends"
                className="flex-1 bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={loadTrends}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                Load Trends
              </button>
            </div>
          </div>

          {trends.length > 0 && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Historical Data for {selectedIPForTrends}</h3>
              <div className="space-y-3">
                {trends.map((trend, index) => (
                  <div key={index} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className={`text-2xl font-bold ${getScoreColor(trend.score)}`}>
                            {trend.score}
                          </div>
                          <div className="text-xs text-gray-400">Score</div>
                        </div>
                        <div>
                          <div className="text-lg text-white">{trend.abuse_score}%</div>
                          <div className="text-xs text-gray-400">Abuse</div>
                        </div>
                        <div className={`px-3 py-1 rounded ${getRiskColor(trend.risk_level)}`}>
                          {trend.risk_level}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-400">
                        {new Date(trend.recorded_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'alerts' && (
        <div className="space-y-6">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Alert Configuration</h3>
              <button
                onClick={() => setShowNewAlertForm(!showNewAlertForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Bell className="w-4 h-4" />
                New Alert
              </button>
            </div>

            {showNewAlertForm && (
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 mb-4">
                <h4 className="text-white font-medium mb-3">Create New Alert</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Alert Name"
                    id="alert-name"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    placeholder="Description"
                    id="alert-description"
                    rows={2}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Min Abuse Score</label>
                      <input
                        type="number"
                        placeholder="0-100"
                        id="alert-abuse-score"
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Alert on TOR</label>
                      <input
                        type="checkbox"
                        id="alert-tor"
                        className="mt-2 w-5 h-5"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const name = (document.getElementById('alert-name') as HTMLInputElement).value;
                        const description = (document.getElementById('alert-description') as HTMLTextAreaElement).value;
                        const minAbuseScore = parseInt((document.getElementById('alert-abuse-score') as HTMLInputElement).value) || 0;
                        const alertOnTor = (document.getElementById('alert-tor') as HTMLInputElement).checked;

                        createAlert({
                          name,
                          description,
                          enabled: true,
                          conditions: {
                            min_abuse_score: minAbuseScore > 0 ? minAbuseScore : undefined,
                            is_tor: alertOnTor ? true : undefined,
                          },
                        });
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setShowNewAlertForm(false)}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{alert.name}</div>
                      <div className="text-sm text-gray-400">{alert.description}</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      alert.enabled ? 'bg-green-900/20 border border-green-700 text-green-300' : 'bg-gray-700 text-gray-300'
                    }`}>
                      {alert.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {alertHistory.length > 0 && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Alerts</h3>
              <div className="space-y-2">
                {alertHistory.map((alert) => (
                  <div key={alert.id} className={`bg-gray-900/50 rounded-lg p-4 border ${
                    alert.acknowledged ? 'border-gray-700' : 'border-orange-700'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">{alert.ip_address}</div>
                        <div className="text-sm text-gray-400">
                          {new Date(alert.created_at).toLocaleString()}
                        </div>
                      </div>
                      {!alert.acknowledged && (
                        <button
                          onClick={async () => {
                            await supabase
                              .from('ip_alert_history')
                              .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
                              .eq('id', alert.id);
                            loadAlertHistory();
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'map' && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Map className="w-5 h-5" />
            Global Threat Map
          </h3>
          <div className="aspect-video bg-gray-900 rounded-lg border border-gray-700 flex items-center justify-center">
            <div className="text-center">
              <Globe className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Interactive threat map visualization</p>
              <p className="text-sm text-gray-500 mt-2">Showing locations from recent lookups and scans</p>
            </div>
          </div>

          {history.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.slice(0, 6).map((item, index) => (
                item.latitude && item.longitude && (
                  <div key={index} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 hover:border-blue-600 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      {item.country_code && getCountryFlagUrl(item.country_code, 80) && (
                        <img
                          src={getCountryFlagUrl(item.country_code, 80)!}
                          alt={item.country || 'Flag'}
                          className="w-16 h-auto rounded-md shadow-lg border border-gray-600"
                          title={item.country}
                        />
                      )}
                      <div className="flex-1">
                        <div className="text-white font-mono font-medium">{item.ip_address}</div>
                        <div className="text-sm text-gray-400">{item.city}, {item.country}</div>
                        <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs mt-1 ${getRiskColor(item.risk_level)}`}>
                          {item.risk_level.toUpperCase()}
                        </div>
                      </div>
                      <div className={`text-2xl font-bold ${getScoreColor(item.score)}`}>
                        {item.score}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-700">
                      <Globe className="w-3 h-3" />
                      <span>{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</span>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
