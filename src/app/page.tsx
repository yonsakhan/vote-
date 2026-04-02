'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Poll } from '@/lib/types';

export default function HomePage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/polls')
      .then((res) => res.json())
      .then((data) => {
        setPolls(data.polls || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="text-center py-16 animate-fade-in-up">
        <h1 className="text-5xl sm:text-6xl font-bold mb-6 text-slate-800 leading-tight">
          让每一次投票都<span className="gradient-text">简单高效</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10">
          创建实时投票，收集真实反馈，分析数据洞察。适用于团队决策、活动安排、意见收集等多种场景。
        </p>

        {/* Stats */}
        <div className="flex justify-center gap-12 mb-16">
          <div className="text-center">
            <div className="text-4xl font-bold gradient-text mb-2">12,580+</div>
            <div className="text-sm text-slate-500">已创建投票</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold gradient-text mb-2">98,420+</div>
            <div className="text-sm text-slate-500">参与投票人数</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold gradient-text mb-2">99.9%</div>
            <div className="text-sm text-slate-500">服务可用性</div>
          </div>
        </div>
      </div>

      {/* Polls Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-slate-800">热门投票</h2>
          <Link href="/polls" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            查看全部 →
          </Link>
        </div>

        {polls.length === 0 ? (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="text-6xl mb-4 opacity-30">📭</div>
            <p className="text-slate-400 text-lg mb-6">还没有投票</p>
            <Link
              href="/create"
              className="inline-block btn-primary px-8 py-3 rounded-xl text-white font-semibold"
            >
              创建第一个投票
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {polls.map((poll, i) => (
              <PollCard key={poll.id} poll={poll} index={i} />
            ))}
          </div>
        )}
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
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <span className="text-blue-600">🗳️</span>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            isExpired 
              ? 'bg-slate-100 text-slate-500' 
              : 'bg-blue-50 text-blue-600'
          }`}>
            {isExpired ? '已结束' : '进行中'}
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {getRelativeTime(poll.createdAt || new Date().toISOString())}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-slate-800 mb-2 line-clamp-2 leading-snug">
        {poll.title}
      </h3>

      {/* Description */}
      {poll.description && (
        <p className="text-slate-500 text-sm mb-4 line-clamp-2">{poll.description}</p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
        <span>共有 {poll.totalVotes} 人参与</span>
        <span>·</span>
        <span>{poll.options.length} 个选项</span>
      </div>

      {/* Tags */}
      <div className="flex items-center gap-2">
        <span className="tag">投票</span>
        {poll.multiSelect && (
          <span className="tag bg-blue-50 text-blue-600">多选</span>
        )}
      </div>
    </Link>
  );
}
