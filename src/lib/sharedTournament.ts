import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { TournamentData } from '../types';
import { isSupabaseConfigured, supabase } from './supabase';

const STORAGE_KEY = 'hyack-table-tennis-data';

type TournamentSetter = (value: TournamentData | ((current: TournamentData) => TournamentData)) => void;

export function useSharedTournament(initialValue: TournamentData, userId?: string): [TournamentData, TournamentSetter, boolean] {
  const [tournament, setTournamentState] = useState(initialValue);
  const [loaded, setLoaded] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setTournamentState(JSON.parse(stored) as TournamentData);
      } catch {
        // Keep the empty fallback when local storage is unavailable.
      }
      return;
    }

    const client = supabase;
    let active = true;
    const load = async () => {
      const { data, error } = await client
        .from('tournament_state')
        .select('data')
        .eq('id', 'current')
        .maybeSingle();
      if (active && !error && data?.data) setTournamentState(data.data as TournamentData);
      if (active) setLoaded(true);
    };
    void load();

    const channel = client
      .channel('tournament-state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_state' }, (payload) => {
        const nextData = (payload.new as { data?: TournamentData } | null)?.data;
        if (nextData) setTournamentState(nextData);
      })
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (!isSupabaseConfigured || !supabase) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tournament));
    }
  }, [loaded, tournament]);

  const setTournament: TournamentSetter = (value) => {
    setTournamentState((current) => {
      const next = typeof value === 'function' ? value(current) : value;
      if (isSupabaseConfigured) void saveSharedTournament(next, userId);
      return next;
    });
  };

  return [tournament, setTournament, loaded];
}

export function useAdminSession(): { session: Session | null; loading: boolean; signIn: (email: string, password: string) => Promise<string | null>; signOut: () => Promise<void> } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return null;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  return { session, loading, signIn, signOut };
}

export async function saveSharedTournament(tournament: TournamentData, userId: string | undefined): Promise<string | null> {
  if (!supabase || !userId) return null;
  const { error } = await supabase.from('tournament_state').upsert({
    id: 'current',
    data: tournament,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  });
  return error?.message ?? null;
}
