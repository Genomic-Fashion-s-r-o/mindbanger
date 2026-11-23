import type { Metadata } from 'next';
import { serviceSalesCopy } from '@/components/personal/service-sales-copy';

export function addServiceSharePreview(metadata: Metadata, id: string): Metadata {
  const copy = id in serviceSalesCopy ? serviceSalesCopy[id as keyof typeof serviceSalesCopy] : null;
  const image = id === 'znovu-si-ver'
    ? { name: 'rozhovor-podpora', alt: 'Dve kreslá v svetlom, pokojnom priestore na rozhovor' }
    : id === 'teenager-pod-tlakom'
      ? { name: 'teen', alt: 'Priestor pre podporu tínedžerov – Teenager pod tlakom' }
      : copy ? { name: copy.image, alt: copy.imageAlt } : null;
  if (!image) return metadata;

  const czech=metadata.openGraph?.locale==='cs_CZ';
  const title = id === 'teenager-pod-tlakom'&&!czech
    ? 'Teenager pod tlakom. Priestor pre tvoj vlastný hlas.'
    : metadata.openGraph?.title;
  const description = id === 'teenager-pod-tlakom'&&!czech
    ? 'Online koučing pre tínedžerov: škola, sebavedomie, vzťahy a vlastný ďalší krok. Niekto, kto počúva bez súdenia a poučovania.'
    : metadata.openGraph?.description || metadata.description;
  const previewImage = {
    url: `https://www.mindbanger.com/share/services/${image.name}-v1.jpg`,
    width: 1440,
    height: ['rozhovor-podpora', 'sustredenie-navyky'].includes(image.name) ? 960 : 810,
    type: 'image/jpeg',
    alt: image.alt,
  };
  return {
    ...metadata,
    openGraph: { type: 'website', title: title ?? undefined, description: description ?? undefined, locale: metadata.openGraph?.locale || 'sk_SK', siteName: 'MINDBANGER', url: metadata.openGraph?.url||`/sluzby/${id}`, images: [previewImage] },
    twitter: { card: 'summary_large_image', title: title ?? undefined, description: description ?? undefined, images: [previewImage] },
  };
}
