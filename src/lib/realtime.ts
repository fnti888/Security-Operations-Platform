import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export function subscribeToTable<T>(
  tableName: string,
  onInsert?: (record: T) => void,
  onUpdate?: (record: T) => void,
  onDelete?: (record: T) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`${tableName}-changes`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      (payload) => {
        if (payload.eventType === 'INSERT' && onInsert) {
          onInsert(payload.new as T);
        } else if (payload.eventType === 'UPDATE' && onUpdate) {
          onUpdate(payload.new as T);
        } else if (payload.eventType === 'DELETE' && onDelete) {
          onDelete(payload.old as T);
        }
      }
    )
    .subscribe();

  return channel;
}

export function unsubscribe(channel: RealtimeChannel) {
  supabase.removeChannel(channel);
}
