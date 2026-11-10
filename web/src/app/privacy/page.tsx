import type { Metadata } from 'next';
import { PrivacyView } from '@/components/PrivacyView';

export const metadata: Metadata = {
  title: 'Privacy · Gno Wrapped',
  description: 'What Gno Wrapped knows about you: public chain data only, no cookies or trackers, and what the server logs.',
};

export default function Page() {
  return <PrivacyView />;
}
