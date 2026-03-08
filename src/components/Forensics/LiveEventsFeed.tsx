import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, AlertCircle, FileText, Network, Settings, Info, AlertTriangle, XCircle, Search, Filter, Download, X } from 'lucide-react';

interface LiveEvent {
  id: string;
  event_category: string;
  event_name: string;
  severity: string;
  description: string;
  metadata?: any;
  source_ip: string | null;
  destination_ip: string | null;
  username: string | null;
  timestamp: string;
  automated: boolean;
}

export function LiveEventsFeed() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<LiveEvent[]>([]);
  const [isLive, setIsLive] = useState(true);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const [eventCount, setEventCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LiveEvent | null>(null);

  useEffect(() => {
    fetchInitialEvents();

    const channel = supabase
      .channel('live_events_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_events',
        },
        (payload) => {
          const newEvent = payload.new as LiveEvent;
          setEvents((prev) => [newEvent, ...prev.slice(0, 499)]);
          setEventCount((prev) => prev + 1);

          if (isLive) {
            setTimeout(() => {
              eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLive]);

  useEffect(() => {
    applyFilters();
  }, [events, searchQuery, filterSeverity, filterCategory]);

  const fetchInitialEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('live_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(200);

      if (error) throw error;
      setEvents(data || []);
      setEventCount(data?.length || 0);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const applyFilters = () => {
    let filtered = events;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((event) =>
        event.event_name.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.source_ip?.toLowerCase().includes(query) ||
        event.destination_ip?.toLowerCase().includes(query) ||
        event.username?.toLowerCase().includes(query)
      );
    }

    if (filterSeverity !== 'all') {
      filtered = filtered.filter((event) => event.severity.toLowerCase() === filterSeverity.toLowerCase());
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter((event) => event.event_category.toLowerCase() === filterCategory.toLowerCase());
    }

    setFilteredEvents(filtered);
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(filteredEvents, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `live-events-${Date.now()}.json`;
    link.click();
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Category', 'Event', 'Severity', 'Description', 'Source IP', 'Dest IP', 'Username'];
    const rows = filteredEvents.map((event) => [
      event.timestamp,
      event.event_category,
      event.event_name,
      event.severity,
      event.description,
      event.source_ip || '',
      event.destination_ip || '',
      event.username || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))
    ].join('\n');

    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `live-events-${Date.now()}.csv`;
    link.click();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'network':
        return <Network className="w-4 h-4" />;
      case 'process':
        return <Activity className="w-4 h-4" />;
      case 'file':
        return <FileText className="w-4 h-4" />;
      case 'security':
        return <AlertCircle className="w-4 h-4" />;
      case 'system':
        return <Settings className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'high':
        return <AlertCircle className="w-4 h-4 text-orange-400" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'low':
        return <Info className="w-4 h-4 text-blue-400" />;
      case 'info':
        return <Info className="w-4 h-4 text-slate-400" />;
      default:
        return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'network':
        return 'text-blue-400 bg-blue-900/20';
      case 'process':
        return 'text-green-400 bg-green-900/20';
      case 'file':
        return 'text-purple-400 bg-purple-900/20';
      case 'security':
        return 'text-red-400 bg-red-900/20';
      case 'system':
        return 'text-yellow-400 bg-yellow-900/20';
      default:
        return 'text-slate-400 bg-slate-900/20';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-700 bg-red-900/10';
      case 'high':
        return 'border-orange-700 bg-orange-900/10';
      case 'medium':
        return 'border-yellow-700 bg-yellow-900/10';
      case 'low':
        return 'border-blue-700 bg-blue-900/10';
      case 'info':
        return 'border-slate-700 bg-slate-900/10';
      default:
        return 'border-slate-700 bg-slate-900/10';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatFullTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className="w-5 h-5 text-blue-400" />
            {isLive && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Live Event Stream</h3>
            <p className="text-xs text-slate-400">
              {filteredEvents.length} of {eventCount} events
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded transition-colors ${
              showFilters
                ? 'bg-blue-900/20 text-blue-400 border border-blue-700'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title="Toggle filters"
          >
            <Filter className="w-4 h-4" />
          </button>
          <div className="relative group">
            <button
              className="p-2 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
              title="Export data"
            >
              <Download className="w-4 h-4" />
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-slate-800 border border-slate-700 rounded shadow-lg z-10">
              <button
                onClick={exportToJSON}
                className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-700 whitespace-nowrap"
              >
                Export as JSON
              </button>
              <button
                onClick={exportToCSV}
                className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-700 whitespace-nowrap"
              >
                Export as CSV
              </button>
            </div>
          </div>
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              isLive
                ? 'bg-red-900/20 text-red-400 border border-red-700'
                : 'bg-slate-700 text-slate-300 border border-slate-600'
            }`}
          >
            {isLive ? '● LIVE' : 'PAUSED'}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-4 p-3 bg-slate-900 rounded-lg border border-slate-700 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search events, IPs, users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="network">Network</option>
              <option value="application">Application</option>
              <option value="authentication">Authentication</option>
              <option value="data access">Data Access</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>
              {events.length === 0
                ? 'Waiting for live events...'
                : 'No events match your filters'}
            </p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              onClick={() => setSelectedEvent(event)}
              className={`p-3 rounded-lg border-l-4 ${getSeverityColor(
                event.severity
              )} hover:bg-slate-900/50 transition-all animate-fade-in cursor-pointer`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">{getSeverityIcon(event.severity)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${getCategoryColor(event.event_category)}`}>
                      {event.event_category.toUpperCase()}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      {formatTime(event.timestamp)}
                    </span>
                    {event.automated && (
                      <span className="text-xs text-slate-600">[AUTO]</span>
                    )}
                  </div>
                  <p className="text-white font-medium text-sm mb-1">{event.event_name}</p>
                  <p className="text-slate-400 text-xs mb-2">{event.description}</p>
                  {(event.source_ip || event.destination_ip || event.username) && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {event.source_ip && (
                        <span className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-400">
                          SRC: {event.source_ip}
                        </span>
                      )}
                      {event.destination_ip && (
                        <span className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-400">
                          DST: {event.destination_ip}
                        </span>
                      )}
                      {event.username && (
                        <span className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-400">
                          USER: {event.username}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={eventsEndRef} />
      </div>

      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

interface EventDetailModalProps {
  event: LiveEvent;
  onClose: () => void;
}

function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const formatFullTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'text-red-400 bg-red-900/20 border-red-700';
      case 'high':
        return 'text-orange-400 bg-orange-900/20 border-orange-700';
      case 'medium':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
      case 'low':
        return 'text-blue-400 bg-blue-900/20 border-blue-700';
      default:
        return 'text-slate-400 bg-slate-900/20 border-slate-700';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'network':
        return 'text-blue-400 bg-blue-900/20';
      case 'application':
        return 'text-green-400 bg-green-900/20';
      case 'authentication':
        return 'text-purple-400 bg-purple-900/20';
      case 'data access':
        return 'text-cyan-400 bg-cyan-900/20';
      case 'security':
        return 'text-red-400 bg-red-900/20';
      case 'system':
        return 'text-yellow-400 bg-yellow-900/20';
      default:
        return 'text-slate-400 bg-slate-900/20';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Event Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">{event.event_name}</h3>
            <p className="text-slate-300 leading-relaxed">{event.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`text-sm px-4 py-2 rounded-lg border font-semibold ${getSeverityColor(event.severity)}`}>
              {event.severity.toUpperCase()} SEVERITY
            </span>
            <span className={`text-sm px-4 py-2 rounded-lg font-semibold ${getCategoryColor(event.event_category)}`}>
              {event.event_category.toUpperCase()}
            </span>
            {event.automated && (
              <span className="text-sm px-4 py-2 rounded-lg border border-slate-700 text-slate-300 bg-slate-900/50 font-semibold">
                AUTOMATED
              </span>
            )}
          </div>

          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-500 text-sm mb-1">Timestamp</p>
            <p className="text-white font-medium font-mono">{formatFullTime(event.timestamp)}</p>
          </div>

          {(event.source_ip || event.destination_ip || event.username) && (
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 space-y-3">
              <h4 className="text-white font-semibold mb-3">Network Information</h4>
              <div className="grid grid-cols-2 gap-4">
                {event.source_ip && (
                  <div>
                    <p className="text-slate-500 text-sm mb-1">Source IP</p>
                    <p className="text-white font-medium font-mono">{event.source_ip}</p>
                  </div>
                )}
                {event.destination_ip && (
                  <div>
                    <p className="text-slate-500 text-sm mb-1">Destination IP</p>
                    <p className="text-white font-medium font-mono">{event.destination_ip}</p>
                  </div>
                )}
                {event.username && (
                  <div>
                    <p className="text-slate-500 text-sm mb-1">Username</p>
                    <p className="text-white font-medium font-mono">{event.username}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {event.metadata && Object.keys(event.metadata).length > 0 && (
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
              <h4 className="text-white font-semibold mb-3">Additional Metadata</h4>
              <div className="space-y-2">
                {Object.entries(event.metadata).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-3">
                    <span className="text-slate-500 text-sm min-w-[120px] font-medium">{key}:</span>
                    <span className="text-white text-sm font-mono flex-1">
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <h4 className="text-white font-semibold mb-3">Event ID</h4>
            <p className="text-slate-400 text-sm font-mono break-all">{event.id}</p>
          </div>
        </div>

        <div className="p-6 border-t border-slate-700 bg-slate-900/50">
          <button
            onClick={onClose}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
