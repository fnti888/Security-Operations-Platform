import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, FileText, HardDrive, Network, User, Database, Filter, Download } from 'lucide-react';
import { exportToJSON, exportToCSV } from '../../lib/exportUtils';

interface TimelineEvent {
  id: string;
  timestamp: string;
  event_type: string;
  source: string;
  description: string;
  metadata: Record<string, unknown>;
}

interface Investigation {
  id: string;
  case_number: string;
  title: string;
  status: string;
}

export function ForensicTimeline() {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedInvestigation, setSelectedInvestigation] = useState<string>('');
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    fetchInvestigations();
  }, []);

  useEffect(() => {
    if (selectedInvestigation) {
      fetchTimeline();
    }
  }, [selectedInvestigation]);

  const fetchInvestigations = async () => {
    try {
      const { data, error } = await supabase
        .from('investigations')
        .select('id, case_number, title, status')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvestigations(data || []);
      if (data && data.length > 0) {
        setSelectedInvestigation(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching investigations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    try {
      const { data, error } = await supabase
        .from('forensic_timeline')
        .select('*')
        .eq('investigation_id', selectedInvestigation)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setTimeline(data || []);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    }
  };

  const filteredTimeline = timeline.filter(
    (event) => filterType === 'all' || event.event_type === filterType
  );

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'file_access':
        return <FileText className="w-4 h-4" />;
      case 'network':
        return <Network className="w-4 h-4" />;
      case 'process':
        return <Database className="w-4 h-4" />;
      case 'user_activity':
        return <User className="w-4 h-4" />;
      case 'disk':
        return <HardDrive className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'file_access':
        return 'bg-purple-900/20 border-purple-700 text-purple-400';
      case 'network':
        return 'bg-blue-900/20 border-blue-700 text-blue-400';
      case 'process':
        return 'bg-green-900/20 border-green-700 text-green-400';
      case 'user_activity':
        return 'bg-yellow-900/20 border-yellow-700 text-yellow-400';
      case 'disk':
        return 'bg-orange-900/20 border-orange-700 text-orange-400';
      default:
        return 'bg-slate-900/20 border-slate-700 text-slate-400';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading forensic data...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 font-mono">FORENSIC TIMELINE ANALYZER</h1>
        <p className="text-slate-400">Temporal analysis and event correlation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <div className="lg:col-span-3 bg-slate-800 rounded-lg border border-slate-700 p-4">
          <div className="flex items-center gap-4 mb-4">
            <select
              value={selectedInvestigation}
              onChange={(e) => setSelectedInvestigation(e.target.value)}
              className="flex-1 px-4 py-2 bg-slate-900 border border-slate-600 rounded text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {investigations.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  [{inv.case_number}] {inv.title}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 bg-slate-900 border border-slate-600 rounded text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">ALL EVENTS</option>
                <option value="file_access">FILE ACCESS</option>
                <option value="network">NETWORK</option>
                <option value="process">PROCESS</option>
                <option value="user_activity">USER ACTIVITY</option>
                <option value="disk">DISK</option>
              </select>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-mono text-sm flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                EXPORT
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 bg-slate-800 border border-slate-700 rounded shadow-lg z-10 min-w-[150px]">
                  <button
                    onClick={() => {
                      exportToJSON(filteredTimeline, `timeline-${selectedInvestigation}-${new Date().toISOString().split('T')[0]}.json`);
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-white hover:bg-slate-700 font-mono text-xs"
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => {
                      exportToCSV(filteredTimeline as Record<string, unknown>[], `timeline-${selectedInvestigation}-${new Date().toISOString().split('T')[0]}.csv`);
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-white hover:bg-slate-700 font-mono text-xs"
                  >
                    CSV
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-black/50 rounded border border-slate-700 p-4 font-mono text-xs">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-slate-400">TIMELINE EVENTS: {filteredTimeline.length}</span>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredTimeline.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  NO TIMELINE EVENTS RECORDED
                </div>
              ) : (
                filteredTimeline.map((event) => {
                  const time = formatTimestamp(event.timestamp);
                  return (
                    <div
                      key={event.id}
                      className={`p-3 rounded border ${getEventColor(event.event_type)} animate-fade-in`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5">{getEventIcon(event.event_type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-white font-semibold">{time.date}</span>
                            <span className="text-green-400">{time.time}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-900/50 border border-slate-600 uppercase">
                              {event.event_type}
                            </span>
                          </div>
                          <div className="text-slate-300 mb-1">{event.description}</div>
                          <div className="text-slate-500 text-xs">
                            SOURCE: {event.source}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 font-mono uppercase">Investigation Info</h3>
            {investigations.find((i) => i.id === selectedInvestigation) && (
              <div className="space-y-2 text-xs font-mono">
                <div>
                  <span className="text-slate-500">CASE #:</span>
                  <div className="text-white">
                    {investigations.find((i) => i.id === selectedInvestigation)?.case_number}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">STATUS:</span>
                  <div className="text-green-400 uppercase">
                    {investigations.find((i) => i.id === selectedInvestigation)?.status}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">EVENTS:</span>
                  <div className="text-white">{timeline.length}</div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 font-mono uppercase">Event Distribution</h3>
            <div className="space-y-2 text-xs font-mono">
              {['file_access', 'network', 'process', 'user_activity', 'disk'].map((type) => {
                const count = timeline.filter((e) => e.event_type === type).length;
                const percentage = timeline.length > 0 ? (count / timeline.length) * 100 : 0;
                return (
                  <div key={type}>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400 uppercase">{type.replace('_', ' ')}</span>
                      <span className="text-white">{count}</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
