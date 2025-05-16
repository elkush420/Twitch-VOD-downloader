'use client';

import { Suspense } from 'react';
import { AuthCallbackPageInner } from './pageInner'

export default function AuthCallbackPage() {

  return (
  <Suspense fallback={<p>Loading...</p>}>
    <AuthCallbackPageInner />
  </Suspense>
  );
}
