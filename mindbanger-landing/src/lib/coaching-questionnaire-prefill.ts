import type {CardContent} from './coaching-cards-model';

export type QuestionnaireBooking = {
  customer_name?: string | null; email?: string | null; phone?: string | null;
  participant_name?: string | null; participant_age?: number | null;
  starts_at?: string | null; service_name?: string | null;
};

// Only pass an appointment already checked against the authenticated record owner.
// Never infer a child's identity from the person who paid for the appointment.
export function prefillQuestionnaire(content: CardContent, booking: QuestionnaireBooking | null, profileName = '', accountEmail = ''): CardContent {
  const parent = ['guardian', 'parent-intake'].includes(content.formType);
  const teen = ['teen-intake', 'teen-progress'].includes(content.formType);
  const name = teen ? content.childName : booking?.customer_name || profileName;
  const answers = content.questions.map((question, i) => {
    if (content.answerMode === 'acknowledgements' || content.questionLayout[i]?.sensitive) return '';
    if (content.answers[i]?.trim()) return content.answers[i];
    const label = question.trim().toLocaleLowerCase('sk');
    if (content.questionLayout[i]?.kind === 'tel' && !teen) return booking?.phone || '';
    if (/^(tvoje |vaše )?meno( a priezvisko)?$/.test(label)) return name || '';
    if (/^(tvoj |váš |kontaktný )?e-?mail$/.test(label)) return teen ? content.teenEmail : booking?.email || accountEmail;
    if (label.startsWith('dátum stretnutia') && booking?.starts_at && Number.isFinite(Date.parse(booking.starts_at))) {
      return new Intl.DateTimeFormat('sk-SK', {dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Bratislava'}).format(new Date(booking.starts_at));
    }
    // Do not map a product name to a differently worded multiple-choice option.
    if (label === 'vybraná služba' && booking?.service_name && (!content.questionLayout[i]?.options.length || content.questionLayout[i].options.includes(booking.service_name))) return booking.service_name;
    return '';
  });
  return {...content, answers, respondent: content.respondent || name || '',
    respondentEmail: content.respondentEmail || (teen ? content.teenEmail : booking?.email || accountEmail),
    childName: content.childName || (parent ? booking?.participant_name || '' : ''),
    childAge: content.childAge || (parent ? booking?.participant_age || 0 : 0)};
}
