import type {BookingSettings,Service} from '@/lib/booking/model';
import ServiceSalesPage from './ServiceSalesPage';
import TreatmentSupportResearch from './TreatmentSupportResearch';
import TreatmentSupportGuide from './TreatmentSupportGuide';
import TreatmentSupportOffer from './TreatmentSupportOffer';
import TreatmentSupportFaq from './TreatmentSupportFaq';
import TreatmentSupportBenefits from './TreatmentSupportBenefits';
import {treatmentSupportCopy} from './treatment-support-copy';
export {treatmentSupportDescription} from './treatment-support-copy';
export default function TreatmentSupport({service,settings}:{service:Service;settings:BookingSettings}){return <ServiceSalesPage service={service} settings={settings} copy={treatmentSupportCopy} research={<TreatmentSupportResearch locale={settings.locale}/>} guide={<TreatmentSupportGuide locale={settings.locale}/>} guideAfterSituations firstMeeting={<TreatmentSupportOffer settings={settings}/>} faq={<TreatmentSupportFaq settings={settings}/>} benefits={<TreatmentSupportBenefits locale={settings.locale}/>} compactFlow/>;}
