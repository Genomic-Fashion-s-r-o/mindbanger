import ProgramAdmin from '@/components/programs/ProgramAdmin';
export const metadata = { title: 'Online programy | Mindbanger Admin', robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return <ProgramAdmin key={id || 'list'} initialId={id} />;
}
