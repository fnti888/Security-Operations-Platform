import React, { useState, useEffect } from 'react';
import { Target, Play, Search, FileSearch, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface HuntCampaign {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  tactics: string[];
  queries: any[];
  status: string;
  findings_count: number;
  started_at: string;
  completed_at: string | null;
  created_by: string;
}

interface HuntFinding {
  id: string;
  campaign_id: string;
  title: string;
  description: string;
  severity: string;
  indicators: string[];
  evidence: any;
  recommended_actions: string;
  status: string;
  found_at: string;
}

export function ThreatHuntingCenter() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<HuntCampaign[]>([]);
  const [findings, setFindings] = useState<HuntFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [hunting, setHunting] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
    loadFindings();
  }, []);

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('hunt_campaigns')
        .select('*')
        .order('started_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFindings = async () => {
    try {
      const { data, error } = await supabase
        .from('hunt_findings')
        .select('*')
        .order('found_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setFindings(data || []);
    } catch (error) {
      console.error('Error loading findings:', error);
    }
  };

  const createSampleCampaign = async () => {
    if (!user) return;

    const sampleQueries = [
      {
        type: 'suspicious_ips',
        params: { minScore: 70 },
        description: 'Hunt for high-risk IP addresses in recent incidents',
      },
      {
        type: 'anomalous_behavior',
        params: {},
        description: 'Detect statistical anomalies in system behavior',
      },
      {
        type: 'persistence_mechanisms',
        params: {},
        description: 'Search for suspicious processes and file modifications',
      },
      {
        type: 'lateral_movement',
        params: {},
        description: 'Identify correlated attacks suggesting lateral movement',
      },
    ];

    const { data, error } = await supabase
      .from('hunt_campaigns')
      .insert({
        name: 'APT Detection Campaign',
        description: 'Proactive hunt for Advanced Persistent Threat indicators',
        hypothesis: 'Suspected APT activity based on correlated incidents and anomalous behavior patterns',
        tactics: ['Persistence', 'Lateral Movement', 'Exfiltration'],
        queries: sampleQueries,
        status: 'active',
        created_by: user.id,
      })
      .select()
      .single();

    if (!error && data) {
      await loadCampaigns();
    }
  };

  const executeCampaign = async (campaignId: string) => {
    setHunting(true);
    setSelectedCampaign(campaignId);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/threat-hunter`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ campaign_id: campaignId }),
        }
      );

      if (response.ok) {
        await loadCampaigns();
        await loadFindings();
      }
    } catch (error) {
      console.error('Error executing campaign:', error);
    } finally {
      setHunting(false);
      setSelectedCampaign(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-500 bg-red-500/20';
      case 'high':
        return 'text-orange-500 bg-orange-500/20';
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/20';
      default:
        return 'text-blue-500 bg-blue-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading threat hunting center...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Target className="w-8 h-8 text-red-500" />
            Threat Hunting Center
          </h2>
          <p className="text-gray-400 mt-1">Proactive threat detection and investigation campaigns</p>
        </div>
        <button
          onClick={createSampleCampaign}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          Create Hunt Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-3xl font-bold text-white">{campaigns.length}</div>
          <div className="text-gray-400 text-sm">Total Campaigns</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-3xl font-bold text-blue-500">
            {campaigns.filter(c => c.status === 'active').length}
          </div>
          <div className="text-gray-400 text-sm">Active Hunts</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-3xl font-bold text-red-500">{findings.length}</div>
          <div className="text-gray-400 text-sm">Findings</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-3xl font-bold text-orange-500">
            {findings.filter(f => f.severity === 'critical' || f.severity === 'high').length}
          </div>
          <div className="text-gray-400 text-sm">High Severity</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileSearch className="w-5 h-5" />
              Hunt Campaigns
            </h3>
          </div>
          <div className="divide-y divide-gray-700 max-h-96 overflow-y-auto">
            {campaigns.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No campaigns yet. Create one to start hunting.
              </div>
            ) : (
              campaigns.map((campaign) => (
                <div key={campaign.id} className="p-4 hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-medium">{campaign.name}</h4>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            campaign.status === 'active'
                              ? 'bg-blue-500/20 text-blue-400'
                              : campaign.status === 'completed'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {campaign.status}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{campaign.description}</p>
                      <div className="text-xs text-gray-500 mt-2">
                        Queries: {campaign.queries.length} | Findings: {campaign.findings_count}
                      </div>
                    </div>
                    <button
                      onClick={() => executeCampaign(campaign.id)}
                      disabled={hunting && selectedCampaign === campaign.id}
                      className="ml-4 p-2 hover:bg-gray-700 rounded text-red-400 disabled:opacity-50"
                    >
                      {hunting && selectedCampaign === campaign.id ? (
                        <Clock className="w-5 h-5 animate-pulse" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Hunt Findings
            </h3>
          </div>
          <div className="divide-y divide-gray-700 max-h-96 overflow-y-auto">
            {findings.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No findings yet. Execute a campaign to start hunting.
              </div>
            ) : (
              findings.map((finding) => (
                <div key={finding.id} className="p-4 hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-medium">{finding.title}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(finding.severity)}`}>
                          {finding.severity}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{finding.description}</p>
                      {finding.indicators.length > 0 && (
                        <div className="text-xs text-gray-500 mt-2">
                          Indicators: {finding.indicators.slice(0, 3).join(', ')}
                          {finding.indicators.length > 3 && ` +${finding.indicators.length - 3} more`}
                        </div>
                      )}
                      <div className="text-xs text-blue-400 mt-2">
                        {finding.recommended_actions}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
