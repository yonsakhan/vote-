'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Poll } from '@/lib/types';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

type TabKey = 'created' | 'voted';

export default function MyPollsPage() {
  const [supabaseEnabled] = useState(() => {
    try {
      getSupabaseBrowser();
      return true;
    } catch {
      return false;
    }
  });
  const [tab, setTab] = useState<TabKey>('created');
  const [authChecked, setAuthChecked] = useState(!supabaseEnabled);
  const [userId, setUserId] = useState<string | null>(null);

  const queryKey = useMemo(() => `${tab}:${userId || ''}`, [tab, userId]);
  const [result, setResult] = useState<{ key: string; polls: Poll[]; error?: string } | null>(null);
  const current = result?.key === queryKey ? result : null;
  const polls = current?.polls || [];
  const error = current?.error || '';
  const loading = Boolean(userId) && !current && !error;

  useEffect(() => {
    if (!supabaseEnabled) return;
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setAuthChecked(true);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [supabaseEnabled]);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const qs = new URLSearchParams({
      sort: 'new',
      page: '1',
      pageSize: '50',
    });
    if (tab === 'created') qs.set('ownerId', userId);
    if (tab === 'voted') qs.set('voterId', userId);
    fetch(`/api/polls?${qs.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || '加载失败');
        setResult({ key: queryKey, polls: data.polls || [], error: '' });
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setResult({ key: queryKey, polls: [], error: e?.message || '加载失败' });
      });

    return () => controller.abort();
  }, [queryKey, tab, userId]);

  const copyLink = async (id: string) => {
    const url = `${window.location.origin}/vote/${id}`;
    await navigator.clipboard.writeText(url);
    alert('链接已复制！');
  };

  const deletePoll = async (id: string) => {
    const ok = confirm('确定要删除这个投票吗？删除后将无法恢复。');
    if (!ok) return;
    const res = await fetch(`/api/polls/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error || '删除失败');
      return;
    }
    setResult((prev) => {
      if (!prev || prev.key !== queryKey) return prev;
      return { ...prev, polls: prev.polls.filter((p) => p.id !== id) };
    });
  };

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="type-page font-bold text-heading">我的投票</h1>
            <div className="type-body text-secondary mt-1">本地记录你创建过的投票</div>
          </div>
          <Link href="/create" className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold text-white text-center">
            + 创建投票
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={() => setTab('created')}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
              tab === 'created'
                ? 'surface-chip text-accent'
                : 'action-outline'
            }`}
          >
            我创建的
          </button>
          <button
            onClick={() => setTab('voted')}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
              tab === 'voted'
                ? 'surface-chip text-accent'
                : 'action-outline'
            }`}
          >
            我参与的
          </button>
        </div>
      </div>

      {!authChecked ? (
        <div className="flex items-center justify-center py-24">
          <div className="loader-ring" />
        </div>
      ) : !userId ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4 opacity-30">🔐</div>
          <h2 className="text-heading font-semibold mb-2">登录后查看</h2>
          <div className="type-body text-secondary mb-6">“我创建的 / 我参与的”需要登录后才能展示</div>
          <Link href="/login?next=%2Fmy" className="inline-block btn-primary px-8 py-3 rounded-xl text-white font-semibold">
            去登录
          </Link>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="loader-ring" />
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <div className="text-heading font-semibold mb-2">加载失败</div>
          <div className="type-body text-secondary">{error}</div>
        </div>
      ) : polls.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4 opacity-30">📭</div>
          <div className="text-heading font-semibold mb-2">
            {tab === 'created' ? '还没有创建过投票' : '还没有参与过投票'}
          </div>
          <div className="type-body text-secondary mb-6">
            {tab === 'created' ? '创建一个投票后会在这里展示' : '参与投票后会在这里展示'}
          </div>
          <Link href={tab === 'created' ? '/create' : '/polls'} className="inline-block btn-primary px-8 py-3 rounded-xl text-white font-semibold">
            {tab === 'created' ? '去创建' : '去投票'}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {polls.map((poll) => (
            <div key={poll.id} className="card p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-heading truncate">{poll.title}</div>
                  {poll.description && (
                    <div className="type-body text-secondary mt-1 line-clamp-2">{poll.description}</div>
                  )}
                  <div className="text-sm text-muted mt-3 flex flex-wrap items-center gap-3">
                    <span>参与人数 {poll.totalVotes}</span>
                    <span>·</span>
                    <span>选项 {poll.options.length}</span>
                    {poll.deadline && (
                      <>
                        <span>·</span>
                        <span>
                          截止 {new Date(poll.deadline).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                  <Link
                    href={`/vote/${poll.id}`}
                    className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold text-white text-center"
                  >
                    打开
                  </Link>
                  <button
                    className="btn-secondary px-4 py-2 rounded-xl text-sm"
                    onClick={() => copyLink(poll.id)}
                  >
                    复制链接
                  </button>
                  {tab === 'created' && (
                    <button
                      className="px-4 py-2 rounded-xl text-sm action-outline action-outline-danger transition-colors"
                      onClick={() => deletePoll(poll.id)}
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tag">投票</span>
                  {poll.multiSelect && <span className="tag tag-accent">多选</span>}
                  {Array.isArray(poll.tags) && poll.tags.length > 0 && (
                    <span className="tag tag-neutral">{poll.tags.slice(0, 2).join(' / ')}</span>
                  )}
                </div>
                <div className="text-sm text-muted">
                  {tab === 'created' ? '你创建的投票' : '你参与过的投票'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
