import React, { useState, useEffect } from 'react';
import { Lock, Play, AlertTriangle, CheckCircle, Shield, Award, Clock, Key, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Scan {
  id: string;
  scan_name: string;
  target_host: string;
  target_port: number;
  status: string;
  started_at: string;
  completed_at: string;
  created_at: string;
}

interface Certificate {
  subject: string;
  issuer: string;
  valid_from: string;
  valid_to: string;
  days_until_expiry: number;
  is_expired: boolean;
  is_self_signed: boolean;
  is_wildcard: boolean;
  key_type: string;
  key_size: number;
  chain_length: number;
  chain_issues: string[];
}

interface CipherSuite {
  protocol_version: string;
  protocol_enabled: boolean;
  cipher_suite: string;
  key_exchange: string;
  encryption: string;
  encryption_bits: number;
  is_weak: boolean;
  is_deprecated: boolean;
  vulnerability_names: string[];
}

interface Vulnerability {
  id: string;
  vulnerability_type: string;
  title: string;
  description: string;
  severity: string;
  remediation: string;
  status: string;
}

interface GradeScore {
  overall_grade: string;
  certificate_score: number;
  protocol_score: number;
  cipher_score: number;
  has_forward_secrecy: boolean;
  supports_tls13: boolean;
  vulnerable_to_downgrade: boolean;
}

export const SSLAnalyzer: React.FC = () => {
  const { user } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [ciphers, setCiphers] = useState<CipherSuite[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [gradeScore, setGradeScore] = useState<GradeScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [showNewScan, setShowNewScan] = useState(false);
  const [formErrors, setFormErrors] = useState({
    scanName: '',
    targetHost: '',
  });

  const [scanForm, setScanForm] = useState({
    scanName: '',
    targetHost: '',
    targetPort: 443,
  });

  useEffect(() => {
    loadScans();
  }, [user]);

  useEffect(() => {
    if (selectedScan) {
      loadScanDetails(selectedScan.id);
    }
  }, [selectedScan]);

  const loadScans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ssl_scans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScans(data || []);
      if (data && data.length > 0 && !selectedScan) {
        setSelectedScan(data[0]);
      }
    } catch (error) {
      console.error('Error loading scans:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadScanDetails = async (scanId: string) => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ssl-tls-analyzer?scanId=${scanId}`;
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to load scan details');

      const result = await response.json();
      setCertificate(result.certificate);
      setCiphers(result.ciphers || []);
      setVulnerabilities(result.vulnerabilities || []);
      setGradeScore(result.gradeScore);
    } catch (error) {
      console.error('Error loading scan details:', error);
    }
  };

  const extractHostname = (input: string): string => {
    try {
      if (input.includes('://')) {
        const url = new URL(input);
        return url.hostname;
      }
      return input.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].split(':')[0];
    } catch {
      return input;
    }
  };

  const startScan = async () => {
    const errors = { scanName: '', targetHost: '' };
    let hasError = false;

    if (!scanForm.scanName.trim()) {
      errors.scanName = 'Scan name is required';
      hasError = true;
    }

    if (!scanForm.targetHost.trim()) {
      errors.targetHost = 'Target host is required';
      hasError = true;
    }

    if (hasError) {
      setFormErrors(errors);
      return;
    }

    try {
      setScanning(true);
      setFormErrors({ scanName: '', targetHost: '' });

      const cleanHost = extractHostname(scanForm.targetHost);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ssl-tls-analyzer`;
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...scanForm,
          targetHost: cleanHost,
        }),
      });

      if (!response.ok) throw new Error('Scan failed');

      const result = await response.json();
      alert(`Scan completed! Grade: ${result.grade} | Found ${result.vulnerabilitiesFound} issues`);

      await loadScans();
      setShowNewScan(false);
      setScanForm({ scanName: '', targetHost: '', targetPort: 443 });
    } catch (error) {
      console.error('Error starting scan:', error);
      alert('Failed to start scan');
    } finally {
      setScanning(false);
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade === 'A+' || grade === 'A') return 'text-green-400';
    if (grade === 'B') return 'text-blue-400';
    if (grade === 'C') return 'text-yellow-400';
    if (grade === 'D') return 'text-orange-400';
    return 'text-red-400';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-900/20 text-red-400 border-red-800';
      case 'high': return 'bg-orange-900/20 text-orange-400 border-orange-800';
      case 'medium': return 'bg-yellow-900/20 text-yellow-400 border-yellow-800';
      case 'low': return 'bg-blue-900/20 text-blue-400 border-blue-800';
      default: return 'bg-gray-900/20 text-gray-400 border-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 80) return 'text-blue-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 60) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Lock className="w-8 h-8 text-green-400" />
            SSL/TLS Analyzer
          </h1>
          <p className="text-gray-400 mt-2">Certificate and encryption security assessment</p>
        </div>
        <button
          onClick={() => setShowNewScan(true)}
          disabled={scanning}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Play className="w-5 h-5" />
          New Scan
        </button>
      </div>

      {gradeScore && (
        <div className="bg-gradient-to-br from-gray-900/80 to-gray-900/40 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <Award className="w-12 h-12 mx-auto mb-2 text-yellow-400" />
                <p className="text-gray-400 text-sm">Overall Grade</p>
                <p className={`text-6xl font-bold ${getGradeColor(gradeScore.overall_grade)}`}>
                  {gradeScore.overall_grade}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-6 pl-6 border-l border-gray-700">
                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-1">Certificate</p>
                  <p className={`text-3xl font-bold ${getScoreColor(gradeScore.certificate_score)}`}>
                    {gradeScore.certificate_score}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-1">Protocol</p>
                  <p className={`text-3xl font-bold ${getScoreColor(gradeScore.protocol_score)}`}>
                    {gradeScore.protocol_score}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-1">Cipher</p>
                  <p className={`text-3xl font-bold ${getScoreColor(gradeScore.cipher_score)}`}>
                    {gradeScore.cipher_score}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {gradeScore.has_forward_secrecy ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                )}
                <span className="text-gray-300 text-sm">Forward Secrecy</span>
              </div>
              <div className="flex items-center gap-2">
                {gradeScore.supports_tls13 ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                )}
                <span className="text-gray-300 text-sm">TLS 1.3 Support</span>
              </div>
              <div className="flex items-center gap-2">
                {!gradeScore.vulnerable_to_downgrade ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                )}
                <span className="text-gray-300 text-sm">Downgrade Protection</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Scans</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {scans.map(scan => (
              <button
                key={scan.id}
                onClick={() => setSelectedScan(scan)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedScan?.id === scan.id
                    ? 'bg-green-900/30 border border-green-700'
                    : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-800'
                }`}
              >
                <p className="text-white font-medium">{scan.scan_name}</p>
                <p className="text-gray-400 text-sm">{scan.target_host}:{scan.target_port}</p>
                <p className="text-gray-500 text-xs mt-1">
                  {new Date(scan.created_at).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-2 space-y-4">
          {certificate && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-400" />
                Certificate Details
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-400 text-sm">Subject</p>
                    <p className="text-white font-mono text-sm">{certificate.subject}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Issuer</p>
                    <p className="text-white font-mono text-sm">{certificate.issuer}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Key Type</p>
                    <p className="text-white">{certificate.key_type} {certificate.key_size} bits</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-400 text-sm">Valid Until</p>
                    <p className="text-white">{new Date(certificate.valid_to).toLocaleDateString()}</p>
                    <p className={`text-sm ${certificate.days_until_expiry < 30 ? 'text-orange-400' : 'text-green-400'}`}>
                      {certificate.days_until_expiry} days remaining
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {certificate.is_wildcard && (
                      <span className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 rounded">Wildcard</span>
                    )}
                    {certificate.is_self_signed && (
                      <span className="text-xs px-2 py-1 bg-red-900/30 text-red-400 rounded">Self-Signed</span>
                    )}
                    {certificate.is_expired && (
                      <span className="text-xs px-2 py-1 bg-red-900/30 text-red-400 rounded">Expired</span>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Chain Length</p>
                    <p className="text-white">{certificate.chain_length} certificates</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-cyan-400" />
              Supported Protocols & Ciphers
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {ciphers.map((cipher, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    cipher.is_weak
                      ? 'bg-red-900/10 border-red-800'
                      : 'bg-gray-800/50 border-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white text-sm font-mono">{cipher.cipher_suite || cipher.protocol_version}</p>
                      {cipher.cipher_suite && (
                        <p className="text-gray-400 text-xs mt-1">
                          {cipher.key_exchange} / {cipher.encryption} ({cipher.encryption_bits} bits)
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {cipher.is_deprecated && (
                        <span className="text-xs px-2 py-1 bg-orange-900/30 text-orange-400 rounded">Deprecated</span>
                      )}
                      {cipher.is_weak && (
                        <span className="text-xs px-2 py-1 bg-red-900/30 text-red-400 rounded">Weak</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-400" />
              Security Issues
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {vulnerabilities.map(vuln => (
                <div key={vuln.id} className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-white font-medium">{vuln.title}</p>
                    <span className={`text-xs px-2 py-1 rounded border ${getSeverityColor(vuln.severity)}`}>
                      {vuln.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-2">{vuln.description}</p>
                  <p className="text-gray-500 text-xs">
                    <strong>Remediation:</strong> {vuln.remediation}
                  </p>
                </div>
              ))}
              {vulnerabilities.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
                  <p>No security issues detected</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showNewScan && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold text-white mb-4">Start New SSL/TLS Scan</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Scan Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={scanForm.scanName}
                  onChange={(e) => {
                    setScanForm({ ...scanForm, scanName: e.target.value });
                    setFormErrors({ ...formErrors, scanName: '' });
                  }}
                  className={`w-full px-4 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none ${
                    formErrors.scanName
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-700 focus:border-green-500'
                  }`}
                  placeholder="e.g., Production Server SSL Audit"
                />
                {formErrors.scanName && (
                  <p className="text-red-400 text-xs mt-1">{formErrors.scanName}</p>
                )}
                <p className="text-gray-500 text-xs mt-1">Give this scan a descriptive name for your records</p>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Target Host <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={scanForm.targetHost}
                  onChange={(e) => {
                    setScanForm({ ...scanForm, targetHost: e.target.value });
                    setFormErrors({ ...formErrors, targetHost: '' });
                  }}
                  className={`w-full px-4 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none ${
                    formErrors.targetHost
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-700 focus:border-green-500'
                  }`}
                  placeholder="e.g., example.com or defenseterminal.com"
                />
                {formErrors.targetHost && (
                  <p className="text-red-400 text-xs mt-1">{formErrors.targetHost}</p>
                )}
                <p className="text-gray-500 text-xs mt-1">Enter hostname only (URLs will be auto-extracted)</p>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Target Port</label>
                <input
                  type="number"
                  value={scanForm.targetPort}
                  onChange={(e) => setScanForm({ ...scanForm, targetPort: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                />
                <p className="text-gray-500 text-xs mt-1">Default: 443 (HTTPS)</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={startScan}
                disabled={scanning}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {scanning ? 'Scanning...' : 'Start Scan'}
              </button>
              <button
                onClick={() => setShowNewScan(false)}
                disabled={scanning}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
