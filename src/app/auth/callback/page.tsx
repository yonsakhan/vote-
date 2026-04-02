'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return '登录失败';
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <div className="w-12 h-12 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin" />
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}

function AuthCallbackInner() {
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
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    if (!supabaseEnabled) return;

    const run = async () => {
      try {
        const supabase = getSupabaseBrowser();

        // 处理 OAuth 回调 (PKCE flow) - code 在 query 参数中
        const code = searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setError(error.message || '登录失败');
            setProcessing(false);
            return;
          }
          router.replace(next);
          return;
        }

        // 处理邮件模板配置错误的情况：confirmation_url 被作为 query 参数传递
        // 例如: /auth/callback?confirmation_url=https://xxx.supabase.co/auth/v1/verify?token=xxx
        const confirmationUrl = searchParams.get('confirmation_url');
        if (confirmationUrl) {
          try {
            const u = new URL(confirmationUrl);

            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const allowedHosts = new Set<string>();
            if (supabaseUrl) {
              try {
                allowedHosts.add(new URL(supabaseUrl).host);
              } catch {}
            }
            allowedHosts.add(window.location.host);

            if (!allowedHosts.has(u.host)) {
              setError('无效的登录跳转地址');
              setProcessing(false);
              return;
            }

            if (u.pathname.includes('/auth/v1/verify') && !u.searchParams.get('type')) {
              u.searchParams.set('type', 'magiclink');
            }

            window.location.href = u.toString();
            return;
          } catch {
            setError('无效的登录跳转地址');
            setProcessing(false);
            return;
          }
        }

        // 处理 Magic Link 回调 - token 在 URL hash 中 (#access_token=...)
        // Supabase 会自动从 hash 中提取 token 并设置 session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          setError(sessionError.message || '登录失败');
          setProcessing(false);
          return;
        }

        if (session) {
          // 成功获取 session，说明 magic link 已处理
          router.replace(next);
          return;
        }

        // 如果没有 code 也没有 session，可能是页面被直接访问
        // 尝试从 URL hash 中手动解析（某些情况下需要）
        const hash = window.location.hash;
        if (hash && hash.includes('access_token=')) {
          // Supabase 客户端应该自动处理 hash 中的 token
          // 等待一下让 supabase 处理
          setTimeout(async () => {
            const { data: { session: retrySession }, error: retryError } = await supabase.auth.getSession();
            if (retryError) {
              setError(retryError.message || '登录失败');
            } else if (retrySession) {
              router.replace(next);
            } else {
              setError('无法获取登录信息，请重新尝试');
            }
            setProcessing(false);
          }, 500);
          return;
        }

        // 既没有 code 也没有 hash，可能是直接访问这个页面
        setError('无效的登录请求');
        setProcessing(false);
      } catch (e: unknown) {
        setError(getErrorMessage(e));
        setProcessing(false);
      }
    };

    run();
  }, [next, router, searchParams, supabaseEnabled]);

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

  if (error) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card p-8 text-center">
          <div className="text-slate-800 font-semibold mb-2">登录失败</div>
          <div className="text-slate-500 text-sm mb-4">{error}</div>
          <button 
            onClick={() => router.push('/login')}
            className="px-4 py-2 rounded-xl btn-primary text-white text-sm"
          >
            返回登录页
          </button>
        </div>
      </div>
    );
  }

  if (processing) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin" />
        <p className="text-slate-500 text-sm">正在处理登录...</p>
      </div>
    );
  }

  return null;
}
