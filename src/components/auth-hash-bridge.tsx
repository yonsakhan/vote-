'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

function parseHash(hash: string) {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const p = new URLSearchParams(raw);
  return {
    access_token: p.get('access_token') || '',
    refresh_token: p.get('refresh_token') || '',
    type: p.get('type') || '',
  };
}

export default function AuthHashBridge() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    if (!hash.includes('access_token=')) return;

    let supabase: ReturnType<typeof getSupabaseBrowser>;
    try {
      supabase = getSupabaseBrowser();
    } catch {
      return;
    }

    const run = async () => {
      const parsed = parseHash(hash);
      if (!parsed.access_token || !parsed.refresh_token) return;
      const { error } = await supabase.auth.setSession({
        access_token: parsed.access_token,
        refresh_token: parsed.refresh_token,
      });
      if (!error) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        if (parsed.type === 'magiclink') router.replace('/polls');
      }
    };
    run();
  }, [router]);

  return null;
}
