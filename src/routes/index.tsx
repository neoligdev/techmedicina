import { createFileRoute, redirect } from '@tanstack/react-router';
import { pageHead } from '@/features/demo/metadata';
export const Route = createFileRoute('/')({
  head: () => pageHead('Gestão da plataforma'),
  beforeLoad: () => { throw redirect({ to: '/super-admin', replace: true }); },
});
