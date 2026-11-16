import { Suspense } from 'react';
import { Batches } from '@/features/pharmacy/batches';

export default function BatchesPage() {
  // `Batches` reads `?productId=` from the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <Batches />
    </Suspense>
  );
}
