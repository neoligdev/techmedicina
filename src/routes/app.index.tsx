import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderPage } from '@/components/platform/placeholder-page';
import { pageHead } from '@/features/demo/metadata';
export const Route = createFileRoute('/app/')({
  head: () => pageHead('Meu dia · app'),
  component: () => <PlaceholderPage title="Meu dia" />,
});
