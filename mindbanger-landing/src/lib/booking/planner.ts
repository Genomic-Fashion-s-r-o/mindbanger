import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => {
  const n = Date.parse(`${s}T12:00:00Z`);
  return Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === s;
}, 'Vyberte platný dátum.');
const cellsSchema = z.array(z.number().int().min(0).max(47)).max(48).refine(a => new Set(a).size === a.length, 'Časy sa nesmú opakovať.');
export const availabilityPlanSchema = z.object({
  id: z.uuid(), from: dateSchema, to: dateSchema,
  week: z.array(z.object({ day: z.number().int().min(0).max(6), cells: cellsSchema })).length(7)
    .refine(a => new Set(a.map(d => d.day)).size === 7, 'Vyplňte celý týždeň.'),
}).refine(p => p.from <= p.to, 'Koniec platnosti musí byť po začiatku.');
export const plannerSchema = z.object({
  plans: z.array(availabilityPlanSchema).max(24),
  exceptions: z.array(z.object({ date: dateSchema, cells: cellsSchema })).max(730),
}).superRefine((p, ctx) => {
  if (new Set(p.plans.map(x => x.id)).size !== p.plans.length || new Set(p.exceptions.map(x => x.date)).size !== p.exceptions.length)
    ctx.addIssue({ code: 'custom', message: 'Rozvrhy a výnimky musia byť jedinečné.' });
  if (p.plans.some((a, i) => p.plans.some((b, j) => j > i && a.from <= b.to && b.from <= a.to)))
    ctx.addIssue({ code: 'custom', message: 'Obdobia týždenných rozvrhov sa nesmú prekrývať.' });
});
export type AvailabilityPlanner = z.infer<typeof plannerSchema>;
export type AvailabilityPlan = z.infer<typeof availabilityPlanSchema>;
export function plannedCells(planner: AvailabilityPlanner, date: string): number[] {
  const exception = planner.exceptions.find(e => e.date === date);
  if (exception) return exception.cells;
  const plan = planner.plans.find(p => p.from <= date && p.to >= date);
  return plan?.week.find(d => d.day === new Date(`${date}T12:00:00Z`).getUTCDay())?.cells || [];
}
export function coversCells(cells: number[], minute: number, duration: number) {
  if (minute < 0 || minute + duration > 1440) return false;
  for (let i = Math.floor(minute / 30); i < Math.ceil((minute + duration) / 30); i++) if (!cells.includes(i)) return false;
  return true;
}
export function cellTime(cell: number) { return `${String(Math.floor(cell / 2)).padStart(2, '0')}:${cell % 2 ? '30' : '00'}`; }
