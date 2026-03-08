import React, { useState, useEffect } from 'react';
import { Key, Save, Trash2, Eye, EyeOff, CheckCircle, XCircle, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface APICredential {
  id: string;
  service_name: string;
  api_key: string;
  is_active: boolean;
  rate_limit: number;
  requests_today: number;
  last_reset: string;
  created_at: string;
}

const API_SERVICES = [
  {
    name: 'abuseipdb',
    displayName: 'AbuseIPDB',
    description: 'IP reputation and abuse reporting',
    defaultRateLimit: 1000,
    helpUrl: 'https://www.abuseipdb.com/api',
  },
  {
    name: 'virustotal',
    displayName: 'VirusTotal',
    description: 'Multi-engine malware scanning',
    defaultRateLimit: 500,
    helpUrl: 'https://www.virustotal.com/gui/my-apikey',
  },
  {
    name: 'alienvault_otx',
    displayName: 'AlienVault OTX',
    description: 'Open threat intelligence (No API key required)',
    defaultRateLimit: 10000,
    helpUrl: 'https://otx.alienvault.com/',
  },
];

export function APIKeyManagement() {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<APICredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [editingService, setEditingService] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    service_name: '',
    api_key: '',
    rate_limit: 1000,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadCredentials();
    }
  }, [user]);

  async function loadCredentials() {
    try {
      const { data, error } = await supabase
        .from('api_credentials')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCredentials(data || []);
    } catch (error: any) {
      console.error('Failed to load credentials:', error);
      showMessage('error', 'Failed to load API credentials');
    } finally {
      setLoading(false);
    }
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }

  async function handleSave() {
    if (!formData.service_name || !formData.api_key) {
      showMessage('error', 'Service and API key are required');
      return;
    }

    setSaving(formData.service_name);
    try {
      const existing = credentials.find(c => c.service_name === formData.service_name);

      if (existing) {
        const { error } = await supabase
          .from('api_credentials')
          .update({
            api_key: formData.api_key,
            rate_limit: formData.rate_limit,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
        showMessage('success', 'API key updated successfully');
      } else {
        const { error } = await supabase
          .from('api_credentials')
          .insert({
            user_id: user?.id,
            service_name: formData.service_name,
            api_key: formData.api_key,
            rate_limit: formData.rate_limit,
            is_active: true,
          });

        if (error) throw error;
        showMessage('success', 'API key added successfully');
      }

      await loadCredentials();
      setEditingService(null);
      setFormData({ service_name: '', api_key: '', rate_limit: 1000 });
    } catch (error: any) {
      console.error('Failed to save credential:', error);
      showMessage('error', 'Failed to save API key');
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(id: string, serviceName: string) {
    if (!confirm(`Are you sure you want to delete the ${serviceName} API key?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('api_credentials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showMessage('success', 'API key deleted successfully');
      await loadCredentials();
    } catch (error: any) {
      console.error('Failed to delete credential:', error);
      showMessage('error', 'Failed to delete API key');
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      const { error } = await supabase
        .from('api_credentials')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      await loadCredentials();
    } catch (error: any) {
      console.error('Failed to toggle credential:', error);
      showMessage('error', 'Failed to update API key status');
    }
  }

  function startEditing(serviceName: string) {
    const existing = credentials.find(c => c.service_name === serviceName);
    const service = API_SERVICES.find(s => s.name === serviceName);

    setEditingService(serviceName);
    setFormData({
      service_name: serviceName,
      api_key: existing?.api_key || '',
      rate_limit: existing?.rate_limit || service?.defaultRateLimit || 1000,
    });
  }

  function cancelEditing() {
    setEditingService(null);
    setFormData({ service_name: '', api_key: '', rate_limit: 1000 });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Threat Intelligence API Keys</h3>
        <p className="text-sm text-gray-400">
          Configure API keys for external threat intelligence services to enable real-time threat data enrichment.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {API_SERVICES.map((service) => {
          const credential = credentials.find(c => c.service_name === service.name);
          const isEditing = editingService === service.name;
          const showKey = showKeys[service.name];

          return (
            <div
              key={service.name}
              className="bg-gray-800/50 rounded-lg border border-gray-700 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Key className="w-5 h-5 text-blue-400" />
                    <h4 className="text-lg font-semibold text-white">{service.displayName}</h4>
                    {credential && (
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          credential.is_active
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {credential.is_active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{service.description}</p>
                  {credential && (
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Rate Limit: {credential.rate_limit}/day</span>
                      <span>Used Today: {credential.requests_today}</span>
                    </div>
                  )}
                </div>
                <a
                  href={service.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Get API Key
                </a>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      API Key
                    </label>
                    <input
                      type="text"
                      value={formData.api_key}
                      onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                      placeholder="Enter your API key"
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Daily Rate Limit
                    </label>
                    <input
                      type="number"
                      value={formData.rate_limit}
                      onChange={(e) => setFormData({ ...formData, rate_limit: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving === service.name}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      {saving === service.name ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save
                        </>
                      )}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : credential ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg">
                      <span className="font-mono text-sm text-gray-400">
                        {showKey ? credential.api_key : '••••••••••••••••••••••••••••••••'}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowKeys({ ...showKeys, [service.name]: !showKey })}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      {showKey ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditing(service.name)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      <Key className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(credential.id, credential.is_active)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        credential.is_active
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {credential.is_active ? (
                        <>
                          <XCircle className="w-4 h-4" />
                          Disable
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Enable
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(credential.id, service.displayName)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => startEditing(service.name)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add API Key
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-400 mb-2">Note</h4>
        <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
          <li>AlienVault OTX does not require an API key for basic queries</li>
          <li>API keys are stored securely and encrypted in the database</li>
          <li>Rate limits help prevent exceeding API quotas</li>
          <li>Disabled integrations will not be queried for threat intelligence</li>
        </ul>
      </div>
    </div>
  );
}
