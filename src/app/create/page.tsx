'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export default function CreatePage() {
  const router = useRouter();
  const [supabaseEnabled] = useState(() => {
    try {
      getSupabaseBrowser();
      return true;
    } catch {
      return false;
    }
  });
  const [authChecked, setAuthChecked] = useState(!supabaseEnabled);
  const [authed, setAuthed] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multiSelect, setMultiSelect] = useState(false);
  const [anonymous, setAnonymous] = useState(true);
  const [deadline, setDeadline] = useState('');
  const [deadlineMode, setDeadlineMode] = useState<'none' | '1d' | '7d' | '30d' | 'custom'>('none');
  const [customDeadlineLocal, setCustomDeadlineLocal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const deadlineLabel = useMemo(() => {
    if (!deadline) return '未设置';
    const d = new Date(deadline);
    if (Number.isNaN(d.getTime())) return '未设置';
    return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, [deadline]);

  useEffect(() => {
    if (!supabaseEnabled) return;
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(Boolean(data.session));
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(Boolean(session));
      setAuthChecked(true);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [supabaseEnabled]);

  const addOption = () => setOptions([...options, '']);
  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };
  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const applyDeadlineMode = (mode: 'none' | '1d' | '7d' | '30d' | 'custom') => {
    setDeadlineMode(mode);
    setError('');

    if (mode === 'none') {
      setDeadline('');
      return;
    }

    if (mode === 'custom') {
      if (!customDeadlineLocal) {
        setDeadline('');
        return;
      }
      setDeadline(new Date(customDeadlineLocal).toISOString());
      return;
    }

    const msByMode = {
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    } as const;
    setDeadline(new Date(Date.now() + msByMode[mode]).toISOString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const supabase = getSupabaseBrowser();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      router.push(`/login?next=${encodeURIComponent('/create')}`);
      return;
    }

    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) {
      setError('请至少提供两个选项');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          options: validOptions,
          multiSelect,
          deadline: deadline || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        try {
          const raw = localStorage.getItem('createdPollIds');
          const parsed = raw ? JSON.parse(raw) : [];
          const ids = Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
          ids.unshift(data.poll.id);
          localStorage.setItem('createdPollIds', JSON.stringify(Array.from(new Set(ids))));
        } catch {}
        router.push(`/vote/${data.poll.id}`);
      } else {
        setError(data.error || '创建失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6">
        <span>←</span>
        <span>返回首页</span>
      </Link>

      {!supabaseEnabled ? (
        <div className="card p-10 text-center">
          <div className="text-slate-800 font-semibold mb-2">创建未配置</div>
          <div className="text-slate-500 text-sm">请先配置 Supabase 环境变量并完成数据库迁移</div>
        </div>
      ) : authChecked && !authed ? (
        <div className="card p-10 text-center">
          <div className="text-3xl mb-4">🔐</div>
          <div className="text-slate-800 font-semibold text-lg mb-2">创建投票需要登录</div>
          <div className="text-slate-500 text-sm mb-6">登录后即可创建并在“我的投票”中管理</div>
          <Link href="/login?next=%2Fcreate" className="inline-block btn-primary px-8 py-3 rounded-xl text-white font-semibold">
            去登录
          </Link>
        </div>
      ) : !authChecked ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-12 h-12 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="flex gap-8">
        {/* Main Form */}
        <div className="flex-1">
          <div className="card p-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-8">创建新投票</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">投票标题</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="请输入投票标题"
                  className="w-full px-4 py-3 rounded-xl input-field text-slate-800"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">投票描述</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="请输入投票描述（可选）"
                  className="w-full px-4 py-3 rounded-xl input-field text-slate-800 resize-none"
                />
              </div>

              {/* Options */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">投票选项</label>
                <div className="space-y-3">
                  {options.map((opt, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      <span className="text-sm font-medium text-slate-400 w-6">{i + 1}.</span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(i, e.target.value)}
                        placeholder={`选项 ${i + 1}`}
                        className="flex-1 px-4 py-3 rounded-xl input-field text-slate-800"
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addOption}
                  className="mt-4 w-full py-3 rounded-xl border-2 border-dashed border-blue-200 text-blue-600 font-medium hover:bg-blue-50 transition-colors"
                >
                  + 添加选项
                </button>
              </div>

              {/* Settings */}
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-sm font-medium text-slate-700 mb-4">投票设置</label>
                
                <div className="space-y-4">
                  {/* Multi Select Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                    <span className="text-slate-700">允许多选</span>
                    <button
                      type="button"
                      onClick={() => setMultiSelect(!multiSelect)}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        multiSelect ? 'gradient-bg' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all ${
                          multiSelect ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Anonymous Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                    <span className="text-slate-700">匿名投票</span>
                    <button
                      type="button"
                      onClick={() => setAnonymous(!anonymous)}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        anonymous ? 'gradient-bg' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all ${
                          anonymous ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Deadline */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                    <span className="text-slate-700">截止时间</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-500">{deadlineLabel}</span>
                      <select
                        value={deadlineMode}
                        onChange={(e) => applyDeadlineMode(e.target.value as typeof deadlineMode)}
                        className="px-3 py-2 rounded-lg input-field text-slate-700 text-sm"
                      >
                        <option value="none">不设置</option>
                        <option value="1d">1天后</option>
                        <option value="7d">7天后</option>
                        <option value="30d">30天后</option>
                        <option value="custom">自定义</option>
                      </select>
                    </div>
                  </div>

                  {deadlineMode === 'custom' && (
                    <div className="p-4 rounded-xl bg-slate-50">
                      <label className="block text-sm font-medium text-slate-700 mb-2">自定义截止时间</label>
                      <input
                        type="datetime-local"
                        value={customDeadlineLocal}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCustomDeadlineLocal(v);
                          setDeadline(v ? new Date(v).toISOString() : '');
                        }}
                        className="w-full px-4 py-3 rounded-xl input-field text-slate-800"
                      />
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>
              )}

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <Link
                  href="/"
                  className="px-8 py-3 rounded-xl btn-secondary text-center"
                >
                  取消
                </Link>
                <button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="flex-1 py-3 rounded-xl btn-primary text-white font-semibold disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      创建中...
                    </span>
                  ) : (
                    '创建投票'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Tips Sidebar */}
        <div className="w-80">
          <div className="card p-6 sticky top-24">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">💡 创建建议</h3>
            <div className="space-y-4">
              <div>
                <div className="font-medium text-slate-700 mb-1">1. 标题要简洁明了</div>
                <p className="text-sm text-slate-500">让参与者一眼就能明白投票的主题</p>
              </div>
              <div>
                <div className="font-medium text-slate-700 mb-1">2. 选项要全面且互斥</div>
                <p className="text-sm text-slate-500">确保选项覆盖主要可能性且不重叠</p>
              </div>
              <div>
                <div className="font-medium text-slate-700 mb-1">3. 设置合理的截止时间</div>
                <p className="text-sm text-slate-500">给参与者充足的时间进行投票</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
