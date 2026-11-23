import { z } from 'zod';
export const marketingMetricLabels = {
 requests: 'Odoslané žiadosti', confirmed_paid: 'Potvrdené a zaplatené', paying_clients: 'Platiaci klienti',
 net_cents: 'Prijaté úhrady po refundáciách', authorized: 'Iba blokácia na karte', needs_review: 'Platby na kontrolu', refunded: 'Rezervácie s refundáciou',
} as const;
export type MarketingMetric = keyof typeof marketingMetricLabels;
const day = z.iso.date();
export const marketingListQuery = z.object({
 from: day, to: day,
 metric: z.enum(['requests','confirmed_paid','paying_clients','net_cents','authorized','needs_review','refunded']).default('requests'),
 campaign: z.union([z.literal('all'),z.literal('unknown'),z.uuid()]).default('all'),
 offset: z.coerce.number().int().min(0).max(1000000).default(0),
});
export function marketingListHref(from:string,to:string,metric:MarketingMetric,campaign:string='all') {
 return '/mindbanger_daily/admin/marketing/zoznam?'+new URLSearchParams({from,to,metric,campaign});
}
