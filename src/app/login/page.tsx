'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

type LoginMethod = 'email' | 'phone';

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return '发送失败';
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <div className="w-12 h-12 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin" />
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/polls';

  const [supabaseEnabled] = useState(() => {
    try {
      getSupabaseBrowser();
      return true;
    } catch {
      return false;
    }
  });

  // 登录方式切换
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');

  // 邮箱登录状态
  const [email, setEmail] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // 手机号登录状态
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSending, setCodeSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verifying, setVerifying] = useState(false);

  // 错误信息
  const [error, setError] = useState('');

  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (!supabaseEnabled) return;
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(next);
    });
  }, [next, router, supabaseEnabled]);

  // 格式化手机号（添加+86前缀）
  const formatPhone = useCallback((phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      return `+86${cleaned}`;
    }
    return cleaned;
  }, []);

  // 验证手机号格式
  const isValidPhone = useCallback((phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    return /^1[3-9]\d{9}$/.test(cleaned);
  }, []);

  // 发送邮箱验证码
  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailSent(false);
    const value = email.trim().toLowerCase();
    if (!value) return;
    setEmailSending(true);
    try {
      const supabase = getSupabaseBrowser();
      const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error: err } = await supabase.auth.signInWithOtp({
        email: value,
        options: { emailRedirectTo },
      });
      if (err) {
        setError(err.message || '发送失败');
        return;
      }
      setEmailSent(true);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setEmailSending(false);
    }
  };

  // 发送手机验证码
  const sendPhoneCode = async () => {
    setError('');
    setCodeSent(false);

    if (!isValidPhone(phone)) {
      setError('请输入正确的手机号码');
      return;
    }

    setCodeSending(true);
    try {
      const supabase = getSupabaseBrowser();
      const formattedPhone = formatPhone(phone);
      const { error: err } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });
      if (err) {
        setError(err.message || '验证码发送失败');
        return;
      }
      setCodeSent(true);
      setCountdown(60); // 60秒倒计时
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setCodeSending(false);
    }
  };

  // 验证手机验证码
  const verifyPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidPhone(phone)) {
      setError('请输入正确的手机号码');
      return;
    }

    if (code.length !== 6) {
      setError('请输入6位验证码');
      return;
    }

    setVerifying(true);
    try {
      const supabase = getSupabaseBrowser();
      const formattedPhone = formatPhone(phone);
      const { error: err } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: code,
        type: 'sms',
      });
      if (err) {
        setError(err.message || '验证码错误');
        return;
      }
      // 登录成功，跳转
      router.replace(next);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setVerifying(false);
    }
  };

  if (!supabaseEnabled) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card p-8 text-center">
          <div className="text-slate-800 font-semibold mb-2">登录未配置</div>
          <div className="text-slate-500 text-sm">请先配置 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY（或 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY）</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6">
        <span>←</span>
        <span>返回首页</span>
      </Link>

      <div className="card p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">登录</h1>
        <p className="text-slate-500 text-sm mb-6">选择登录方式，快速进入投票系统。</p>

        {/* 登录方式切换 */}
        <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setLoginMethod('phone');
              setError('');
            }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              loginMethod === 'phone'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            手机号登录
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMethod('email');
              setError('');
            }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              loginMethod === 'email'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            邮箱登录
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>
        )}

        {/* 手机号登录表单 */}
        {loginMethod === 'phone' && (
          <form onSubmit={verifyPhoneCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">手机号码</label>
              <div className="flex gap-2">
                <span className="flex items-center px-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-sm">
                  +86
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="13800138000"
                  maxLength={11}
                  className="flex-1 px-4 py-3 rounded-xl input-field text-slate-800"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">验证码</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6位验证码"
                  maxLength={6}
                  className="flex-1 px-4 py-3 rounded-xl input-field text-slate-800"
                  required
                />
                <button
                  type="button"
                  onClick={sendPhoneCode}
                  disabled={codeSending || countdown > 0 || !isValidPhone(phone)}
                  className="px-4 py-3 rounded-xl btn-secondary text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {codeSending
                    ? '发送中...'
                    : countdown > 0
                    ? `${countdown}秒后重试`
                    : codeSent
                    ? '重新发送'
                    : '获取验证码'}
                </button>
              </div>
            </div>

            {codeSent && (
              <div className="p-4 rounded-xl bg-blue-50 text-blue-700 text-sm">
                验证码已发送，请注意查收短信
              </div>
            )}

            <button
              type="submit"
              disabled={verifying || code.length !== 6}
              className="w-full py-3 rounded-xl btn-primary text-white font-semibold disabled:opacity-50"
            >
              {verifying ? '登录中...' : '登录'}
            </button>
          </form>
        )}

        {/* 邮箱登录表单 */}
        {loginMethod === 'email' && (
          <form onSubmit={sendMagicLink} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">邮箱地址</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl input-field text-slate-800"
                required
              />
            </div>

            {emailSent && (
              <div className="p-4 rounded-xl bg-blue-50 text-blue-700 text-sm">
                已发送登录链接，请检查邮箱（也可能在垃圾箱）。
              </div>
            )}

            <button
              type="submit"
              disabled={emailSending || !email.trim()}
              className="w-full py-3 rounded-xl btn-primary text-white font-semibold disabled:opacity-50"
            >
              {emailSending ? '发送中...' : '发送登录链接'}
            </button>
          </form>
        )}

        <div className="mt-6 text-xs text-slate-400 leading-relaxed">
          登录后可创建投票；未登录也可以浏览投票列表与参与投票（投票记录仅对已登录用户展示）。
        </div>
      </div>
    </div>
  );
}
