import { serviceDetails } from '@/lib/service-details';

const photoKeys: Record<string, string> = {'opora-pocas-liecby':'opora-pocas-liecby','vypni-hlavu':'pokojna-mysel','zvladaj-stres':'pokojna-mysel','znovu-si-ver':'zivot-z-ineho-uhla','individualny-coaching':'najdi-svoj-smer','teenager-pod-tlakom':'teen-mind','mentalny-trening':'sila-sustredenia','relaxacia':'hlboka-relaxacia','premiovy-mentalny-koucing':'najdi-svoj-smer'};
export function servicePhoto(id: string) {
  return serviceDetails[photoKeys[id] || 'zivot-z-ineho-uhla'];
}
