import { supabase } from './supabase';

export type ThemeMode = 'classic' | 'accessible' | 'midnight' | 'matrix';

export interface UserSettings {
  userId: string;
  themeMode: ThemeMode;
  reduceMotion: boolean;
  notificationsEnabled: boolean;
  updatedAt: string;
}

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user settings:', error);
    return null;
  }

  if (!data) return null;

  return {
    userId: data.user_id,
    themeMode: data.theme_mode as ThemeMode,
    reduceMotion: data.reduce_motion,
    notificationsEnabled: data.notifications_enabled,
    updatedAt: data.updated_at,
  };
}

export async function saveUserSettings(
  userId: string,
  settings: Partial<Omit<UserSettings, 'userId' | 'updatedAt'>>
): Promise<void> {
  const updateData: any = {};

  if (settings.themeMode !== undefined) {
    updateData.theme_mode = settings.themeMode;
  }
  if (settings.reduceMotion !== undefined) {
    updateData.reduce_motion = settings.reduceMotion;
  }
  if (settings.notificationsEnabled !== undefined) {
    updateData.notifications_enabled = settings.notificationsEnabled;
  }

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      ...updateData,
    });

  if (error) {
    throw new Error(`Failed to save user settings: ${error.message}`);
  }
}

export async function initializeUserSettings(userId: string): Promise<void> {
  const existing = await getUserSettings(userId);
  if (!existing) {
    await saveUserSettings(userId, {
      themeMode: 'classic',
      reduceMotion: false,
      notificationsEnabled: true,
    });
  }
}
