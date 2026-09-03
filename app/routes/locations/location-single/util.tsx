/** Trinity and Online are led by a single pastor; every other campus is a couple. */
const SINGULAR_CAMPUS_PASTOR_URLS = new Set(['trinity', 'cf-everywhere']);

export const usesSingularCampusPastorLabel = (campusUrl: string | undefined) =>
  campusUrl != null && SINGULAR_CAMPUS_PASTOR_URLS.has(campusUrl);

export const campusPastorRoleLabel = (
  campusUrl: string | undefined,
  isSpanish = false,
) => {
  const isSingular = usesSingularCampusPastorLabel(campusUrl);

  if (isSpanish) {
    return isSingular ? 'Pastor del Campus' : 'Pastores del Campus';
  }

  return isSingular ? 'Campus Pastor' : 'Campus Pastors';
};

export const weekdaySpanishTranslation = (weekDay: string) => {
  switch (weekDay) {
    case 'Monday': {
      return 'Lunes';
    }
    case 'Tuesday': {
      return 'Martes';
    }
    case 'Wednesday': {
      return 'Miércoles';
    }
    case 'Thursday': {
      return 'Jueves';
    }
    case 'Friday': {
      return 'Viernes';
    }
    case 'Saturday': {
      return 'Sábado';
    }
    case 'Sunday': {
      return 'Domingo';
    }
    default: {
      return '';
    }
  }
};
