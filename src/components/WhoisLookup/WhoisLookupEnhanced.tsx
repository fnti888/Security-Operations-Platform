import React, { useState, useEffect } from 'react';
import {
  Search, Globe, Server, Calendar, Shield, FileText, Clock, Copy, CheckCircle,
  Download, Trash2, Plus, BarChart3, AlertTriangle, TrendingUp, Activity,
  Database, Lock, Zap, FileSpreadsheet, FileJson, FileCog, RefreshCw, X,
  ArrowUpDown, Filter, Eye, GitCompare
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { trackActivity } from '../../lib/activityTracking';

interface WhoisLookup {
  id: string;
  query: string;
  query_type: string;
  status: string;
  registrar: string;
  registrant_name: string;
  registrant_organization: string;
  registrant_email: string;
  registrant_country: string;
  creation_date: string;
  expiration_date: string;
  updated_date: string;
  name_servers: string[];
  dnssec: string;
  raw_response: string;
  error_message: string;
  queried_at: string;
  created_at: string;
  has_dns_records: boolean;
  has_ssl_certificate: boolean;
  has_threat_data: boolean;
}

interface Analytics {
  domain_age_days: number;
  days_until_expiry: number;
  is_expiring_soon: boolean;
  has_privacy_protection: boolean;
  nameserver_count: number;
  has_dnssec: boolean;
  overall_security_score: number;
  risk_factors: any;
  recommendations: string[];
}

interface ThreatIntelligence {
  threat_score: number;
  risk_level: string;
  is_malicious: boolean;
  is_phishing: boolean;
  is_spam: boolean;
  threat_details: string;
}

interface DNSRecord {
  record_type: string;
  record_name: string;
  record_value: string;
  ttl: number;
}

interface SSLCertificate {
  domain: string;
  issuer: string;
  valid_from: string;
  valid_to: string;
  is_valid: boolean;
  is_expired: boolean;
  days_until_expiry: number;
}

export const WhoisLookupEnhanced: React.FC = () => {
  const { user } = useAuth();
  const [lookups, setLookups] = useState<WhoisLookup[]>([]);
  const [selectedLookup, setSelectedLookup] = useState<WhoisLookup | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [threatData, setThreatData] = useState<ThreatIntelligence | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DNSRecord[]>([]);
  const [sslCert, setSslCert] = useState<SSLCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'analytics' | 'threat' | 'dns' | 'ssl' | 'raw'>('details');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedLookups, setSelectedLookups] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkQueries, setBulkQueries] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'expiry'>('date');

  useEffect(() => {
    loadLookups();
  }, [user, filterRisk, sortBy]);

  useEffect(() => {
    if (selectedLookup) {
      loadAdditionalData(selectedLookup.id);
    }
  }, [selectedLookup]);

  const loadLookups = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('whois_lookups')
        .select('*');

      if (sortBy === 'date') {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      setLookups(data || []);
      if (data && data.length > 0 && !selectedLookup) {
        setSelectedLookup(data[0]);
      }
    } catch (error) {
      console.error('Error loading lookups:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAdditionalData = async (lookupId: string) => {
    try {
      const [analyticsRes, threatRes, dnsRes, sslRes] = await Promise.all([
        supabase.from('whois_analytics').select('*').eq('lookup_id', lookupId).maybeSingle(),
        supabase.from('whois_threat_intelligence').select('*').eq('lookup_id', lookupId).maybeSingle(),
        supabase.from('whois_dns_records').select('*').eq('lookup_id', lookupId),
        supabase.from('whois_ssl_certificates').select('*').eq('lookup_id', lookupId).maybeSingle(),
      ]);

      setAnalytics(analyticsRes.data);
      setThreatData(threatRes.data);
      setDnsRecords(dnsRes.data || []);
      setSslCert(sslRes.data);
    } catch (error) {
      console.error('Error loading additional data:', error);
    }
  };

  const cleanQuery = (input: string): string => {
    let cleaned = input.trim();
    cleaned = cleaned.replace(/^https?:\/\//, '');
    cleaned = cleaned.replace(/^www\./, '');
    cleaned = cleaned.replace(/\/.*$/, '');
    cleaned = cleaned.trim();
    return cleaned;
  };

  const performLookup = async () => {
    if (!query.trim()) {
      alert('Please enter a domain or IP address');
      return;
    }

    const cleanedQuery = cleanQuery(query);

    if (!cleanedQuery) {
      alert('Please enter a valid domain or IP address');
      return;
    }

    try {
      setSearching(true);
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whois-lookup`;
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: cleanedQuery }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          throw new Error(`Lookup failed (${response.status}): ${errorText.substring(0, 200)}`);
        }
        throw new Error(errorData.error || `Lookup failed with status ${response.status}`);
      }

      const result = await response.json();

      // Track analyst activity
      await trackActivity({
        actionType: 'whois_lookup',
        viewName: 'WHOIS Lookup',
        metadata: {
          query: cleanedQuery,
          query_type: result.lookup?.query_type || 'unknown',
          status: result.lookup?.status || 'completed',
        }
      });

      await loadLookups();
      setSelectedLookup(result.lookup);
      setQuery('');
    } catch (error) {
      console.error('Error performing lookup:', error);

      // Track failed lookup attempt
      await trackActivity({
        actionType: 'whois_lookup_failed',
        viewName: 'WHOIS Lookup',
        metadata: {
          query: cleanedQuery,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      });

      alert(error instanceof Error ? error.message : 'Failed to perform WHOIS lookup');
    } finally {
      setSearching(false);
    }
  };

  const performBulkLookup = async () => {
    const queries = bulkQueries.split('\n').map(q => cleanQuery(q)).filter(q => q);

    if (queries.length === 0) {
      alert('Please enter at least one domain or IP address');
      return;
    }

    if (queries.length > 50) {
      alert('Maximum 50 queries allowed at once');
      return;
    }

    setShowBulkModal(false);
    setSearching(true);

    // Track bulk lookup activity
    await trackActivity({
      actionType: 'whois_bulk_lookup',
      viewName: 'WHOIS Lookup',
      metadata: {
        query_count: queries.length,
        queries: queries.slice(0, 10), // Store first 10 for reference
      }
    });

    let successCount = 0;
    let failCount = 0;

    for (const q of queries) {
      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whois-lookup`;
        const token = (await supabase.auth.getSession()).data.session?.access_token;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: q }),
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Failed to lookup ${q}:`, error);
        failCount++;
      }
    }

    // Track bulk lookup completion
    await trackActivity({
      actionType: 'whois_bulk_lookup_completed',
      viewName: 'WHOIS Lookup',
      metadata: {
        total_queries: queries.length,
        successful: successCount,
        failed: failCount,
      }
    });

    setSearching(false);
    setBulkQueries('');
    await loadLookups();
  };

  const exportToCSV = async () => {
    if (!selectedLookup) return;

    const csv = [
      ['Field', 'Value'],
      ['Query', selectedLookup.query],
      ['Type', selectedLookup.query_type],
      ['Registrar', selectedLookup.registrar],
      ['Organization', selectedLookup.registrant_organization],
      ['Country', selectedLookup.registrant_country],
      ['Creation Date', selectedLookup.creation_date],
      ['Expiration Date', selectedLookup.expiration_date],
      ['DNSSEC', selectedLookup.dnssec],
      ['Nameservers', selectedLookup.name_servers?.join('; ')],
      ...(analytics ? [
        ['Domain Age (days)', analytics.domain_age_days?.toString()],
        ['Security Score', analytics.overall_security_score?.toString()],
        ['Expiring Soon', analytics.is_expiring_soon ? 'Yes' : 'No'],
      ] : []),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whois-${selectedLookup.query}-${Date.now()}.csv`;
    a.click();

    // Track export activity
    await trackActivity({
      actionType: 'whois_export',
      viewName: 'WHOIS Lookup',
      metadata: {
        query: selectedLookup.query,
        format: 'csv',
      }
    });
  };

  const exportToJSON = async () => {
    if (!selectedLookup) return;

    const data = {
      lookup: selectedLookup,
      analytics,
      threatData,
      dnsRecords,
      sslCert,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whois-${selectedLookup.query}-${Date.now()}.json`;
    a.click();

    // Track export activity
    await trackActivity({
      actionType: 'whois_export',
      viewName: 'WHOIS Lookup',
      metadata: {
        query: selectedLookup.query,
        format: 'json',
        includes_analytics: !!analytics,
        includes_threat_data: !!threatData,
        includes_dns: dnsRecords.length > 0,
        includes_ssl: !!sslCert,
      }
    });
  };

  const deleteLookup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lookup?')) return;

    const lookupToDelete = lookups.find(l => l.id === id);

    try {
      const { error } = await supabase.from('whois_lookups').delete().eq('id', id);
      if (error) throw error;

      // Track deletion activity
      await trackActivity({
        actionType: 'whois_lookup_deleted',
        viewName: 'WHOIS Lookup',
        metadata: {
          query: lookupToDelete?.query || 'unknown',
          lookup_id: id,
        }
      });

      await loadLookups();
      if (selectedLookup?.id === id) {
        setSelectedLookup(null);
      }
    } catch (error) {
      console.error('Error deleting lookup:', error);
      alert('Failed to delete lookup');
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getQueryTypeIcon = (type: string) => {
    return type === 'domain' ? <Globe className="w-5 h-5" /> : <Server className="w-5 h-5" />;
  };

  const getRiskBadge = (level: string) => {
    const colors = {
      low: 'bg-green-900/30 text-green-400 border-green-700',
      medium: 'bg-yellow-900/30 text-yellow-400 border-yellow-700',
      high: 'bg-orange-900/30 text-orange-400 border-orange-700',
      critical: 'bg-red-900/30 text-red-400 border-red-700',
    };
    return colors[level as keyof typeof colors] || colors.low;
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Search className="w-8 h-8 text-cyan-400" />
            WHOIS Lookup Pro
          </h1>
          <p className="text-gray-400 mt-2">Advanced domain and IP intelligence platform</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            Bulk Lookup
          </button>
          {selectedLookup && (
            <>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={exportToJSON}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <FileJson className="w-4 h-4" />
                Export JSON
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && performLookup()}
              placeholder="Enter domain (e.g., example.com) or IP address (e.g., 192.168.1.1)"
              className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            onClick={performLookup}
            disabled={searching}
            className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {searching ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Lookup
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Lookups</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy(sortBy === 'date' ? 'score' : 'date')}
                className="text-gray-400 hover:text-white transition-colors"
                title="Sort"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-[700px] overflow-y-auto">
            {lookups.map(lookup => (
              <div
                key={lookup.id}
                className={`relative p-3 rounded-lg transition-colors cursor-pointer ${
                  selectedLookup?.id === lookup.id
                    ? 'bg-cyan-900/30 border border-cyan-700'
                    : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-800'
                }`}
                onClick={() => setSelectedLookup(lookup)}
              >
                <div className="flex items-center gap-2 mb-1">
                  {getQueryTypeIcon(lookup.query_type)}
                  <p className="text-white font-medium truncate flex-1">{lookup.query}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteLookup(lookup.id);
                    }}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className={`px-2 py-1 rounded ${
                    lookup.status === 'completed' ? 'bg-green-900/30 text-green-400' :
                    lookup.status === 'failed' ? 'bg-red-900/30 text-red-400' :
                    'bg-blue-900/30 text-blue-400'
                  }`}>
                    {lookup.status}
                  </span>
                  <span className="text-gray-400">
                    {new Date(lookup.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-3 bg-gray-900/50 border border-gray-800 rounded-lg p-6">
          {selectedLookup ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getQueryTypeIcon(selectedLookup.query_type)}
                    <h2 className="text-2xl font-bold text-white">{selectedLookup.query}</h2>
                    {analytics && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-cyan-900/30 border border-cyan-700 rounded-lg">
                        <Shield className="w-4 h-4 text-cyan-400" />
                        <span className="text-cyan-400 font-medium">
                          Security Score: {analytics.overall_security_score}/100
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">
                    Queried on {new Date(selectedLookup.queried_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 border-b border-gray-700">
                {['details', 'analytics', 'threat', 'dns', 'ssl', 'raw'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-2 font-medium transition-colors capitalize ${
                      activeTab === tab
                        ? 'text-cyan-400 border-b-2 border-cyan-400'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-400 text-sm">Registrar</p>
                        <button
                          onClick={() => copyToClipboard(selectedLookup.registrar || '', 'registrar')}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          {copiedField === 'registrar' ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-white font-medium">{selectedLookup.registrar || 'N/A'}</p>
                    </div>

                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-400 text-sm">Organization</p>
                        <button
                          onClick={() => copyToClipboard(selectedLookup.registrant_organization || '', 'organization')}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          {copiedField === 'organization' ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-white font-medium">{selectedLookup.registrant_organization || 'N/A'}</p>
                    </div>

                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-400 text-sm">Creation Date</p>
                      </div>
                      <p className="text-white font-medium">{formatDate(selectedLookup.creation_date)}</p>
                    </div>

                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-400 text-sm">Expiration Date</p>
                      </div>
                      <p className="text-white font-medium">{formatDate(selectedLookup.expiration_date)}</p>
                    </div>

                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-400 text-sm">DNSSEC</p>
                      </div>
                      <p className="text-white font-medium">{selectedLookup.dnssec || 'N/A'}</p>
                    </div>

                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-400 text-sm">Country</p>
                        <button
                          onClick={() => copyToClipboard(selectedLookup.registrant_country || '', 'country')}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          {copiedField === 'country' ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-white font-medium">{selectedLookup.registrant_country || 'N/A'}</p>
                    </div>
                  </div>

                  {selectedLookup.name_servers && selectedLookup.name_servers.length > 0 && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Server className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-400 text-sm font-medium">Name Servers</p>
                      </div>
                      <div className="space-y-2">
                        {selectedLookup.name_servers.map((ns, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-gray-900/50 px-3 py-2 rounded">
                            <p className="text-white font-mono text-sm">{ns}</p>
                            <button
                              onClick={() => copyToClipboard(ns, `ns-${idx}`)}
                              className="text-gray-400 hover:text-white transition-colors"
                            >
                              {copiedField === `ns-${idx}` ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="space-y-4">
                  {!analytics ? (
                    <div className="text-center py-12">
                      <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400 mb-4">Analytics data is not available for this lookup</p>
                      <button
                        onClick={async () => {
                          if (!selectedLookup) return;
                          try {
                            await supabase.rpc('calculate_whois_analytics', { p_lookup_id: selectedLookup.id });
                            await loadAdditionalData(selectedLookup.id);
                          } catch (error) {
                            console.error('Error regenerating analytics:', error);
                            alert('Failed to generate analytics');
                          }
                        }}
                        className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                      >
                        <RefreshCw className="w-5 h-5" />
                        Generate Analytics
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-700 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-cyan-400" />
                            <p className="text-gray-300 text-sm">Security Score</p>
                          </div>
                          <p className="text-3xl font-bold text-cyan-400">{analytics.overall_security_score}/100</p>
                        </div>

                    <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-green-400" />
                        <p className="text-gray-300 text-sm">Domain Age</p>
                      </div>
                      <p className="text-3xl font-bold text-green-400">{analytics.domain_age_days || 0} days</p>
                    </div>

                    <div className={`bg-gradient-to-br rounded-lg p-4 border ${
                      analytics.is_expiring_soon
                        ? 'from-red-900/30 to-orange-900/30 border-red-700'
                        : 'from-blue-900/30 to-indigo-900/30 border-blue-700'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className={`w-5 h-5 ${analytics.is_expiring_soon ? 'text-red-400' : 'text-blue-400'}`} />
                        <p className="text-gray-300 text-sm">Expires In</p>
                      </div>
                      <p className={`text-3xl font-bold ${analytics.is_expiring_soon ? 'text-red-400' : 'text-blue-400'}`}>
                        {analytics.days_until_expiry || 0} days
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-cyan-400" />
                      Security Analysis
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">DNSSEC Enabled</span>
                        <span className={`px-3 py-1 rounded ${analytics.has_dnssec ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                          {analytics.has_dnssec ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Privacy Protection</span>
                        <span className={`px-3 py-1 rounded ${analytics.has_privacy_protection ? 'bg-blue-900/30 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>
                          {analytics.has_privacy_protection ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Nameserver Count</span>
                        <span className="text-white font-medium">{analytics.nameserver_count}</span>
                      </div>
                    </div>
                  </div>

                      {analytics.recommendations && analytics.recommendations.length > 0 && (
                        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                          <h3 className="text-yellow-400 font-semibold mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Recommendations
                          </h3>
                          <ul className="space-y-2">
                            {analytics.recommendations.map((rec, idx) => (
                              <li key={idx} className="text-gray-300 flex items-start gap-2">
                                <span className="text-yellow-400 mt-1">•</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === 'threat' && (
                <div className="space-y-4">
                  {!threatData ? (
                    <div className="text-center py-12 text-gray-400">
                      <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No threat intelligence data available</p>
                      <p className="text-sm mt-2">Threat analysis was not performed for this lookup</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`bg-gradient-to-br rounded-lg p-4 border ${getRiskBadge(threatData.risk_level)}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-5 h-5" />
                            <p className="text-sm">Risk Level</p>
                          </div>
                          <p className="text-3xl font-bold uppercase">{threatData.risk_level}</p>
                        </div>

                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="w-5 h-5 text-gray-400" />
                        <p className="text-gray-400 text-sm">Threat Score</p>
                      </div>
                      <p className="text-3xl font-bold text-white">{threatData.threat_score}/100</p>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-3">Threat Indicators</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Malicious Activity</span>
                        <span className={`px-3 py-1 rounded ${threatData.is_malicious ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
                          {threatData.is_malicious ? 'Detected' : 'Clean'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Phishing</span>
                        <span className={`px-3 py-1 rounded ${threatData.is_phishing ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
                          {threatData.is_phishing ? 'Detected' : 'Clean'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Spam</span>
                        <span className={`px-3 py-1 rounded ${threatData.is_spam ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
                          {threatData.is_spam ? 'Detected' : 'Clean'}
                        </span>
                      </div>
                    </div>
                  </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'dns' && (
                <div className="space-y-4">
                  {dnsRecords.length > 0 ? (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-900/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-gray-400 font-medium">Type</th>
                            <th className="px-4 py-3 text-left text-gray-400 font-medium">Name</th>
                            <th className="px-4 py-3 text-left text-gray-400 font-medium">Value</th>
                            <th className="px-4 py-3 text-left text-gray-400 font-medium">TTL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {dnsRecords.map((record, idx) => (
                            <tr key={idx} className="hover:bg-gray-800/30">
                              <td className="px-4 py-3 text-cyan-400 font-mono">{record.record_type}</td>
                              <td className="px-4 py-3 text-white font-mono text-sm">{record.record_name}</td>
                              <td className="px-4 py-3 text-gray-300 font-mono text-sm">{record.record_value}</td>
                              <td className="px-4 py-3 text-gray-400">{record.ttl}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No DNS records available</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'ssl' && (
                <div className="space-y-4">
                  {sslCert ? (
                    <div className="space-y-4">
                      <div className={`bg-gradient-to-br rounded-lg p-4 border ${
                        sslCert.is_valid && !sslCert.is_expired
                          ? 'from-green-900/30 to-emerald-900/30 border-green-700'
                          : 'from-red-900/30 to-orange-900/30 border-red-700'
                      }`}>
                        <div className="flex items-center gap-3">
                          <Lock className={`w-8 h-8 ${sslCert.is_valid && !sslCert.is_expired ? 'text-green-400' : 'text-red-400'}`} />
                          <div>
                            <p className={`text-2xl font-bold ${sslCert.is_valid && !sslCert.is_expired ? 'text-green-400' : 'text-red-400'}`}>
                              {sslCert.is_valid && !sslCert.is_expired ? 'Valid Certificate' : 'Invalid/Expired'}
                            </p>
                            <p className="text-gray-300 text-sm">SSL/TLS Security Status</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                          <p className="text-gray-400 text-sm mb-1">Issuer</p>
                          <p className="text-white font-medium">{sslCert.issuer}</p>
                        </div>
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                          <p className="text-gray-400 text-sm mb-1">Valid From</p>
                          <p className="text-white font-medium">{formatDate(sslCert.valid_from)}</p>
                        </div>
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                          <p className="text-gray-400 text-sm mb-1">Valid To</p>
                          <p className="text-white font-medium">{formatDate(sslCert.valid_to)}</p>
                        </div>
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                          <p className="text-gray-400 text-sm mb-1">Days Until Expiry</p>
                          <p className="text-white font-medium">{sslCert.days_until_expiry} days</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <Lock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No SSL certificate data available</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'raw' && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono overflow-x-auto max-h-[600px] overflow-y-auto">
                    {selectedLookup.raw_response}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-gray-400">
              <Search className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">No lookup selected</p>
              <p className="text-sm">Perform a lookup to see results</p>
            </div>
          )}
        </div>
      </div>

      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Bulk Lookup</h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-gray-400 mb-4">Enter one domain or IP address per line (max 50)</p>
            <textarea
              value={bulkQueries}
              onChange={(e) => setBulkQueries(e.target.value)}
              placeholder="example.com&#10;192.168.1.1&#10;another-domain.com"
              className="w-full h-64 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 font-mono text-sm"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={performBulkLookup}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
              >
                Start Bulk Lookup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
