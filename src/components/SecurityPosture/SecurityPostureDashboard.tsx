import React, { useState, useEffect } from 'react';
import { Shield, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Award, Target, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface PostureScore {
  overall_score: number;
  network_score: number;
  vulnerability_score: number;
  ssl_tls_score: number;
  incident_score: number;
  total_assets: number;
  vulnerable_assets: number;
  critical_vulnerabilities: number;
  high_vulnerabilities: number;
  ssl_issues: number;
  open_incidents: number;
  risk_level: string;
  compliance_status: string;
}

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  created_at: string;
}

interface Recommendation {
  id: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  impact: string;
  effort: string;
  status: string;
}

export const SecurityPostureDashboard: React.FC = () => {
  const { user } = useAuth();
  const [postureScore, setPostureScore] = useState<PostureScore | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPostureScore(),
        loadAlerts(),
        loadRecommendations(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPostureScore = async () => {
    const [vulnData, sslData, networkData] = await Promise.all([
      supabase.from('vulnerability_findings').select('severity, status').eq('status', 'open'),
      supabase.from('ssl_vulnerabilities').select('severity, status').eq('status', 'open'),
      supabase.from('network_hosts').select('status'),
    ]);

    const criticalVulns = vulnData.data?.filter(v => v.severity === 'critical').length || 0;
    const highVulns = vulnData.data?.filter(v => v.severity === 'high').length || 0;
    const sslIssues = sslData.data?.length || 0;
    const totalAssets = networkData.data?.length || 0;
    const vulnerableAssets = Math.min(criticalVulns + highVulns, totalAssets);

    let vulnerabilityScore = 100;
    vulnerabilityScore -= criticalVulns * 10;
    vulnerabilityScore -= highVulns * 5;
    vulnerabilityScore = Math.max(0, vulnerabilityScore);

    let sslScore = 100;
    sslScore -= sslIssues * 5;
    sslScore = Math.max(0, sslScore);

    const networkScore = totalAssets > 0 ? 85 : 100;
    const incidentScore = 90;

    const overallScore = Math.round(
      (vulnerabilityScore + sslScore + networkScore + incidentScore) / 4
    );

    let riskLevel = 'low';
    if (criticalVulns > 0) riskLevel = 'critical';
    else if (highVulns > 5) riskLevel = 'high';
    else if (highVulns > 0) riskLevel = 'medium';

    let complianceStatus = 'compliant';
    if (criticalVulns > 0 || highVulns > 3) complianceStatus = 'non_compliant';
    else if (highVulns > 0 || sslIssues > 0) complianceStatus = 'partial';

    setPostureScore({
      overall_score: overallScore,
      network_score: networkScore,
      vulnerability_score: vulnerabilityScore,
      ssl_tls_score: sslScore,
      incident_score: incidentScore,
      total_assets: totalAssets,
      vulnerable_assets: vulnerableAssets,
      critical_vulnerabilities: criticalVulns,
      high_vulnerabilities: highVulns,
      ssl_issues: sslIssues,
      open_incidents: 0,
      risk_level: riskLevel,
      compliance_status: complianceStatus,
    });

    if (criticalVulns > 0) {
      const newAlert: any = {
        user_id: user?.id,
        alert_type: 'critical_vuln',
        severity: 'critical',
        title: 'Critical Vulnerabilities Detected',
        message: `${criticalVulns} critical vulnerabilities require immediate attention`,
        source: 'Vulnerability Scanner',
        status: 'new',
      };
      const { data: existingAlerts } = await supabase
        .from('security_alerts')
        .select('id')
        .eq('alert_type', 'critical_vuln')
        .eq('status', 'new')
        .limit(1);

      if (!existingAlerts || existingAlerts.length === 0) {
        await supabase.from('security_alerts').insert(newAlert);
      }
    }

    if (criticalVulns > 0) {
      const newRec: any = {
        user_id: user?.id,
        category: 'vulnerability',
        priority: 'critical',
        title: 'Remediate Critical Vulnerabilities',
        description: `${criticalVulns} critical vulnerabilities need immediate remediation`,
        impact: 'Significantly reduces attack surface and prevents potential breaches',
        effort: 'high',
        status: 'open',
      };
      const { data: existingRecs } = await supabase
        .from('security_recommendations')
        .select('id')
        .eq('title', 'Remediate Critical Vulnerabilities')
        .eq('status', 'open')
        .limit(1);

      if (!existingRecs || existingRecs.length === 0) {
        await supabase.from('security_recommendations').insert(newRec);
      }
    }
  };

  const loadAlerts = async () => {
    const { data, error } = await supabase
      .from('security_alerts')
      .select('*')
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    setAlerts(data || []);
  };

  const loadRecommendations = async () => {
    const { data, error } = await supabase
      .from('security_recommendations')
      .select('*')
      .eq('status', 'open')
      .order('priority', { ascending: true })
      .limit(10);

    if (error) throw error;
    setRecommendations(data || []);
  };

  const acknowledgeAlert = async (alertId: string) => {
    await supabase
      .from('security_alerts')
      .update({ status: 'acknowledged', acknowledged_by: user?.id, acknowledged_at: new Date().toISOString() })
      .eq('id', alertId);
    await loadAlerts();
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-blue-400';
    if (score >= 50) return 'text-yellow-400';
    if (score >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-900/20 border-green-800';
    if (score >= 70) return 'bg-blue-900/20 border-blue-800';
    if (score >= 50) return 'bg-yellow-900/20 border-yellow-800';
    if (score >= 30) return 'bg-orange-900/20 border-orange-800';
    return 'bg-red-900/20 border-red-800';
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
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

  if (loading || !postureScore) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-gray-400 text-xl">Loading security posture...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Shield className="w-8 h-8 text-cyan-400" />
          Security Posture Dashboard
        </h1>
        <p className="text-gray-400 mt-2">Executive overview of your security status</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className={`col-span-1 border rounded-lg p-6 ${getScoreBgColor(postureScore.overall_score)}`}>
          <div className="text-center">
            <Award className="w-12 h-12 mx-auto mb-3 text-yellow-400" />
            <p className="text-gray-300 text-sm mb-2">Overall Security Score</p>
            <p className={`text-6xl font-bold ${getScoreColor(postureScore.overall_score)}`}>
              {postureScore.overall_score}
            </p>
            <p className="text-gray-400 text-xs mt-2">out of 100</p>
          </div>
        </div>

        <div className="col-span-3 grid grid-cols-4 gap-4">
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">Network</p>
              <Target className="w-5 h-5 text-cyan-400" />
            </div>
            <p className={`text-3xl font-bold ${getScoreColor(postureScore.network_score)}`}>
              {postureScore.network_score}
            </p>
            <p className="text-gray-500 text-xs mt-1">{postureScore.total_assets} assets</p>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">Vulnerabilities</p>
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <p className={`text-3xl font-bold ${getScoreColor(postureScore.vulnerability_score)}`}>
              {postureScore.vulnerability_score}
            </p>
            <p className="text-gray-500 text-xs mt-1">{postureScore.critical_vulnerabilities}C / {postureScore.high_vulnerabilities}H</p>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">SSL/TLS</p>
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <p className={`text-3xl font-bold ${getScoreColor(postureScore.ssl_tls_score)}`}>
              {postureScore.ssl_tls_score}
            </p>
            <p className="text-gray-500 text-xs mt-1">{postureScore.ssl_issues} issues</p>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">Incidents</p>
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <p className={`text-3xl font-bold ${getScoreColor(postureScore.incident_score)}`}>
              {postureScore.incident_score}
            </p>
            <p className="text-gray-500 text-xs mt-1">{postureScore.open_incidents} open</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-gray-900/80 to-gray-900/40 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Risk Level</p>
              <p className={`text-2xl font-bold ${getRiskColor(postureScore.risk_level)}`}>
                {postureScore.risk_level.toUpperCase()}
              </p>
            </div>
            <AlertTriangle className={`w-10 h-10 ${getRiskColor(postureScore.risk_level)}`} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-900/80 to-gray-900/40 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Vulnerable Assets</p>
              <p className="text-2xl font-bold text-white">
                {postureScore.vulnerable_assets} / {postureScore.total_assets}
              </p>
            </div>
            <Target className="w-10 h-10 text-orange-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-900/80 to-gray-900/40 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Compliance Status</p>
              <p className={`text-2xl font-bold ${
                postureScore.compliance_status === 'compliant' ? 'text-green-400' :
                postureScore.compliance_status === 'partial' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {postureScore.compliance_status.toUpperCase()}
              </p>
            </div>
            <CheckCircle className={`w-10 h-10 ${
              postureScore.compliance_status === 'compliant' ? 'text-green-400' :
              postureScore.compliance_status === 'partial' ? 'text-yellow-400' :
              'text-red-400'
            }`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Active Alerts ({alerts.length})
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {alerts.map(alert => (
              <div key={alert.id} className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-white font-medium">{alert.title}</p>
                  <span className={`text-xs px-2 py-1 rounded border ${getSeverityColor(alert.severity)}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-2">{alert.message}</p>
                <div className="flex justify-between items-center">
                  <p className="text-gray-500 text-xs">{new Date(alert.created_at).toLocaleString()}</p>
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="text-xs px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
                <p>No active alerts</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            Security Recommendations ({recommendations.length})
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recommendations.map(rec => (
              <div key={rec.id} className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-white font-medium">{rec.title}</p>
                  <span className={`text-xs px-2 py-1 rounded border ${getSeverityColor(rec.priority)}`}>
                    {rec.priority.toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-2">{rec.description}</p>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded">
                    Impact: {rec.impact}
                  </span>
                  <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded">
                    Effort: {rec.effort}
                  </span>
                </div>
              </div>
            ))}
            {recommendations.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
                <p>No open recommendations</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
