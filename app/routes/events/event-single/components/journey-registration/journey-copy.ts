import type { JourneySessionNumber } from '~/lib/journey-sessions';

/**
 * Journey registration text. Spanish shows once a Spanish campus is chosen.
 * Comms supplied the step 2 headings, campus bar, Session 1 description, Clear
 * selection, the "remaining sessions later" line and the Continue button; the
 * rest of the Spanish is a draft for Comms to review.
 */
export const JOURNEY_COPY = {
  English: {
    heading: 'Register for Journey',
    intro: 'Journey includes three sessions. Complete all three in any order.',
    step: (n: number) => `Step ${n} of 3`,
    back: 'Back',
    session: (n: number) => `Session ${n}`,
    sessionDescriptions: {
      1: 'Discover the story behind Christ Fellowship and what it means to know God personally.',
      2: 'Find your place in the community and learn how faith grows through meaningful relationships.',
      3: 'Uncover your purpose and explore what it looks like to live on mission every day.',
    } as Record<JourneySessionNumber, string>,
    notScheduled: 'Not scheduled',
    registered: 'Registered',
    // Plan Your Journey
    planHeading: 'Plan Your Journey',
    planIntro:
      'Choose one, two, or all three sessions now. You can schedule the rest later.',
    selectedCampus: 'Selected campus:',
    change: 'Change',
    selectEarliest: 'Select earliest available class',
    noSessionsSelected: 'No sessions selected',
    sessionsSelected: (n: number) => `${n} of 3 sessions selected`,
    selectAtLeastOne: 'Select at least one session to continue.',
    scheduleRemainingLater: 'You can schedule the remaining sessions later.',
    continueToInformation: 'Continue to Your Information',
    registeredForSession: "You're registered for this session.",
    noUpcomingTimes: 'No upcoming times at this campus. Try another campus.',
    passed: 'Passed',
    full: 'Full',
    sameDay: 'Same Day',
    sameDayAs: (n: number) => `Same day as Session ${n}`,
    clearSelection: 'Clear selection',
    // Your Information
    informationHeading: 'Your Information',
    completeRegistration: 'Complete Registration',
    yourSessions: 'Your Sessions',
    editSessions: 'Edit Sessions',
    sessionsScheduled: (n: number) => `${n} of 3 sessions scheduled.`,
    // Confirmation
    confirmationHeading: "You're Registered",
    confirmationIntro:
      "We'll email your confirmation and send reminders before each scheduled session.",
    registeredSessions: 'Registered Sessions',
    getDirections: 'Get Directions',
    addToCalendar: 'Add to Calendar',
    calendarTitle: (n: number) => `CF Journey Session ${n}`,
    scheduledOfThree: (n: number) =>
      `You've scheduled ${n} of 3 Journey sessions. You can schedule the remaining sessions now or return later.`,
    scheduleAnother: 'Schedule Another Session',
    registerSomeoneElse: 'Register Someone Else',
  },
  Spanish: {
    heading: 'Inscríbete en Journey',
    intro:
      'Journey incluye tres sesiones. Completa las tres en el orden que prefieras.',
    step: (n: number) => `Paso ${n} de 3`,
    back: 'Atrás',
    session: (n: number) => `Sesión ${n}`,
    sessionDescriptions: {
      1: 'Descubre la historia detrás de Christ Fellowship y qué significa conocer a Dios personalmente.',
      2: 'Encuentra tu lugar en la comunidad y descubre cómo la fe crece a través de relaciones significativas.',
      3: 'Descubre tu propósito y explora cómo es vivir en misión cada día.',
    } as Record<JourneySessionNumber, string>,
    notScheduled: 'Sin programar',
    registered: 'Confirmada',
    planHeading: 'Planifica tu Journey',
    planIntro:
      'Elige una, dos o las tres sesiones ahora. Puedes programar las demás más adelante.',
    selectedCampus: 'Campus seleccionado:',
    change: 'Cambiar',
    selectEarliest: 'Seleccionar la clase disponible más próxima',
    noSessionsSelected: 'Ninguna sesión seleccionada',
    sessionsSelected: (n: number) => `${n} de 3 sesiones seleccionadas`,
    selectAtLeastOne: 'Selecciona al menos una sesión para continuar.',
    scheduleRemainingLater:
      'Puedes seleccionar las otras sesiones más adelante.',
    continueToInformation: 'Continúa con Tu Información',
    registeredForSession: 'Tu lugar en esta sesión está confirmado.',
    noUpcomingTimes:
      'No hay horarios próximos en este campus. Prueba con otro campus.',
    passed: 'Ya pasó',
    full: 'Lleno',
    sameDay: 'Mismo día',
    sameDayAs: (n: number) => `Mismo día que la Sesión ${n}`,
    clearSelection: 'Quitar Selección',
    informationHeading: 'Tu Información',
    completeRegistration: 'Completar Inscripción',
    yourSessions: 'Tus Sesiones',
    editSessions: 'Editar Sesiones',
    sessionsScheduled: (n: number) => `${n} de 3 sesiones programadas.`,
    confirmationHeading: 'Inscripción Confirmada',
    confirmationIntro:
      'Te enviaremos la confirmación por correo electrónico y recordatorios antes de cada sesión programada.',
    registeredSessions: 'Sesiones Confirmadas',
    getDirections: 'Cómo Llegar',
    addToCalendar: 'Agregar al Calendario',
    calendarTitle: (n: number) => `CF Journey Sesión ${n}`,
    scheduledOfThree: (n: number) =>
      `Programaste ${n} de 3 sesiones de Journey. Puedes programar las demás ahora o regresar más adelante.`,
    scheduleAnother: 'Programar Otra Sesión',
    registerSomeoneElse: 'Inscribir a Otra Persona',
  },
};

export type JourneyCopy = (typeof JOURNEY_COPY)['English'];

/**
 * Spanish for the errors `api.journey-sign-up` returns, keyed by its English
 * text. Matched here rather than changed in the action, which launches the
 * Rock workflow. A message not listed falls back to the generic one.
 */
const SPANISH_SIGN_UP_ERRORS: [RegExp, (n: string) => string][] = [
  [/^Missing required fields$/, () => 'Faltan campos obligatorios.'],
  [
    /^Please select at least one session\.$/,
    () => 'Selecciona al menos una sesión.',
  ],
  [
    /^Session (\d) is no longer available\. Please choose another time\.$/,
    (n) =>
      `La Sesión ${n} ya no está disponible. Por favor, elige otro horario.`,
  ],
  [
    /^Session (\d) is full\. Please choose another time\.$/,
    (n) => `La Sesión ${n} está llena. Por favor, elige otro horario.`,
  ],
  [
    /^Please choose all sessions at the same campus\.$/,
    () => 'Por favor, elige todas las sesiones en el mismo campus.',
  ],
  [
    /^Please enter a valid number of children\.$/,
    () => 'Por favor, ingresa un número válido de niños.',
  ],
];
const SPANISH_GENERIC_ERROR = 'Algo salió mal. Por favor, inténtalo de nuevo.';

export const translateSignUpError = (message: string, isSpanish: boolean) => {
  if (!isSpanish) return message;
  for (const [pattern, toSpanish] of SPANISH_SIGN_UP_ERRORS) {
    const match = pattern.exec(message);
    if (match) return toSpanish(match[1] ?? '');
  }
  return SPANISH_GENERIC_ERROR;
};

export const getJourneyCopy = (isSpanish: boolean): JourneyCopy =>
  JOURNEY_COPY[isSpanish ? 'Spanish' : 'English'];
