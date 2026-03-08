import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { BookOpen, Plus, Search, Eye, Copy, CheckCircle } from 'lucide-react';

interface Playbook {
  id: string;
  playbook_name: string;
  incident_type: string;
  description: string;
  preparation_steps: { step: number; action: string; responsible: string }[];
  detection_steps: { step: number; action: string; tools: string[] }[];
  containment_steps: { step: number; action: string; priority: string }[];
  eradication_steps: { step: number; action: string; verification: string }[];
  recovery_steps: { step: number; action: string; timeline: string }[];
  lessons_learned: { category: string; finding: string; recommendation: string }[];
  mitre_techniques: string[];
  required_tools: string[];
  escalation_criteria: string;
  is_template: boolean;
  created_at: string;
}

const emptyPlaybook = {
  playbook_name: '',
  incident_type: 'ransomware',
  description: '',
  preparation_steps: [],
  detection_steps: [],
  containment_steps: [],
  eradication_steps: [],
  recovery_steps: [],
  lessons_learned: [],
  mitre_techniques: '',
  required_tools: '',
  escalation_criteria: '',
  is_template: false
};

export function IncidentPlaybooks() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
  const [formData, setFormData] = useState(emptyPlaybook);

  useEffect(() => {
    fetchPlaybooks();
  }, []);

  const fetchPlaybooks = async () => {
    try {
      const { data, error } = await supabase
        .from('incident_playbooks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlaybooks(data || []);
    } catch (error) {
      console.error('Error fetching playbooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('incident_playbooks').insert([{
        user_id: user.id,
        playbook_name: formData.playbook_name,
        incident_type: formData.incident_type,
        description: formData.description,
        preparation_steps: formData.preparation_steps,
        detection_steps: formData.detection_steps,
        containment_steps: formData.containment_steps,
        eradication_steps: formData.eradication_steps,
        recovery_steps: formData.recovery_steps,
        lessons_learned: formData.lessons_learned,
        mitre_techniques: formData.mitre_techniques.split(',').map(t => t.trim()).filter(t => t),
        required_tools: formData.required_tools.split(',').map(t => t.trim()).filter(t => t),
        escalation_criteria: formData.escalation_criteria,
        is_template: formData.is_template
      }]);

      if (error) throw error;

      setShowAddForm(false);
      setFormData(emptyPlaybook);
      fetchPlaybooks();
    } catch (error) {
      console.error('Error adding playbook:', error);
    }
  };

  const filteredPlaybooks = playbooks.filter(playbook =>
    playbook.playbook_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    playbook.incident_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loadTemplate = (type: string) => {
    const templates: Record<string, any> = {
      ransomware: {
        playbook_name: 'Ransomware Response',
        incident_type: 'ransomware',
        description: 'Comprehensive response procedure for ransomware incidents',
        preparation_steps: [
          { step: 1, action: 'Verify backup systems are functional and offsite', responsible: 'IT Admin' },
          { step: 2, action: 'Ensure EDR/AV solutions are up to date', responsible: 'Security Team' },
          { step: 3, action: 'Review incident response contact list', responsible: 'IR Manager' }
        ],
        detection_steps: [
          { step: 1, action: 'Monitor for file encryption activity', tools: ['EDR', 'SIEM'] },
          { step: 2, action: 'Check for ransom notes or unusual file extensions', tools: ['File System Monitoring'] },
          { step: 3, action: 'Analyze suspicious process behavior', tools: ['Process Monitor', 'EDR'] }
        ],
        containment_steps: [
          { step: 1, action: 'Isolate infected systems from network immediately', priority: 'CRITICAL' },
          { step: 2, action: 'Disable user accounts on compromised systems', priority: 'HIGH' },
          { step: 3, action: 'Block malicious IPs/domains at firewall', priority: 'HIGH' }
        ],
        eradication_steps: [
          { step: 1, action: 'Identify and remove malware from systems', verification: 'Full system scan' },
          { step: 2, action: 'Reset all affected user credentials', verification: 'Credential audit' },
          { step: 3, action: 'Patch vulnerabilities exploited', verification: 'Vulnerability scan' }
        ],
        recovery_steps: [
          { step: 1, action: 'Restore data from clean backups', timeline: '4-8 hours' },
          { step: 2, action: 'Verify system integrity before reconnecting', timeline: '2-4 hours' },
          { step: 3, action: 'Monitor for reinfection for 72 hours', timeline: '72 hours' }
        ],
        lessons_learned: [
          { category: 'Prevention', finding: 'Backup gaps identified', recommendation: 'Implement 3-2-1 backup strategy' },
          { category: 'Detection', finding: 'Delayed detection', recommendation: 'Enhance SIEM alerting rules' }
        ],
        mitre_techniques: 'T1486, T1490, T1489',
        required_tools: 'EDR, SIEM, Forensic Toolkit, Backup System',
        escalation_criteria: 'Spread to >5 systems, critical data encrypted, backup systems compromised'
      },
      phishing: {
        playbook_name: 'Phishing Investigation',
        incident_type: 'phishing',
        description: 'Step-by-step procedure for investigating phishing attempts',
        preparation_steps: [
          { step: 1, action: 'Maintain updated email security gateway rules', responsible: 'Email Admin' },
          { step: 2, action: 'Keep user phishing awareness training current', responsible: 'Security Awareness' }
        ],
        detection_steps: [
          { step: 1, action: 'Review reported phishing emails', tools: ['Email Gateway', 'User Reports'] },
          { step: 2, action: 'Extract and analyze email headers', tools: ['Email Analysis Tools'] },
          { step: 3, action: 'Check for similar emails in environment', tools: ['Email Gateway Logs'] }
        ],
        containment_steps: [
          { step: 1, action: 'Block sender domain/email at gateway', priority: 'HIGH' },
          { step: 2, action: 'Remove phishing emails from all mailboxes', priority: 'HIGH' },
          { step: 3, action: 'Block malicious URLs at web proxy', priority: 'MEDIUM' }
        ],
        eradication_steps: [
          { step: 1, action: 'Scan systems of users who clicked links', verification: 'EDR scan results' },
          { step: 2, action: 'Reset credentials of compromised accounts', verification: 'Password reset logs' }
        ],
        recovery_steps: [
          { step: 1, action: 'Send phishing awareness reminder to all users', timeline: 'Immediate' },
          { step: 2, action: 'Monitor for follow-up attacks for 48 hours', timeline: '48 hours' }
        ],
        lessons_learned: [],
        mitre_techniques: 'T1566.001, T1566.002',
        required_tools: 'Email Gateway, URL Analysis, EDR',
        escalation_criteria: 'Credentials compromised, malware executed, data exfiltrated'
      }
    };

    if (templates[type]) {
      setFormData({ ...templates[type], is_template: false });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-green-400">Loading playbooks...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-green-400 flex items-center gap-2">
            <BookOpen className="w-8 h-8" />
            Incident Response Playbooks
          </h2>
          <p className="text-gray-400 mt-1">Document your IR procedures and best practices</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-green-500 text-black rounded-lg hover:bg-green-400 transition-colors flex items-center gap-2 font-semibold"
        >
          <Plus className="w-4 h-4" />
          Create Playbook
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
        <input
          type="text"
          placeholder="Search playbooks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
        />
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-green-500 p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-green-400 mb-4">Create Incident Response Playbook</h3>

            <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <p className="text-sm text-gray-300 mb-2">Quick Start Templates:</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => loadTemplate('ransomware')}
                  className="px-3 py-1 bg-red-900 bg-opacity-30 text-red-400 rounded hover:bg-opacity-50 text-sm"
                >
                  Ransomware Template
                </button>
                <button
                  type="button"
                  onClick={() => loadTemplate('phishing')}
                  className="px-3 py-1 bg-yellow-900 bg-opacity-30 text-yellow-400 rounded hover:bg-opacity-50 text-sm"
                >
                  Phishing Template
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Playbook Name</label>
                <input
                  type="text"
                  required
                  value={formData.playbook_name}
                  onChange={(e) => setFormData({ ...formData, playbook_name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                  placeholder="E.g., Ransomware Response Procedure"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Incident Type</label>
                <select
                  value={formData.incident_type}
                  onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                >
                  <option value="ransomware">Ransomware</option>
                  <option value="phishing">Phishing</option>
                  <option value="data_breach">Data Breach</option>
                  <option value="malware">Malware Infection</option>
                  <option value="ddos">DDoS Attack</option>
                  <option value="insider_threat">Insider Threat</option>
                  <option value="account_compromise">Account Compromise</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                  rows={3}
                  placeholder="Brief description of this incident response playbook..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">MITRE ATT&CK Techniques</label>
                <input
                  type="text"
                  value={formData.mitre_techniques}
                  onChange={(e) => setFormData({ ...formData, mitre_techniques: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                  placeholder="T1566, T1059, T1486 (comma-separated)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Required Tools</label>
                <input
                  type="text"
                  value={formData.required_tools}
                  onChange={(e) => setFormData({ ...formData, required_tools: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                  placeholder="EDR, SIEM, Forensic Toolkit, etc. (comma-separated)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Escalation Criteria</label>
                <textarea
                  value={formData.escalation_criteria}
                  onChange={(e) => setFormData({ ...formData, escalation_criteria: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                  rows={2}
                  placeholder="When should this incident be escalated to senior leadership?"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-500 text-black rounded-lg hover:bg-green-400 transition-colors font-semibold"
                >
                  Create Playbook
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData(emptyPlaybook);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedPlaybook && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-green-500 p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-green-400">{selectedPlaybook.playbook_name}</h3>
                <p className="text-gray-400 mt-1">{selectedPlaybook.description}</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="px-3 py-1 bg-gray-800 text-gray-300 rounded text-sm">
                    {selectedPlaybook.incident_type.toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlaybook(null)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-8">
              {selectedPlaybook.preparation_steps.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    1. PREPARATION
                  </h4>
                  <div className="space-y-2">
                    {selectedPlaybook.preparation_steps.map((step, idx) => (
                      <div key={idx} className="flex gap-3 p-3 bg-gray-800 rounded">
                        <span className="text-blue-400 font-mono">{step.step}.</span>
                        <div className="flex-1">
                          <p className="text-white">{step.action}</p>
                          <p className="text-sm text-gray-400 mt-1">Responsible: {step.responsible}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPlaybook.detection_steps.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-yellow-400 mb-3">2. DETECTION & ANALYSIS</h4>
                  <div className="space-y-2">
                    {selectedPlaybook.detection_steps.map((step, idx) => (
                      <div key={idx} className="flex gap-3 p-3 bg-gray-800 rounded">
                        <span className="text-yellow-400 font-mono">{step.step}.</span>
                        <div className="flex-1">
                          <p className="text-white">{step.action}</p>
                          <div className="flex gap-2 mt-2">
                            {step.tools.map((tool, i) => (
                              <span key={i} className="px-2 py-1 bg-gray-700 text-yellow-400 rounded text-xs">
                                {tool}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPlaybook.containment_steps.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-orange-400 mb-3">3. CONTAINMENT</h4>
                  <div className="space-y-2">
                    {selectedPlaybook.containment_steps.map((step, idx) => (
                      <div key={idx} className="flex gap-3 p-3 bg-gray-800 rounded">
                        <span className="text-orange-400 font-mono">{step.step}.</span>
                        <div className="flex-1">
                          <p className="text-white">{step.action}</p>
                          <span className={`inline-block px-2 py-1 rounded text-xs mt-2 ${
                            step.priority === 'CRITICAL' ? 'bg-red-900 text-red-400' :
                            step.priority === 'HIGH' ? 'bg-orange-900 text-orange-400' :
                            'bg-yellow-900 text-yellow-400'
                          }`}>
                            Priority: {step.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPlaybook.eradication_steps.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-red-400 mb-3">4. ERADICATION</h4>
                  <div className="space-y-2">
                    {selectedPlaybook.eradication_steps.map((step, idx) => (
                      <div key={idx} className="flex gap-3 p-3 bg-gray-800 rounded">
                        <span className="text-red-400 font-mono">{step.step}.</span>
                        <div className="flex-1">
                          <p className="text-white">{step.action}</p>
                          <p className="text-sm text-gray-400 mt-1">Verification: {step.verification}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPlaybook.recovery_steps.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-green-400 mb-3">5. RECOVERY</h4>
                  <div className="space-y-2">
                    {selectedPlaybook.recovery_steps.map((step, idx) => (
                      <div key={idx} className="flex gap-3 p-3 bg-gray-800 rounded">
                        <span className="text-green-400 font-mono">{step.step}.</span>
                        <div className="flex-1">
                          <p className="text-white">{step.action}</p>
                          <p className="text-sm text-gray-400 mt-1">Timeline: {step.timeline}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPlaybook.required_tools.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">REQUIRED TOOLS</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlaybook.required_tools.map((tool, idx) => (
                      <span key={idx} className="px-3 py-1 bg-gray-800 text-green-400 rounded">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedPlaybook.mitre_techniques.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">MITRE ATT&CK TECHNIQUES</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlaybook.mitre_techniques.map((technique, idx) => (
                      <span key={idx} className="px-3 py-1 bg-red-900 bg-opacity-30 text-red-400 rounded font-mono">
                        {technique}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedPlaybook.escalation_criteria && (
                <div className="p-4 bg-red-900 bg-opacity-20 border border-red-800 rounded">
                  <h4 className="text-sm font-semibold text-red-400 mb-2">ESCALATION CRITERIA</h4>
                  <p className="text-white">{selectedPlaybook.escalation_criteria}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPlaybooks.length === 0 ? (
          <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No Playbooks Yet</h3>
            <p className="text-gray-500 mb-6">Create your first incident response playbook</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-green-500 text-black rounded-lg hover:bg-green-400 transition-colors font-semibold"
            >
              Create Playbook
            </button>
          </div>
        ) : (
          filteredPlaybooks.map((playbook) => (
            <div
              key={playbook.id}
              onClick={() => setSelectedPlaybook(playbook)}
              className="bg-gray-900 border border-gray-800 rounded-lg p-5 hover:border-green-500 transition-all cursor-pointer"
            >
              <h3 className="text-lg font-semibold text-green-400 mb-2">{playbook.playbook_name}</h3>
              <p className="text-gray-400 text-sm mb-3 line-clamp-2">{playbook.description}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded">
                  {playbook.incident_type.toUpperCase()}
                </span>
                {playbook.is_template && (
                  <span className="px-2 py-1 bg-blue-900 bg-opacity-30 text-blue-400 text-xs rounded">
                    TEMPLATE
                  </span>
                )}
                <span className="text-xs text-gray-500 flex items-center gap-1 ml-auto">
                  <Eye className="w-3 h-3" />
                  View Details
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
