
import { RealtimeChannel } from 'https://esm.sh/@supabase/supabase-js@2.45.1';
import { supabase } from '../lib/supabase.ts';
import { Broadcast, BroadcastMode } from "../types.ts";

// Configured state
const isSupabaseConfigured = Boolean(supabase);

// Storage keys - versioned to handle schema changes or storage clearing
const LOCAL_STORAGE_KEY = 'rebel_radio_v4_archive';
const LOCAL_QUOTA_KEY = 'rebel_radio_v4_quota';

let schemaErrorDetected = false;
let lastCallSuccessful = false;

export interface QuotaData {
  count: number;
  resetAt: number;
}

const getClientId = () => {
  let id = localStorage.getItem('rebel_radio_client_id');
  if (!id) {
    id = 'CLIENT_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('rebel_radio_client_id', id);
  }
  return id;
};

const getFromLocal = (): Broadcast[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error reading local storage:", e);
    return [];
  }
};

export const getCloudStatus = () => {
  if (!supabase) return 'offline';
  if (schemaErrorDetected) return 'schema_error';
  if (lastCallSuccessful) return 'connected';
  return 'connecting';
};

/**
 * Verifies if a code exists in the 'access_codes' table.
 * Expected Table Schema: access_codes (id: int, code: text unique)
 */
export const validateAccessCode = async (code: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase
      .from('access_codes')
      .select('code')
      .eq('code', code.trim().toUpperCase())
      .single();
    
    if (error) {
      console.warn("Auth check failed:", error.message);
      return false;
    }
    return !!data;
  } catch (e) {
    return false;
  }
};

export const subscribeToNewBroadcasts = (onNewBroadcast: (broadcast: Broadcast) => void): RealtimeChannel | null => {
  if (!supabase) return null;

  const channel = supabase
    .channel('broadcasts_realtime_feed')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'broadcasts' },
      (payload) => {
        const row = payload.new;
        const broadcast: Broadcast = {
          id: row.id.toString(),
          title: row.title || "Incoming Signal",
          prompt: row.prompt || "Live Transmission",
          script: row.script || "",
          audioData: row.audio_base_64 || '',
          imageUrl: `https://8i2lyyp4z9.ufs.sh/f/wkNKU1LyOpNgacHHzCAdxsIb68hCEn4TJuGqtSlFBV5vDPf2`,
          mode: (row.mode?.toUpperCase() as BroadcastMode) || BroadcastMode.CREATIVE,
          createdAt: new Date(row.created_at).getTime()
        };
        onNewBroadcast(broadcast);
      }
    )
    .subscribe();

  return channel;
};

export const saveBroadcast = async (broadcast: Broadcast): Promise<void> => {
  if (supabase && !schemaErrorDetected) {
    try {
      const { error: broadcastError } = await supabase
        .from('broadcasts')
        .insert([{
          title: broadcast.title,
          script: broadcast.script,
          audio_base_64: broadcast.audioData,
          mode: broadcast.mode.toLowerCase(),
          prompt: broadcast.prompt,
          created_at: new Date().toISOString()
        }]);

      if (broadcastError) throw broadcastError;
      lastCallSuccessful = true;
    } catch (e) {
      saveToLocal(broadcast);
    }
  } else {
    saveToLocal(broadcast);
  }
};

const saveToLocal = (broadcast: Broadcast) => {
  try {
    const existing = getFromLocal();
    const updated = [broadcast, ...existing]
      .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
      .slice(0, 5);
      
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([broadcast]));
  }
  
  try {
    const now = Date.now();
    const oneDay = 86400000;
    const qData = localStorage.getItem(LOCAL_QUOTA_KEY);
    let quota = qData ? JSON.parse(qData) : { count: 0, resetAt: now + oneDay };
    if (now > quota.resetAt) {
      quota = { count: 1, resetAt: now + oneDay };
    } else {
      quota.count = (quota.count || 0) + 1;
    }
    localStorage.setItem(LOCAL_QUOTA_KEY, JSON.stringify(quota));
  } catch (e) {}
};

export const getBroadcasts = async (): Promise<Broadcast[]> => {
  const localData = getFromLocal();
  if (supabase && !schemaErrorDetected) {
    try {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) return localData;

      const cloudData: Broadcast[] = (data || []).map(row => ({
        id: row.id.toString(),
        title: row.title || "Underground Signal",
        prompt: row.prompt || "Transmitted Data",
        script: row.script || '',
        audioData: row.audio_base_64 || '',
        imageUrl: row.image_url || `https://8i2lyyp4z9.ufs.sh/f/wkNKU1LyOpNgacHHzCAdxsIb68hCEn4TJuGqtSlFBV5vDPf2`,
        mode: row.mode?.toUpperCase() as BroadcastMode,
        createdAt: new Date(row.created_at).getTime()
      }));

      const combined = [...cloudData];
      localData.forEach(localItem => {
        const existsInCloud = cloudData.some(cloudItem => 
          cloudItem.script === localItem.script || cloudItem.id === localItem.id
        );
        if (!existsInCloud) combined.push(localItem);
      });

      return combined.sort((a, b) => b.createdAt - a.createdAt).slice(0, 20);
    } catch (err) {
      return localData;
    }
  }
  return localData;
};

export const getQuota = async (): Promise<QuotaData> => {
  const now = Date.now();
  const oneDay = 86400000;
  if (supabase && !schemaErrorDetected) {
    try {
      const clientId = getClientId();
      const { data, error } = await supabase
        .from('quotas')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) return getLocalQuota(now, oneDay);

      lastCallSuccessful = true;
      const quota: QuotaData = { count: data.count, resetAt: data.resetAt };
      if (now > quota.resetAt) {
        const refreshed = { count: 0, resetAt: now + oneDay };
        supabase.from('quotas').upsert({ id: clientId, ...refreshed }).then();
        return refreshed;
      }
      return quota;
    } catch (err) {
      return getLocalQuota(now, oneDay);
    }
  }
  return getLocalQuota(now, oneDay);
};

const getLocalQuota = (now: number, oneDay: number): QuotaData => {
  try {
    const data = localStorage.getItem(LOCAL_QUOTA_KEY);
    if (!data) return { count: 0, resetAt: now + oneDay };
    const quota = JSON.parse(data);
    if (now > quota.resetAt) {
      const refreshed = { count: 0, resetAt: now + oneDay };
      localStorage.setItem(LOCAL_QUOTA_KEY, JSON.stringify(refreshed));
      return refreshed;
    }
    return quota;
  } catch (e) {
    return { count: 0, resetAt: now + oneDay };
  }
};
