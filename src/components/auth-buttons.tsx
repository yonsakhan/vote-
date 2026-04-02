'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export default function AuthButtons() {
  const [enabled] = useState(() => {
    try {
      getSupabaseBrowser();
      return true;
    } catch {
      return false;
    }
  });
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [enabled]);

  const logout = async () => {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
  };

  if (!enabled) return null;

  if (!email) {
    return (
      <Link
        href="/login"
        className="btn-secondary px-4 py-2.5 rounded-xl text-sm font-semibold"
      >
        登录
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-100 text-sm font-semibold text-blue-700 max-w-[180px] truncate">
        {email}
      </div>
      <button
        onClick={logout}
        className="btn-secondary px-4 py-2.5 rounded-xl text-sm font-semibold"
      >
        退出
      </button>
    </div>
  );
}
