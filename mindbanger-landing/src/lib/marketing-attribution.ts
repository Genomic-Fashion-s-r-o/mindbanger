export const ATTRIBUTION_COOKIE = '__Host-mb-campaign';
export const WITHDRAWAL_COOKIE = '__Host-mb-campaign-withdraw';
export const ATTRIBUTION_VERSION = 'booking-attribution-v1';
export const ATTRIBUTION_DAYS = 30;
export const INTERNAL_MARKETING_EXCLUSIONS = [
  '869e18e7-a80a-4bc6-9c96-79369c1b7dc5',
  '15d8d442-ef7e-4570-afdd-407b7cca73fa',
];
export const campaignSources = { facebook: 'Facebook', instagram: 'Instagram' } as const;
export type BookingSource = { campaign_id: string; ad_name: string; campaign_name: string; source: keyof typeof campaignSources; is_test: boolean };
export function campaignLink(id: string, landing = '/', source: 'facebook'|'instagram'='facebook') { const q=new URLSearchParams({mbc:id,utm_source:source,utm_medium:'paid_social',utm_campaign:'mb_'+id,utm_id:id});return `https://www.mindbanger.com${landing}?${q}`; }
