'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Poll } from '@/lib/types';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

type StatusFilter = 'all' | 'ongoing' | 'ended';
type SortKey = 'new' | 'hot';
type ScopeKey = 'all' | 'mine' | 'voted';

export default function PollsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <div className="w-12 h-12 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin" />
        </div>
      }
    >
      <PollsInner />
    </Suspense>
  );
}

function PollsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initial = useMemo(() => {
    const q = searchParams.get('q') ?? '';
    const status = (searchParams.get('status') as StatusFilter) ?? 'all';
    const sort = (searchParams.get('sort') as SortKey) ?? 'new';
    const scope = (searchParams.get('scope') as ScopeKey) ?? 'all';
    const tags = searchParams.get('tags') ?? '';
    const page = Number(searchParams.get('page') ?? '1') || 1;
    const pageSize = Number(searchParams.get('pageSize') ?? '12') || 12;
    return {
      q,
      status: ['all', 'ongoing', 'ended'].includes(status) ? status : ('all' as const),
      sort: ['new', 'hot'].includes(sort) ? sort : ('new' as const),
      scope: ['all', 'mine', 'voted'].includes(scope) ? scope : ('all' as const),
      tags,
      page: page < 1 ? 1 : page,
      pageSize: pageSize < 1 ? 12 : pageSize,
    };
  }, [searchParams]);

  const [qInput, setQInput] = useState(initial.q);
  const [q, setQ] = useState(initial.q);
  const [status, setStatus] = useState<StatusFilter>(initial.status);
  const [sort, setSort] = useState<SortKey>(initial.sort);
  const [scope, setScope] = useState<ScopeKey>(initial.scope);
  const [tagsInput, setTagsInput] = useState(initial.tags);
  const [tags, setTags] = useState(initial.tags);
  const [page, setPage] = useState(initial.page);
  const [pageSize] = useState(initial.pageSize);
  const [userId, setUserId] = useState<string | null>(null);

  const queryKey = useMemo(() => {
    return JSON.stringify({
      q: q.trim(),
      status,
      sort,
      scope,
      tags: tags.trim(),
      userId: scope === 'all' ? null : userId,
      page,
      pageSize,
    });
  }, [page, pageSize, q, scope, sort, status, tags, userId]);

  const [result, setResult] = useState<{
    key: string;
    polls: Poll[];
    total: number;
    error?: string;
  } | null>(null);

  const current = result?.key === queryKey ? result : null;
  const polls = current?.polls || [];
  const total = current?.total || 0;
  const error = current?.error || '';
  const loading = !current && !error;

  const syncUrl = (next: { q: string; status: StatusFilter; sort: SortKey; page: number; scope: ScopeKey; tags: string }) => {
    const params = new URLSearchParams();
    if (next.q.trim()) params.set('q', next.q.trim());
    if (next.status !== 'all') params.set('status', next.status);
    if (next.sort !== 'new') params.set('sort', next.sort);
    if (next.scope !== 'all') params.set('scope', next.scope);
    if (next.tags.trim()) params.set('tags', next.tags.trim());
    if (next.page !== 1) params.set('page', String(next.page));
    if (pageSize !== 12) params.set('pageSize', String(pageSize));
    const qs = params.toString();
    router.replace(qs ? `/polls?${qs}` : '/polls');
  };

  useEffect(() => {
    let supabase: ReturnType<typeof getSupabaseBrowser>;
    try {
      supabase = getSupabaseBrowser();
    } catch {
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (status !== 'all') params.set('status', status);
    params.set('sort', sort);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (tags.trim()) params.set('tags', tags.trim());
    if (scope === 'mine' && userId) params.set('ownerId', userId);
    if (scope === 'voted' && userId) params.set('voterId', userId);

    const controller = new AbortController();
    fetch(`/api/polls?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || '加载失败');
        setResult({
          key: queryKey,
          polls: data.polls || [],
          total: data.meta?.total ?? (data.polls?.length || 0),
          error: '',
        });
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setResult({
          key: queryKey,
          polls: [],
          total: 0,
          error: e?.message || '加载失败',
        });
      });

    return () => controller.abort();
  }, [page, pageSize, q, queryKey, sort, status, tags, scope, userId]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const applySearch = () => {
    const next = { q: qInput, status, sort, page: 1, scope, tags };
    setQ(qInput);
    setPage(1);
    syncUrl(next);
  };

  const updateStatus = (v: StatusFilter) => {
    const next = { q, status: v, sort, page: 1, scope, tags };
    setStatus(v);
    setPage(1);
    syncUrl(next);
  };

  const updateSort = (v: SortKey) => {
    const next = { q, status, sort: v, page: 1, scope, tags };
    setSort(v);
    setPage(1);
    syncUrl(next);
  };

  const updateScope = (v: ScopeKey) => {
    const next = { q, status, sort, page: 1, scope: v, tags };
    setScope(v);
    setPage(1);
    syncUrl(next);
  };

  const applyTags = () => {
    const next = { q, status, sort, page: 1, scope, tags: tagsInput };
    setTags(tagsInput);
    setPage(1);
    syncUrl(next);
  };

  const gotoPage = (p: number) => {
    const nextPage = Math.min(Math.max(p, 1), totalPages);
    setPage(nextPage);
    syncUrl({ q, status, sort, page: nextPage, scope, tags });
  };

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">投票列表</h1>
            <div className="text-sm text-slate-500 mt-1">搜索、筛选并参与投票</div>
          </div>
          <Link href="/create" className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold text-white text-center">
            + 创建投票
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_140px_140px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              applySearch();
            }}
            className="flex gap-3"
          >
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="搜索投票标题/描述"
              className="w-full px-4 py-3 rounded-xl input-field text-slate-800"
            />
            <button type="submit" className="btn-secondary px-4 py-3 rounded-xl text-sm">
              搜索
            </button>
          </form>

          <select
            value={status}
            onChange={(e) => updateStatus(e.target.value as StatusFilter)}
            className="px-4 py-3 rounded-xl input-field text-slate-700 text-sm"
          >
            <option value="all">全部状态</option>
            <option value="ongoing">进行中</option>
            <option value="ended">已结束</option>
          </select>

          <select
            value={sort}
            onChange={(e) => updateSort(e.target.value as SortKey)}
            className="px-4 py-3 rounded-xl input-field text-slate-700 text-sm"
          >
            <option value="new">最新创建</option>
            <option value="hot">最热投票</option>
          </select>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr_120px]">
          <select
            value={scope}
            onChange={(e) => updateScope(e.target.value as ScopeKey)}
            className="px-4 py-3 rounded-xl input-field text-slate-700 text-sm"
          >
            <option value="all">全部投票</option>
            <option value="mine">我创建的</option>
            <option value="voted">我参与的</option>
          </select>

          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="标签筛选（逗号分隔，例如：产品,技术）"
            className="w-full px-4 py-3 rounded-xl input-field text-slate-800"
          />

          <button
            type="button"
            onClick={applyTags}
            className="btn-secondary px-4 py-3 rounded-xl text-sm"
          >
            应用标签
          </button>
        </div>
      </div>

      {(scope === 'mine' || scope === 'voted') && !userId ? (
        <div className="card p-10 text-center">
          <div className="text-3xl mb-3">🔐</div>
          <div className="text-slate-800 font-semibold mb-2">需要登录</div>
          <div className="text-slate-500 text-sm mb-6">查看“我创建的 / 我参与的”需要先登录</div>
          <Link href={`/login?next=${encodeURIComponent('/polls')}`} className="inline-block btn-primary px-8 py-3 rounded-xl text-white font-semibold">
            去登录
          </Link>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-12 h-12 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <div className="text-slate-800 font-semibold mb-2">加载失败</div>
          <div className="text-slate-500 text-sm">{error}</div>
        </div>
      ) : polls.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4 opacity-30">📭</div>
          <div className="text-slate-700 font-semibold mb-2">没有找到投票</div>
          <div className="text-slate-500 text-sm">试试更换关键词或筛选条件</div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {polls.map((poll, i) => (
            <PollCard key={poll.id} poll={poll} index={i} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          共 {total} 条 · 第 {page} / {totalPages} 页
        </div>
        <div className="flex gap-3">
          <button
            className="btn-secondary px-4 py-2 rounded-xl text-sm disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => gotoPage(page - 1)}
          >
            上一页
          </button>
          <button
            className="btn-secondary px-4 py-2 rounded-xl text-sm disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => gotoPage(page + 1)}
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}

function PollCard({ poll, index }: { poll: Poll; index: number }) {
  const isExpired = poll.deadline && new Date(poll.deadline) < new Date();

  const getRelativeTime = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return past.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <Link
      href={`/vote/${poll.id}`}
      className="block card card-hover p-6 animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index, 8) * 0.05}s` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <span className="text-blue-600">🗳️</span>
          </div>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              isExpired ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'
            }`}
          >
            {isExpired ? '已结束' : '进行中'}
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {getRelativeTime(poll.createdAt || new Date().toISOString())}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-slate-800 mb-2 line-clamp-2 leading-snug">
        {poll.title}
      </h3>

      {poll.description && (
        <p className="text-slate-500 text-sm mb-4 line-clamp-2">{poll.description}</p>
      )}

      <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
        <span>共有 {poll.totalVotes} 人参与</span>
        <span>·</span>
        <span>{poll.options.length} 个选项</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="tag">投票</span>
        {poll.multiSelect && (
          <span className="tag bg-blue-50 text-blue-600">多选</span>
        )}
      </div>
    </Link>
  );
}
