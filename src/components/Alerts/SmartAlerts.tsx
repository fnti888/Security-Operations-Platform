import React, { useState, useEffect } from 'react';
import { Bell, BellOff, AlertCircle, CheckCircle, XCircle, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Alert {
  id: string;
  rule_id: string | null;
  title: string;
  description: string;
  severity: string;
  status: string;
  source_data: any;
  assigned_to: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  rule_type: string;
  conditions: any;
  severity: string;
  enabled: boolean;
  notification_channels: string[];
  created_by: string;
  created_at: string;
}

export function SmartAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'new' | 'acknowledged' | 'resolved'>('all');

  useEffect(() => {
    loadAlerts();
    loadRules();

    const alertSubscription = supabase
      .channel('alerts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        loadAlerts();
      })
      .subscribe();

    return () => {
      alertSubscription.unsubscribe();
    };
  }, []);

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from('alert_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error loading rules:', error);
    }
  };

  const createSampleRules = async () => {
    if (!user) return;

    const samples = [
      {
        name: 'Critical Vulnerabilities Threshold',
        description: 'Alert when critical vulnerabilities exceed 5',
        rule_type: 'threshold',
        conditions: {
          metric: 'vulnerability_count',
          operator: 'gt',
          value: 5,
          timeWindow: 3600,
        },
        severity: 'critical',
        enabled: true,
        notification_channels: ['in_app', 'email'],
        created_by: user.id,
      },
      {
        name: 'Multiple Failed Login Attempts',
        description: 'Alert on suspicious login activity',
        rule_type: 'threshold',
        conditions: {
          metric: 'failed_login_attempts',
          operator: 'gte',
          value: 10,
          timeWindow: 600,
        },
        severity: 'high',
        enabled: true,
        notification_channels: ['in_app'],
        created_by: user.id,
      },
      {
        name: 'SSL Certificate Expiring Soon',
        description: 'Alert when SSL certificates expire within 30 days',
        rule_type: 'threshold',
        conditions: {
          metric: 'ssl_expiring',
          operator: 'gt',
          value: 0,
          timeWindow: 86400,
        },
        severity: 'medium',
        enabled: true,
        notification_channels: ['in_app'],
        created_by: user.id,
      },
      {
        name: 'Anomaly Detection',
        description: 'Alert on detected anomalies',
        rule_type: 'anomaly',
        conditions: {
          minDeviationScore: 2,
        },
        severity: 'high',
        enabled: true,
        notification_channels: ['in_app'],
        created_by: user.id,
      },
    ];

    for (const rule of samples) {
      await supabase.from('alert_rules').insert(rule);
    }

    await loadRules();
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({
          status: 'acknowledged',
          assigned_to: user?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
      await loadAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
      await loadAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('alert_rules')
        .update({ enabled: !enabled })
        .eq('id', ruleId);

      if (error) throw error;
      await loadRules();
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    return alert.status === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading smart alerts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Bell className="w-8 h-8 text-blue-500" />
            Smart Alert System
          </h2>
          <p className="text-gray-400 mt-1">Automated alerting with intelligent rules and notifications</p>
        </div>
        {rules.length === 0 && (
          <button
            onClick={createSampleRules}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Setup Alert Rules
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-3xl font-bold text-white">{alerts.length}</div>
          <div className="text-gray-400 text-sm">Total Alerts</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-3xl font-bold text-red-500">
            {alerts.filter(a => a.status === 'new').length}
          </div>
          <div className="text-gray-400 text-sm">New Alerts</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-3xl font-bold text-yellow-500">
            {alerts.filter(a => a.status === 'acknowledged').length}
          </div>
          <div className="text-gray-400 text-sm">Acknowledged</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-3xl font-bold text-green-500">{rules.filter(r => r.enabled).length}</div>
          <div className="text-gray-400 text-sm">Active Rules</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Active Alerts</h3>
            <div className="flex gap-2">
              {(['all', 'new', 'acknowledged', 'resolved'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded text-sm ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-700 max-h-[600px] overflow-y-auto">
            {filteredAlerts.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No alerts in this category</div>
            ) : (
              filteredAlerts.map((alert) => (
                <div key={alert.id} className="p-4 hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-medium">{alert.title}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            alert.status === 'new'
                              ? 'bg-red-500/20 text-red-400'
                              : alert.status === 'acknowledged'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}
                        >
                          {alert.status}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{alert.description}</p>
                      <div className="text-xs text-gray-500 mt-2">
                        {new Date(alert.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {alert.status === 'new' && (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="p-2 hover:bg-gray-700 rounded text-yellow-400"
                          title="Acknowledge"
                        >
                          <AlertCircle className="w-4 h-4" />
                        </button>
                      )}
                      {alert.status !== 'resolved' && (
                        <button
                          onClick={() => resolveAlert(alert.id)}
                          className="p-2 hover:bg-gray-700 rounded text-green-400"
                          title="Resolve"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Alert Rules</h3>
          </div>
          <div className="divide-y divide-gray-700 max-h-[600px] overflow-y-auto">
            {rules.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No rules configured. Setup alert rules to get started.
              </div>
            ) : (
              rules.map((rule) => (
                <div key={rule.id} className="p-4 hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-white font-medium text-sm">{rule.name}</h4>
                      <p className="text-gray-400 text-xs mt-1">{rule.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(rule.severity)}`}>
                          {rule.severity}
                        </span>
                        <span className="text-xs text-gray-500">{rule.rule_type}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleRule(rule.id, rule.enabled)}
                      className={`p-2 rounded ${
                        rule.enabled ? 'text-green-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-700'
                      }`}
                    >
                      {rule.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                    </button>
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
