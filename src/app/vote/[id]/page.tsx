'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Poll } from '@/lib/types';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export default function VotePage() {
  const params = useParams();
  const id = params.id as string;

  const [poll, setPoll] = useState<Poll | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const votedPolls = JSON.parse(localStorage.getItem('votedPolls') || '{}');
    if (votedPolls[id]) {
      setVoted(true);
    }

    fetch(`/api/polls/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.poll) {
          setPoll(data.poll);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const toggleOption = (optionId: string) => {
    if (!poll) return;
    if (poll.multiSelect) {
      setSelected((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelected([optionId]);
    }
  };

  const handleVote = async () => {
    if (selected.length === 0) {
      setError('请至少选择一个选项');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      let token: string | undefined;
      try {
        const supabase = getSupabaseBrowser();
        const { data: sessionData } = await supabase.auth.getSession();
        token = sessionData.session?.access_token;
      } catch {}
      const res = await fetch(`/api/polls/${id}/vote`, {
        method: 'POST',
        headers: token
          ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
          : { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIds: selected }),
      });

      const data = await res.json();

      if (res.ok) {
        const votedPolls = JSON.parse(localStorage.getItem('votedPolls') || '{}');
        votedPolls[id] = true;
        localStorage.setItem('votedPolls', JSON.stringify(votedPolls));

        setPoll(data.poll);
        setVoted(true);
      } else {
        setError(data.error || '投票失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-2 text-slate-800">投票不存在</h1>
        <p className="text-slate-500 mb-4">可能已被删除或链接无效</p>
        <Link href="/" className="text-blue-600 hover:underline">返回首页</Link>
      </div>
    );
  }

  const isExpired = poll.deadline && new Date(poll.deadline) < new Date();

  if (voted || isExpired) {
    return <ResultView poll={poll} isExpired={!!isExpired} id={id} />;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6">
        <span>←</span>
        <span>返回首页</span>
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        <div className="card p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <span className="text-xl">🗳️</span>
              </div>
              <span className="text-sm font-medium px-3 py-1 rounded-full bg-blue-50 text-blue-600">
                进行中
              </span>
            </div>
            <span className="text-sm text-slate-400">
              创建于 {new Date(poll.createdAt || Date.now()).toLocaleDateString('zh-CN')}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-3">{poll.title}</h1>
          {poll.description && (
            <p className="text-slate-500 mb-6">{poll.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 mb-6 text-sm text-slate-400">
            {poll.multiSelect && (
              <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                多选
              </span>
            )}
            {poll.deadline && (
              <span>
                截止: {new Date(poll.deadline).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <span>{poll.totalVotes} 人已投票</span>
          </div>

          <div className="space-y-3 mb-6">
            {poll.options.map((option) => (
              <button
                key={option.id}
                onClick={() => toggleOption(option.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  selected.includes(option.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-300 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selected.includes(option.id)
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {selected.includes(option.id) && (
                      <span className="text-white text-xs">✓</span>
                    )}
                  </div>
                  <span className={selected.includes(option.id) ? 'text-blue-700 font-medium' : 'text-slate-700'}>
                    {option.text}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm mb-4">{error}</div>
          )}

          <button
            onClick={handleVote}
            disabled={submitting || selected.length === 0}
            className="w-full py-4 rounded-xl btn-primary text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                提交中...
              </span>
            ) : (
              '提交投票'
            )}
          </button>
        </div>

        <div className="grid gap-4">
          <div className="card p-6">
            <h3 className="font-semibold text-slate-800 mb-4">最近参与者</h3>
            <div className="space-y-3">
              {['张三', '李四', '王五'].map((name, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    ['bg-red-100 text-red-600', 'bg-green-100 text-green-600', 'bg-blue-100 text-blue-600'][i]
                  }`}>
                    {name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-800">{name}</div>
                    <div className="text-xs text-slate-400">{['2分钟前', '15分钟前', '1小时前'][i]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-slate-800 mb-4">相关投票</h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-sm font-medium text-slate-700">你最常用的前端框架？</div>
                <div className="text-xs text-slate-400 mt-1">234 人参与</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-sm font-medium text-slate-700">你最喜欢的代码编辑器？</div>
                <div className="text-xs text-slate-400 mt-1">189 人参与</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultView({ poll, isExpired, id }: { poll: Poll; isExpired: boolean; id: string }) {
  const maxVotes = Math.max(...poll.options.map((o) => o.votes), 1);
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/vote/${id}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    alert('链接已复制！');
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6">
        <span>←</span>
        <span>返回首页</span>
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        <div className="card p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <span className="text-xl">🗳️</span>
              </div>
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                isExpired
                  ? 'bg-slate-100 text-slate-500'
                  : 'bg-blue-50 text-blue-600'
              }`}>
                {isExpired ? '已结束' : '进行中'}
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-2">{poll.title}</h1>
          {poll.description && (
            <p className="text-slate-500 mb-4">{poll.description}</p>
          )}
          <p className="text-sm text-slate-400 mb-6">共 {poll.totalVotes} 人投票</p>

          <div className="space-y-4 mb-6">
            {poll.options
              .sort((a, b) => b.votes - a.votes)
              .map((option) => {
                const pct = poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0;
                const isMax = option.votes === maxVotes && option.votes > 0;

                return (
                  <div key={option.id}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className={isMax ? 'font-semibold text-slate-800' : 'text-slate-600'}>
                        {option.text}
                      </span>
                      <span className="text-slate-500">
                        {option.votes} 票 ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full progress-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={copyLink}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
            >
              复制链接
            </button>
            <Link
              href="/"
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-center"
            >
              返回首页
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="card p-6">
            <h3 className="font-semibold text-slate-800 mb-4">最近参与者</h3>
            <div className="space-y-3">
              {['张三', '李四', '王五'].map((name, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    ['bg-red-100 text-red-600', 'bg-green-100 text-green-600', 'bg-blue-100 text-blue-600'][i]
                  }`}>
                    {name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-800">{name}</div>
                    <div className="text-xs text-slate-400">{['2分钟前', '15分钟前', '1小时前'][i]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-slate-800 mb-4">相关投票</h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-sm font-medium text-slate-700">你最常用的前端框架？</div>
                <div className="text-xs text-slate-400 mt-1">234 人参与</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-sm font-medium text-slate-700">你最喜欢的代码编辑器？</div>
                <div className="text-xs text-slate-400 mt-1">189 人参与</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
