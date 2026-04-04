'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    // Redirect to vote page (which handles showing results)
    router.replace(`/vote/${id}`);
  }, [id, router]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="loader-ring loader-ring-sm" />
      <h1 className="text-lg font-semibold text-heading">正在跳转结果页</h1>
    </div>
  );
}
