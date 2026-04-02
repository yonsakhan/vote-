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
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}
