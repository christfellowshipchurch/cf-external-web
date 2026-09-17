export interface SubGroupTypeDescription {
  description: string;
}

export const subGroupTypeDescriptions: Record<string, SubGroupTypeDescription> =
  {
    Dedication: {
      description: 'This is a description for Dedication', // TBD
    },
    'Starting Line': {
      description: 'This is a description for Starting Line', // TBD
    },
    Indoor: {
      description:
        'Baptism is going public about your faith in Jesus and communicating to the world your heart-felt commitment to following Him. It’s the next step after salvation. There are opportunities for baptism all throughout the year. If you’re ready to get baptized or looking for more information, sign up here and we’ll connect with you!',
    },
    'Two Days': {
      description:
        'The Journey is the starting point to learn about the heartbeat of Christ Fellowship. Join us for a two-week experience in which you will Know God, Grow in your Relationships, Discover your Purpose & partner with us as we Impact the World together.',
    },
    'Two Days with Dream Team Kickoff': {
      description:
        'Join us for a two-session conversation, where you will Know God, Grow in your Relationships, Discover your Purpose & partner together as we Impact the World. Bonus! Session 2 of Journey will include Dream Team Kickoff. Childcare is available through our regularly scheduled CFKids programming',
    },
    'Three Days': {
      description:
        'The Journey is the starting point to learn the heartbeat of Christ Fellowship. Join us for a three-part experience in which you will Know God, Grow in your Relationships, Discover your Purpose, & partner with us as we Impact the World together.',
    },
    'Three Days with Dream Team Kickoff': {
      description:
        'Join us for a 3-Session Conversation where you will Know God, Grow in your Relationships, Discover your Purpose, & partner together as we Impact the World. Bonus: This class will include Dream Team Kickoff! Childcare is available through our regularly scheduled CFKids programming.',
    },
  };

// Spanish descriptions per CFDP-4104. 'Two Days' uses the translation
// provided directly on the ticket; the Dream Team Kickoff variant extends
// it with a translated bonus sentence pending content-team sign-off.
export const spanishSubGroupTypeDescriptions: Record<
  string,
  SubGroupTypeDescription
> = {
  'Two Days': {
    description:
      '¡Journey es el primer paso para conectarte a Christ Fellowship! Es una clase de dos sesiones donde aprenderás sobre la historia y el corazón de nuestra iglesia. Durante esta experiencia, nuestra oración es que conozcas a Dios, crezcas en tu relación personal con Él y con otros para que puedas descubrir tu propósito e impactar al mundo.',
  },
  'Two Days with Dream Team Kickoff': {
    description:
      '¡Journey es el primer paso para conectarte a Christ Fellowship! Es una clase de dos sesiones donde aprenderás sobre la historia y el corazón de nuestra iglesia. Durante esta experiencia, nuestra oración es que conozcas a Dios, crezcas en tu relación personal con Él y con otros para que puedas descubrir tu propósito e impactar al mundo. ¡Bono! La sesión 2 de Journey incluirá Dream Team Kickoff. Hay cuidado de niños disponible a través de nuestra programación regular de CFKids.',
  },
  'Three Days': {
    description:
      '¡Journey es el primer paso para conectarte a Christ Fellowship! Es una clase de tres sesiones donde aprenderás sobre la historia y el corazón de nuestra iglesia. Durante esta experiencia, nuestra oración es que conozcas a Dios, crezcas en tu relación personal con Él y con otros para que puedas descubrir tu propósito e impactar al mundo.',
  },
  'Three Days with Dream Team Kickoff': {
    description:
      '¡Journey es el primer paso para conectarte a Christ Fellowship! Es una clase de tres sesiones donde aprenderás sobre la historia y el corazón de nuestra iglesia. Durante esta experiencia, nuestra oración es que conozcas a Dios, crezcas en tu relación personal con Él y con otros para que puedas descubrir tu propósito e impactar al mundo. ¡Bono! Esta clase incluirá Dream Team Kickoff. Hay cuidado de niños disponible a través de nuestra programación regular de CFKids.',
  },
};

export const getSubGroupTypeDescription = (
  subGroupType: string,
  isSpanish = false,
): string => {
  const descriptions = isSpanish
    ? spanishSubGroupTypeDescriptions
    : subGroupTypeDescriptions;
  return descriptions[subGroupType]?.description || '';
};

// Journey has multiple event types (Two Days, Three Days, …). Baptism currently
// only has "At Campus", so including it here adds a click-through step.
export const GROUP_TYPES_WITH_SUB_GROUP_TYPES = ['Journey'];

export const hasSubGroupTypes = (groupType: string): boolean => {
  const normalized = groupType
    .replace(/-/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  return GROUP_TYPES_WITH_SUB_GROUP_TYPES.includes(normalized);
};

// Make sure these IDs match the workflow type GUIDs in Rock
export const GROUP_TYPE_TO_WORKFLOW_TYPE_GUID: Record<string, string> = {
  // Kids Dedication, Starting Line, & Worship use the same workflow type GUID
  'Kids Dedication': '3165147d-80d3-4750-94ca-9a69285755fc',
  'Kids Starting Line': '3165147d-80d3-4750-94ca-9a69285755fc',
  'Kids Worship': '3165147d-80d3-4750-94ca-9a69285755fc',
  Journey: '9bfec348-46a2-48af-b11a-afc074a92ae8',
  Baptism: '3fd2cf95-7b4c-415e-bc9f-6966331f5fcb',
  'Dream Team Kickoff': '98615e2e-d75a-4a44-91fc-dcf4f468e654',
  /** Rock WorkflowTypeGuids for Spanish Journey & Baptism - no new type needed in Algolia
   * code checks if is spanishCampus and returns this instead of the English type
   */
  'Spanish Journey': '74d0f005-5713-4ef4-bfc7-fdca1bfdeba6',
  'Spanish Baptism': 'e2a3b7c0-812d-40e7-85c9-3e59a46340b2',
};

/** Aligns with location pages: Spanish/Español campuses use Spanish registration workflows. */
export function isSpanishCampusLabel(campusName: string): boolean {
  if (!campusName) {
    return false;
  }
  const lower = campusName.toLowerCase();
  return (
    campusName.includes('Español') ||
    lower.includes('espanol') ||
    lower.includes('spanish')
  );
}

export type WorkflowGuidOptions = {
  /** Campus chosen in step 1 — used to pick Spanish vs English Journey/Baptism embeds */
  selectedCampus?: string;
};

export const getWorkflowTypeGuidForGroupType = (
  groupType: string,
  options?: WorkflowGuidOptions,
): string => {
  if (!groupType) {
    return GROUP_TYPE_TO_WORKFLOW_TYPE_GUID['Kids Dedication']; // Default fallback
  }

  // Normalize group type: handle hyphens, case variations
  // Similar to normalization in event-single-page.tsx
  const normalized = groupType
    .replace(/-/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  const spanishCampus =
    options?.selectedCampus && isSpanishCampusLabel(options.selectedCampus);

  if (spanishCampus && normalized === 'Journey') {
    return GROUP_TYPE_TO_WORKFLOW_TYPE_GUID['Spanish Journey'];
  }
  if (spanishCampus && normalized === 'Baptism') {
    return GROUP_TYPE_TO_WORKFLOW_TYPE_GUID['Spanish Baptism'];
  }

  return (
    GROUP_TYPE_TO_WORKFLOW_TYPE_GUID[normalized] ||
    GROUP_TYPE_TO_WORKFLOW_TYPE_GUID['Kids Dedication']
  );
};
