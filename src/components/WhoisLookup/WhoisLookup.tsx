import React, { useState, useEffect } from 'react';
import { Search, Globe, Server, Calendar, Shield, FileText, Clock, Copy, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

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
}

export const WhoisLookup: React.FC = () => {
  const { user } = useAuth();
  const [lookups, setLookups] = useState<WhoisLookup[]>([]);
  const [selectedLookup, setSelectedLookup] = useState<WhoisLookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    loadLookups();
  }, [user]);

  const loadLookups = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whois_lookups')
        .select('*')
        .order('created_at', { ascending: false });

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
        console.error('Error response status:', response.status);
        console.error('Error response body:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          throw new Error(`Lookup failed (${response.status}): ${errorText.substring(0, 200)}`);
        }
        throw new Error(errorData.error || `Lookup failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log('Lookup result:', result);
      await loadLookups();
      setSelectedLookup(result.lookup);
      setQuery('');
    } catch (error) {
      console.error('Error performing lookup:', error);
      alert(error instanceof Error ? error.message : 'Failed to perform WHOIS lookup');
    } finally {
      setSearching(false);
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

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Search className="w-8 h-8 text-cyan-400" />
            WHOIS Lookup
          </h1>
          <p className="text-gray-400 mt-2">Domain and IP address information gathering</p>
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
            className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {searching ? 'Searching...' : 'Lookup'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Lookups</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {lookups.map(lookup => (
              <button
                key={lookup.id}
                onClick={() => setSelectedLookup(lookup)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedLookup?.id === lookup.id
                    ? 'bg-cyan-900/30 border border-cyan-700'
                    : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {getQueryTypeIcon(lookup.query_type)}
                  <p className="text-white font-medium truncate">{lookup.query}</p>
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
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-2 bg-gray-900/50 border border-gray-800 rounded-lg p-6">
          {selectedLookup ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {getQueryTypeIcon(selectedLookup.query_type)}
                    <h2 className="text-2xl font-bold text-white">{selectedLookup.query}</h2>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Queried on {new Date(selectedLookup.queried_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRaw(!showRaw)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      showRaw
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <FileText className="w-4 h-4 inline mr-2" />
                    Raw Data
                  </button>
                </div>
              </div>

              {showRaw ? (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono overflow-x-auto">
                    {selectedLookup.raw_response}
                  </pre>
                </div>
              ) : (
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
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-400 text-sm">Registrant Name</p>
                        <button
                          onClick={() => copyToClipboard(selectedLookup.registrant_name || '', 'name')}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          {copiedField === 'name' ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-white font-medium">{selectedLookup.registrant_name || 'N/A'}</p>
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
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-400 text-sm">Email</p>
                        <button
                          onClick={() => copyToClipboard(selectedLookup.registrant_email || '', 'email')}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          {copiedField === 'email' ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-white font-medium break-all">{selectedLookup.registrant_email || 'N/A'}</p>
                    </div>

                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-400 text-sm">DNSSEC</p>
                      </div>
                      <p className="text-white font-medium">{selectedLookup.dnssec || 'N/A'}</p>
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
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Search className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">No lookup selected</p>
              <p className="text-sm">Perform a lookup to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
