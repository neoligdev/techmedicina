import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderPage } from '@/components/platform/placeholder-page';
import { pageHead } from '@/features/demo/metadata';
export const Route = createFileRoute('/medico/')({
  head: () => pageHead('Agenda · medico'),
  component: () => <PlaceholderPage title="Agenda" />,
});
