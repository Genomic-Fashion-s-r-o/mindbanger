import { notFound } from 'next/navigation';
import { ProgramSales, publicProgramOffer } from '@/components/programs/ProgramSales';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) notFound();
  const offer = await publicProgramOffer(slug);
  if (!offer) notFound();
  return <ProgramSales offer={offer} />;
}
