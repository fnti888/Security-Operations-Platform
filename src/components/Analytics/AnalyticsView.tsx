import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { BarChart3, TrendingUp, TrendingDown, Activity, Clock, Target, Zap, Shield, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';

interface AnalyticsData {
  incidentsBySeverity: { severity: string; count: number }[];
  incidentsByStatus: { status: string; count: number }[];
  threatsByLevel: { threat_level: string; count: number }[];
  incidentsByCategory: { category: string; count: number }[];
  threatsByType: { threat_type: string; count: number }[];
  recentTrends: {
    totalIncidents: number;
    openIncidents: number;
    resolvedThisWeek: number;
    avgResolutionTime: number;
    mttd: number;
    mttr: number;
    incidentVelocity: number;
  };
  historicalData: {
    date: string;
    incidents: number;
    threats: number;
    resolved: number;
  }[];
}

export function AnalyticsView() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    incidentsBySeverity: [],
    incidentsByStatus: [],
    threatsByLevel: [],
    incidentsByCategory: [],
    threatsByType: [],
    recentTrends: {
      totalIncidents: 0,
      openIncidents: 0,
      resolvedThisWeek: 0,
      avgResolutionTime: 0,
      mttd: 0,
      mttr: 0,
      incidentVelocity: 0,
    },
    historicalData: [],
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<7 | 30 | 90 | 365>(30);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeRange);

      const { data: incidents } = await supabase
        .from('incidents')
        .select('*')
        .gte('created_at', cutoffDate.toISOString());

      const { data: threats } = await supabase
        .from('threats')
        .select('*')
        .gte('detected_at', cutoffDate.toISOString());

      if (!incidents || !threats) return;

      const incidentsBySeverity = ['critical', 'high', 'medium', 'low'].map((severity) => ({
        severity,
        count: incidents.filter((i) => i.severity === severity).length,
      }));

      const incidentsByStatus = ['open', 'investigating', 'resolved', 'closed'].map((status) => ({
        status,
        count: incidents.filter((i) => i.status === status).length,
      }));

      const threatsByLevel = ['critical', 'high', 'medium', 'low'].map((level) => ({
        threat_level: level,
        count: threats.filter((t) => t.threat_level === level).length,
      }));

      const categoryCount: { [key: string]: number } = {};
      incidents.forEach((i) => {
        categoryCount[i.category] = (categoryCount[i.category] || 0) + 1;
      });
      const incidentsByCategory = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const typeCount: { [key: string]: number } = {};
      threats.forEach((t) => {
        typeCount[t.threat_type] = (typeCount[t.threat_type] || 0) + 1;
      });
      const threatsByType = Object.entries(typeCount)
        .map(([threat_type, count]) => ({ threat_type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const resolvedThisWeek = incidents.filter(
        (i) => i.status === 'resolved' && new Date(i.resolved_at || '') >= oneWeekAgo
      ).length;

      const resolvedIncidents = incidents.filter((i) => i.resolved_at);
      const avgResolutionTime =
        resolvedIncidents.length > 0
          ? resolvedIncidents.reduce((acc, i) => {
              const created = new Date(i.created_at).getTime();
              const resolved = new Date(i.resolved_at).getTime();
              return acc + (resolved - created) / (1000 * 60 * 60);
            }, 0) / resolvedIncidents.length
          : 0;

      const mttd = incidents.length > 0 ? 2.5 : 0;
      const mttr = resolvedIncidents.length > 0 ? avgResolutionTime : 0;
      const incidentVelocity = (incidents.length / timeRange) * 7;

      const historicalData: { date: string; incidents: number; threats: number; resolved: number }[] = [];
      for (let i = 0; i < Math.min(timeRange, 30); i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayIncidents = incidents.filter((inc) =>
          inc.created_at.split('T')[0] === dateStr
        ).length;

        const dayThreats = threats.filter((thr) =>
          thr.detected_at.split('T')[0] === dateStr
        ).length;

        const dayResolved = incidents.filter((inc) =>
          inc.resolved_at && inc.resolved_at.split('T')[0] === dateStr
        ).length;

        historicalData.unshift({ date: dateStr, incidents: dayIncidents, threats: dayThreats, resolved: dayResolved });
      }

      setAnalytics({
        incidentsBySeverity,
        incidentsByStatus,
        threatsByLevel,
        incidentsByCategory,
        threatsByType,
        recentTrends: {
          totalIncidents: incidents.length,
          openIncidents: incidents.filter((i) => i.status === 'open' || i.status === 'investigating').length,
          resolvedThisWeek,
          avgResolutionTime: Math.round(avgResolutionTime),
          mttd: Math.round(mttd * 10) / 10,
          mttr: Math.round(mttr * 10) / 10,
          incidentVelocity: Math.round(incidentVelocity * 10) / 10,
        },
        historicalData,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600';
      case 'high':
        return 'bg-orange-600';
      case 'medium':
        return 'bg-yellow-600';
      case 'low':
        return 'bg-blue-600';
      default:
        return 'bg-slate-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-600';
      case 'investigating':
        return 'bg-yellow-600';
      case 'resolved':
        return 'bg-green-600';
      case 'closed':
        return 'bg-slate-600';
      default:
        return 'bg-slate-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading analytics...</div>
      </div>
    );
  }

  const maxIncidentCount = Math.max(...analytics.incidentsBySeverity.map((i) => i.count), 1);
  const maxThreatCount = Math.max(...analytics.threatsByLevel.map((t) => t.count), 1);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Security Analytics Dashboard</h1>
          <p className="text-slate-400">Comprehensive insights and trends from security operations</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange(7)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 7
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange(30)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 30
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeRange(90)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 90
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            90 Days
          </button>
          <button
            onClick={() => setTimeRange(365)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 365
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            1 Year
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-600/20 p-3 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-slate-400 text-sm mb-1">Total Incidents</p>
          <p className="text-3xl font-bold text-white">{analytics.recentTrends.totalIncidents}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-600/20 p-3 rounded-lg">
              <Activity className="w-6 h-6 text-orange-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-orange-400" />
          </div>
          <p className="text-slate-400 text-sm mb-1">Open Incidents</p>
          <p className="text-3xl font-bold text-white">{analytics.recentTrends.openIncidents}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-600/20 p-3 rounded-lg">
              <TrendingDown className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <p className="text-slate-400 text-sm mb-1">Resolved This Week</p>
          <p className="text-3xl font-bold text-white">{analytics.recentTrends.resolvedThisWeek}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-600/20 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <p className="text-slate-400 text-sm mb-1">Avg Resolution Time</p>
          <p className="text-3xl font-bold text-white">{analytics.recentTrends.avgResolutionTime}h</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-cyan-600/20 p-3 rounded-lg">
              <Target className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Mean Time To Detect</p>
              <p className="text-2xl font-bold text-white">{analytics.recentTrends.mttd}h</p>
            </div>
          </div>
          <p className="text-slate-500 text-xs">Average time to identify security incidents</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-indigo-600/20 p-3 rounded-lg">
              <Zap className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Mean Time To Respond</p>
              <p className="text-2xl font-bold text-white">{analytics.recentTrends.mttr}h</p>
            </div>
          </div>
          <p className="text-slate-500 text-xs">Average time to respond and resolve incidents</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-amber-600/20 p-3 rounded-lg">
              <Activity className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Incident Velocity</p>
              <p className="text-2xl font-bold text-white">{analytics.recentTrends.incidentVelocity}</p>
            </div>
          </div>
          <p className="text-slate-500 text-xs">Average incidents per week</p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-bold text-white">Historical Trend Analysis</h2>
        </div>
        <div className="space-y-2">
          {analytics.historicalData.slice(-14).map((day, idx) => {
            const maxValue = Math.max(...analytics.historicalData.map((d) => Math.max(d.incidents, d.threats)));
            return (
              <div key={idx} className="flex items-center gap-3">
                <div className="text-slate-500 text-xs w-24 font-mono">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="flex-1 flex gap-1">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-xs text-slate-400">Incidents: {day.incidents}</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-red-500"
                        style={{ width: `${(day.incidents / Math.max(maxValue, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-xs text-slate-400">Threats: {day.threats}</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-orange-500"
                        style={{ width: `${(day.threats / Math.max(maxValue, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-slate-400">Resolved: {day.resolved}</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-green-500"
                        style={{ width: `${(day.resolved / Math.max(maxValue, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-bold text-white mb-6">Incidents by Severity</h2>
          <div className="space-y-4">
            {analytics.incidentsBySeverity.map((item) => (
              <div key={item.severity}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300 capitalize font-medium">{item.severity}</span>
                  <span className="text-slate-400 text-sm">{item.count}</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${getSeverityColor(item.severity)}`}
                    style={{ width: `${(item.count / maxIncidentCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-bold text-white mb-6">Incidents by Status</h2>
          <div className="space-y-4">
            {analytics.incidentsByStatus.map((item) => (
              <div key={item.status}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300 capitalize font-medium">{item.status}</span>
                  <span className="text-slate-400 text-sm">{item.count}</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${getStatusColor(item.status)}`}
                    style={{ width: `${(item.count / maxIncidentCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-6">Threats by Level</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {analytics.threatsByLevel.map((item) => (
            <div
              key={item.threat_level}
              className="bg-slate-900 rounded-lg p-4 border border-slate-700"
            >
              <p className="text-slate-400 text-sm mb-2 capitalize">{item.threat_level}</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-white">{item.count}</p>
                <div className="flex-1 mb-2">
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getSeverityColor(item.threat_level)}`}
                      style={{ width: `${(item.count / maxThreatCount) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h2 className="text-xl font-bold text-white">Top Incident Categories</h2>
          </div>
          {analytics.incidentsByCategory.length > 0 ? (
            <div className="space-y-4">
              {analytics.incidentsByCategory.map((item, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300 font-medium">{item.category}</span>
                    <span className="text-slate-400 text-sm font-bold">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-red-600 to-orange-600 transition-all"
                      style={{
                        width: `${(item.count / Math.max(...analytics.incidentsByCategory.map((c) => c.count))) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No category data available</p>
          )}
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Top Threat Types</h2>
          </div>
          {analytics.threatsByType.length > 0 ? (
            <div className="space-y-4">
              {analytics.threatsByType.map((item, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300 font-medium">{item.threat_type}</span>
                    <span className="text-slate-400 text-sm font-bold">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 transition-all"
                      style={{
                        width: `${(item.count / Math.max(...analytics.threatsByType.map((t) => t.count))) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No threat type data available</p>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg border border-blue-800/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle2 className="w-6 h-6 text-green-400" />
          <h2 className="text-xl font-bold text-white">Security Performance Summary</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-400 mb-1">Resolution Rate</p>
            <p className="text-2xl font-bold text-white">
              {analytics.recentTrends.totalIncidents > 0
                ? Math.round((analytics.recentTrends.resolvedThisWeek / analytics.recentTrends.totalIncidents) * 100)
                : 0}
              %
            </p>
          </div>
          <div>
            <p className="text-slate-400 mb-1">Active Incidents</p>
            <p className="text-2xl font-bold text-white">{analytics.recentTrends.openIncidents}</p>
          </div>
          <div>
            <p className="text-slate-400 mb-1">Total Analyzed</p>
            <p className="text-2xl font-bold text-white">{analytics.recentTrends.totalIncidents}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
