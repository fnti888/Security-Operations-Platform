import { supabase } from './supabase';

export interface ActivityData {
  actionType: string;
  viewName?: string;
  metadata?: Record<string, any>;
}

export async function trackActivity(data: ActivityData): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('user_activity').insert({
      user_id: user?.id || null,
      action_type: data.actionType,
      view_name: data.viewName,
      metadata: data.metadata || {},
      ip_address: null,
    });
  } catch (error) {
    console.error('Failed to track activity:', error);
  }
}

export async function logTerminalMessage(
  message: string,
  logType: 'info' | 'success' | 'warning' | 'error' = 'info',
  source: string = 'system'
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('terminal_logs').insert({
      user_id: user?.id || null,
      message,
      log_type: logType,
      source,
    });
  } catch (error) {
    console.error('Failed to log terminal message:', error);
  }
}

export async function recordSystemMetrics(metrics: {
  cpuUsage: number;
  memoryUsage: number;
  networkUsage: number;
  activeThreats: number;
}): Promise<void> {
  try {
    await supabase.from('system_metrics').insert({
      cpu_usage: metrics.cpuUsage,
      memory_usage: metrics.memoryUsage,
      network_usage: metrics.networkUsage,
      active_threats: metrics.activeThreats,
    });
  } catch (error) {
    console.error('Failed to record system metrics:', error);
  }
}

export async function getUserActivity(userId: string, limit: number = 50) {
  const { data, error } = await supabase
    .from('user_activity')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getRecentTerminalLogs(limit: number = 100) {
  const { data, error } = await supabase
    .from('terminal_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getRecentSystemMetrics(hours: number = 1) {
  const { data, error } = await supabase
    .from('system_metrics')
    .select('*')
    .gte('recorded_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
    .order('recorded_at', { ascending: false });

  if (error) throw error;
  return data;
}
