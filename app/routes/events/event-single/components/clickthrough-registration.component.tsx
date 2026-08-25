import { useState, useMemo, useEffect, useRef } from 'react';
import { useLoaderData, useRouteLoaderData } from 'react-router-dom';
import { InstantSearch, Configure, useHits } from 'react-instantsearch';
import { createSearchClient } from '~/lib/create-search-client';
import Icon from '~/primitives/icon';
import { RockProxyEmbed } from '~/components/rock-embed';
import JourneyFinderSignUpForm, {
  JourneyFinderSignUpSuccessDetails,
} from '~/components/modals/journey-finder-sign-up/journey-finder-sign-up-form.component';
import JourneyFinderSignUpConfirmation from '~/components/modals/journey-finder-sign-up/confirmation.component';
import BaptismSignUpForm, {
  BaptismSignUpSuccessDetails,
} from '~/components/modals/baptism-sign-up/baptism-sign-up-form.component';
import BaptismSignUpConfirmation from '~/components/modals/baptism-sign-up/confirmation.component';
import { EventFinderHit, EventSinglePageType } from '../types';
import { RootLoaderData } from '~/routes/navbar/loader';
import { ClickableCard } from './clickable-card.component';
import { RockCampuses, ROCK_PUBLIC_SITE_ORIGIN } from '~/lib/rock-config';
import {
  getSubGroupTypeDescription,
  getWorkflowTypeGuidForGroupType,
  hasSubGroupTypes,
  isSpanishCampusLabel,
} from '../registration.data';
import { scrollToAnchor } from '~/lib/scroll-to-anchor';
import { useEventSectionScrollOffset } from '../hooks/use-event-section-scroll-offset';
import {
  eventFinderDatesMatch,
  formatEventFinderDateLabel,
  formatEventFinderDatesDisplay,
  joinEventFinderDateLabels,
  normalizeEventFinderDates,
  parseSerializedEventFinderDates,
  serializeEventFinderDates,
} from '../event-finder-dates';
import DreamTeamKickoffForm, {
  DreamTeamKickoffSuccessDetails,
} from '~/routes/dream-team-kickoff/dream-team-kickoff-form.component';
import DreamTeamKickoffConfirmation from '~/routes/dream-team-kickoff/confirmation.component';

interface ClickThroughRegistrationProps {
  title: string;
}

export const ClickThroughRegistration = ({
  title,
}: ClickThroughRegistrationProps) => {
  const { groupType: loaderGroupType } = useLoaderData<EventSinglePageType>();
  const rootData = useRouteLoaderData('root') as RootLoaderData | undefined;
  const algolia = rootData?.algolia ?? {
    ALGOLIA_APP_ID: '',
    ALGOLIA_SEARCH_API_KEY: '',
    indexes: undefined,
  };
  const eventFinderIndexName = algolia.indexes?.eventFinderItems ?? '';

  const extractedGroupType = loaderGroupType ?? '';

  // Normalize groupType to handle variations
  const normalizedGroupType = extractedGroupType
    .replace(/-/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  const hasSubGroups = hasSubGroupTypes(normalizedGroupType);
  const totalSteps = hasSubGroups ? 5 : 4;

  // Map display step to actual step
  // For groupTypes without subGroupTypes: 1->1, 2->3, 3->4, 4->5
  const getActualStep = (displayStep: number): number => {
    if (hasSubGroups) return displayStep;
    if (displayStep === 1) return 1;
    return displayStep + 1;
  };

  // Map actual step to display step
  // For groupTypes without subGroupTypes: 1->1, 3->2, 4->3, 5->4
  const getDisplayStep = (actualStep: number): number => {
    if (hasSubGroups) return actualStep;
    if (actualStep === 1) return 1;
    return actualStep - 1;
  };

  const [hitsReady, setHitsReady] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedCampus, setSelectedCampus] = useState<string>('');
  const [selectedSubGroupType, setSelectedSubGroupType] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [campusSearchQuery, setCampusSearchQuery] = useState<string>('');
  const [pendingRegisterScroll, setPendingRegisterScroll] = useState(false);
  const previousStepRef = useRef<number>(1);
  const getScrollOffset = useEventSectionScrollOffset();

  const resetRegistrationFlow = () => {
    setStep(1);
    setSelectedCampus('');
    setSelectedSubGroupType('');
    setSelectedDate('');
    setSelectedDay('');
    setSelectedTime('');
    setCampusSearchQuery('');
    previousStepRef.current = 1;
    setPendingRegisterScroll(true);
  };

  useEffect(() => {
    if (!pendingRegisterScroll) return;

    setPendingRegisterScroll(false);
    requestAnimationFrame(() => {
      scrollToAnchor('register', { offset: getScrollOffset() });
    });
  }, [pendingRegisterScroll, getScrollOffset]);

  const searchClient = useMemo(
    () =>
      createSearchClient(
        algolia.ALGOLIA_APP_ID || '',
        algolia.ALGOLIA_SEARCH_API_KEY || '',
      ),
    [algolia.ALGOLIA_APP_ID, algolia.ALGOLIA_SEARCH_API_KEY],
  );

  const handleBack = () => {
    if (step > 1) {
      previousStepRef.current = step;
      // Clear selections when going back based on current step
      if (step === 5) {
        setSelectedTime('');
      } else if (step === 4) {
        setSelectedDate('');
        setSelectedDay('');
      } else if (step === 3) {
        if (hasSubGroups) {
          setSelectedSubGroupType('');
        } else {
          setSelectedDate('');
          setSelectedDay('');
        }
      } else if (step === 2) {
        if (hasSubGroups) {
          setSelectedCampus('');
        } else {
          setSelectedCampus('');
        }
      }
      setStep(step - 1);
    }
  };

  const navigateToStep = (targetDisplayStep: number) => {
    previousStepRef.current = step;
    const targetActualStep = getActualStep(targetDisplayStep);
    // Clear selections for steps after the target step
    if (targetActualStep < 5) {
      setSelectedTime('');
    }
    if (targetActualStep < 4) {
      setSelectedDate('');
      setSelectedDay('');
    }
    if (targetActualStep < 3) {
      setSelectedSubGroupType('');
    }
    if (targetActualStep < 2) {
      setSelectedCampus('');
    }
    setStep(targetActualStep);
  };

  const getStepsData = () => {
    if (hasSubGroups) {
      return [
        { step: 1, title: 'Choose Your Campus' },
        { step: 2, title: 'Select the Event Type' },
        { step: 3, title: 'Select the Date' },
        { step: 4, title: 'Pick Your Time' },
        { step: 5, title: 'Personal Information' },
      ];
    }
    return [
      { step: 1, title: 'Choose Your Campus' },
      { step: 2, title: 'Select the Date' },
      { step: 3, title: 'Pick Your Time' },
      { step: 4, title: 'Personal Information' },
    ];
  };

  const getCurrentStepData = () => {
    const displayStep = getDisplayStep(step);
    const stepsData = getStepsData();
    return stepsData.find((data) => data.step === displayStep) || stepsData[0];
  };

  const buildFilter = () => {
    if (!normalizedGroupType) return '';
    let filter = `groupType:"${normalizedGroupType}"`;
    if (selectedCampus) {
      filter += ` AND campus.name:"${selectedCampus.trim()}"`;
    }
    if (selectedSubGroupType && hasSubGroups) {
      filter += ` AND subGroupType:"${selectedSubGroupType.trim()}"`;
    }
    if (selectedDate) {
      const trimmedDates = parseSerializedEventFinderDates(selectedDate);
      trimmedDates.forEach((date) => {
        filter += ` AND date:"${date}"`;
      });
    }
    return filter;
  };

  return (
    <>
      {!hitsReady && <RegistrationSkeleton totalSteps={totalSteps} />}
      <InstantSearch
        indexName={eventFinderIndexName}
        searchClient={searchClient}
        future={{
          preserveSharedStateOnUnmount: true,
        }}
      >
        {/* Campus search (step 1) is filtered client-side in CampusStep, not via
            Algolia `query` — sending campusSearchQuery to Algolia could narrow
            `items` to zero hits, which unmounts CampusStep's search input below
            (see the 0-hits guard in StepContent) and strands the user with no
            way to edit/clear their search. */}
        <Configure filters={buildFilter()} hitsPerPage={1000} />

        <HitsDetector onReady={() => setHitsReady(true)} />
        {hitsReady && (
          <section className='flex items-center w-full py-8 md:py-16 content-padding bg-gray'>
            <div className='w-full max-w-3xl flex flex-col gap-13 mx-auto'>
              <div className='flex flex-col gap-4'>
                <h2 className='font-extrabold text-center text-black text-[32px]'>
                  Register for {title}
                </h2>
                <p className='text-center text-[#717182] text-lg font-medium md:mx-4'>
                  Ready to take the next step? Complete our {totalSteps}-step
                  registration process to secure your spot.
                </p>
              </div>

              <div className='flex flex-col gap-3'>
                {/* Top */}
                <div className='flex flex-col gap-2 items-center'>
                  <div className='flex gap-4 items-center'>
                    {step > 1 && (
                      <div
                        className='flex items-center cursor-pointer'
                        onClick={handleBack}
                      >
                        <Icon
                          name='chevronLeft'
                          size={16}
                          className='text-black'
                        />
                        <p className='text-xs font-semibold text-[#616161]'>
                          Back
                        </p>
                      </div>
                    )}
                    <h3 className='text-xl font-bold text-black'>
                      {getCurrentStepData().title}
                    </h3>
                  </div>

                  <div className='flex gap-2 items-center'>
                    {Array.from({ length: totalSteps }, (_, i) => i + 1).map(
                      (dotStep) => {
                        const displayStep = getDisplayStep(step);
                        return (
                          <div
                            key={dotStep}
                            className={`${
                              dotStep <= displayStep
                                ? 'bg-ocean'
                                : 'bg-[#AEAEAE]'
                            } size-[10px] rounded-full`}
                          />
                        );
                      },
                    )}
                  </div>

                  <p className='text-black font-semibold text-sm mb-4'>
                    Step {getDisplayStep(step)} of {totalSteps}
                  </p>
                </div>

                {/* Selected Bar - shows previous selections */}
                {(selectedCampus ||
                  selectedSubGroupType ||
                  selectedDate ||
                  selectedTime) && (
                  <div className='flex gap-4 items-center justify-center flex-wrap mb-4'>
                    {selectedCampus && (
                      <SelectedBar
                        icon='map'
                        text={selectedCampus}
                        onClick={() => navigateToStep(1)}
                      />
                    )}
                    {selectedSubGroupType && hasSubGroups && (
                      <SelectedBar
                        icon='group'
                        text={selectedSubGroupType}
                        onClick={() => navigateToStep(2)}
                      />
                    )}
                    {selectedDate && (
                      <SelectedBar
                        icon='calendarAlt'
                        text={formatEventFinderDatesDisplay(
                          parseSerializedEventFinderDates(selectedDate),
                          selectedDay,
                        )}
                        onClick={() => navigateToStep(hasSubGroups ? 3 : 2)}
                      />
                    )}
                    {selectedTime && (
                      <SelectedBar
                        icon='timeFive'
                        text={`${selectedTime} ET`}
                        onClick={() => navigateToStep(hasSubGroups ? 4 : 3)}
                      />
                    )}
                  </div>
                )}

                {/* Step Content */}
                <StepContent
                  step={step}
                  selectedCampus={selectedCampus}
                  selectedSubGroupType={selectedSubGroupType}
                  selectedDate={selectedDate}
                  selectedDay={selectedDay}
                  selectedTime={selectedTime}
                  campusSearchQuery={campusSearchQuery}
                  groupType={extractedGroupType}
                  onCampusSelect={(campus) => {
                    setSelectedCampus(campus);
                    previousStepRef.current = 1;
                    setStep(hasSubGroups ? 2 : 3);
                    setPendingRegisterScroll(true);
                  }}
                  onSubGroupTypeSelect={(subGroupType) => {
                    setSelectedSubGroupType(subGroupType);
                    previousStepRef.current = 2;
                    setStep(3);
                  }}
                  onDateSelect={(date, day) => {
                    setSelectedDate(date);
                    setSelectedDay(day);
                    previousStepRef.current = hasSubGroups ? 3 : 3;
                    setStep(4);
                  }}
                  onTimeSelect={(time) => {
                    setSelectedTime(time);
                    previousStepRef.current = hasSubGroups ? 4 : 3;
                    setStep(5);
                  }}
                  hasSubGroups={hasSubGroups}
                  onCampusSearchChange={setCampusSearchQuery}
                  onResetRegistration={resetRegistrationFlow}
                />
              </div>
            </div>
          </section>
        )}
      </InstantSearch>
    </>
  );
};

// SelectedBar Component
const SelectedBar = ({
  icon,
  text,
  onClick,
}: {
  icon: 'map' | 'group' | 'calendarAlt' | 'timeFive';
  text: string;
  onClick?: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className={`flex gap-2 items-center bg-white rounded-lg border border-neutral-lighter px-3 py-1 ${
        onClick ? 'cursor-pointer hover:border-ocean transition-colors' : ''
      }`}
    >
      <Icon name={icon} size={16} className='text-black' />
      <p className='text-sm text-black font-medium'>{text}</p>
    </div>
  );
};

// Step Content Component
interface StepContentProps {
  step: number;
  selectedCampus: string;
  selectedSubGroupType: string;
  selectedDate: string;
  selectedDay: string;
  selectedTime: string;
  campusSearchQuery: string;
  groupType: string;
  hasSubGroups: boolean;
  onCampusSelect: (campus: string) => void;
  onSubGroupTypeSelect: (subGroupType: string) => void;
  onDateSelect: (date: string, day: string) => void;
  onTimeSelect: (time: string) => void;
  onCampusSearchChange: (query: string) => void;
  onResetRegistration: () => void;
}

const StepContent = ({
  step,
  selectedCampus,
  selectedSubGroupType,
  selectedDate,
  selectedDay,
  selectedTime,
  campusSearchQuery,
  groupType,
  hasSubGroups,
  onCampusSelect,
  onSubGroupTypeSelect,
  onDateSelect,
  onTimeSelect,
  onCampusSearchChange,
  onResetRegistration,
}: StepContentProps) => {
  const { items } = useHits<EventFinderHit>();

  // Handle case where no hits are available
  if (items.length === 0 && step !== 5) {
    return (
      <div className='w-full p-8 text-center'>
        <p className='text-gray-600'>
          No events found. Please check your selections and try again.
        </p>
      </div>
    );
  }

  if (step === 1) {
    return (
      <CampusStep
        hits={items}
        onSelect={onCampusSelect}
        searchQuery={campusSearchQuery}
        onSearchChange={onCampusSearchChange}
      />
    );
  }

  if (step === 2 && hasSubGroups) {
    return (
      <SubGroupTypeStep
        hits={items}
        selectedCampus={selectedCampus}
        groupType={groupType}
        onSelect={onSubGroupTypeSelect}
      />
    );
  }

  if (step === 3 || (step === 2 && !hasSubGroups)) {
    return (
      <DateStep
        hits={items}
        selectedCampus={selectedCampus}
        selectedSubGroupType={selectedSubGroupType}
        hasSubGroups={hasSubGroups}
        onSelect={onDateSelect}
      />
    );
  }

  if (step === 4) {
    return (
      <TimeStep
        hits={items}
        selectedCampus={selectedCampus}
        selectedSubGroupType={selectedSubGroupType}
        selectedDate={selectedDate}
        hasSubGroups={hasSubGroups}
        onSelect={onTimeSelect}
      />
    );
  }

  if (step === 5) {
    const matchingHit = items.find((hit) => {
      const campusMatch =
        hit.campus &&
        hit.campus.name &&
        hit.campus.name === selectedCampus &&
        hit.time === selectedTime &&
        eventFinderDatesMatch(hit.date, selectedDate);
      if (hasSubGroups) {
        return campusMatch && hit.subGroupType === selectedSubGroupType;
      }
      return campusMatch;
    });
    return (
      <FormStep
        groupGuid={matchingHit?.groupGuid || ''}
        groupType={groupType}
        selectedCampus={selectedCampus}
        selectedDate={selectedDate}
        selectedDay={selectedDay}
        selectedTime={selectedTime}
        onResetRegistration={onResetRegistration}
      />
    );
  }

  return null;
};

// Campus Step Component
interface CampusStepProps {
  hits: EventFinderHit[];
  onSelect: (campus: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const CampusStep = ({
  hits,
  onSelect,
  searchQuery,
  onSearchChange,
}: CampusStepProps) => {
  // Get unique campuses
  const uniqueCampuses = useMemo(() => {
    const campusMap = new Map<
      string,
      { name: string; location?: string; city?: string }
    >();
    hits
      .filter((hit) => hit.campus && hit.campus.name)
      .forEach((hit) => {
        if (!campusMap.has(hit.campus.name)) {
          campusMap.set(hit.campus.name, {
            name: hit.campus.name,
            location: hit.campus.street1 || undefined, //matching design format for now
            city: hit.campus.city || undefined,
          });
        }
      });

    // Sort campuses based on the order in RockCampuses
    const campuses = Array.from(campusMap.values());
    const campusOrderMap = new Map<string, number>(
      RockCampuses.map((campus, index) => [campus.name, index]),
    );

    return campuses.sort((a, b) => {
      const orderA = campusOrderMap.get(a.name) ?? Infinity;
      const orderB = campusOrderMap.get(b.name) ?? Infinity;
      return orderA - orderB;
    });
  }, [hits]);

  // Filter campuses by search query
  const filteredCampuses = useMemo(() => {
    if (!searchQuery) return uniqueCampuses;
    const query = searchQuery.toLowerCase();
    return uniqueCampuses.filter(
      (campus) =>
        campus.name.toLowerCase().includes(query) ||
        campus.location?.toLowerCase().includes(query) ||
        campus.city?.toLowerCase().includes(query),
    );
  }, [uniqueCampuses, searchQuery]);

  return (
    <div className='flex flex-col gap-4'>
      {/* Search Input */}
      <div className='relative w-full max-w-[400px] mx-auto mb-4'>
        <Icon
          name='search'
          size={18}
          className='absolute left-3 top-[45%] -translate-y-1/2 text-black'
        />
        <input
          type='text'
          placeholder='Search campuses by name or city...'
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className='w-full pl-10 pr-4 py-2 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-ocean'
        />
      </div>

      {/* Campus Cards */}
      {filteredCampuses.length === 0 ? (
        <p className='text-gray-600 text-center p-8'>
          No campuses match your search. Try a different name or city.
        </p>
      ) : (
        <div className='flex flex-wrap justify-center gap-4'>
          {filteredCampuses.map((campus) => (
            <ClickableCard
              step={1}
              key={campus.name}
              variant='campus'
              icon='map'
              title={campus.name}
              subtitle={campus.location || ''}
              onClick={() => onSelect(campus.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// SubGroupType Step Component
interface SubGroupTypeStepProps {
  hits: EventFinderHit[];
  selectedCampus: string;
  groupType: string;
  onSelect: (subGroupType: string) => void;
}

const getEventTypeButtonText = (groupType: string, isSpanish: boolean) =>
  isSpanish
    ? `Seleccionar evento de ${groupType}`
    : `Select ${groupType} Event`;

const SubGroupTypeStep = ({
  hits,
  selectedCampus,
  groupType,
  onSelect,
}: SubGroupTypeStepProps) => {
  // Get unique subGroupTypes for selected campus
  const uniqueSubGroupTypes = useMemo(() => {
    const subGroupTypeMap = new Map<string, string>();
    hits
      .filter(
        (hit) =>
          hit.campus &&
          hit.campus.name &&
          hit.campus.name.trim() === selectedCampus.trim(),
      )
      .forEach((hit) => {
        if (hit.subGroupType && !subGroupTypeMap.has(hit.subGroupType)) {
          subGroupTypeMap.set(hit.subGroupType, hit.subGroupType);
        }
      });
    return Array.from(subGroupTypeMap.values()).sort();
  }, [hits, selectedCampus]);

  const isSpanish = isSpanishCampusLabel(selectedCampus);

  if (uniqueSubGroupTypes.length === 0) {
    return (
      <div className='w-full p-8 text-center'>
        <p className='text-gray-600'>
          No event types available for the selected campus. Please go back and
          select a different campus.
        </p>
      </div>
    );
  }

  return (
    <div className='flex flex-wrap justify-center gap-4'>
      {uniqueSubGroupTypes.map((subGroupType) => {
        return (
          <ClickableCard
            key={subGroupType}
            variant='eventType'
            icon={'group'}
            title={subGroupType}
            subtitle={groupType}
            description={getSubGroupTypeDescription(subGroupType, isSpanish)}
            buttonText={getEventTypeButtonText(groupType, isSpanish)}
            onClick={() => onSelect(subGroupType)}
          />
        );
      })}
    </div>
  );
};

// Date Step Component
interface DateStepProps {
  hits: EventFinderHit[];
  selectedCampus: string;
  selectedSubGroupType: string;
  hasSubGroups: boolean;
  onSelect: (date: string, day: string) => void;
}

const DateStep = ({
  hits,
  selectedCampus,
  selectedSubGroupType,
  hasSubGroups,
  onSelect,
}: DateStepProps) => {
  const uniqueDates = useMemo(() => {
    const dateMap = new Map<string, { dates: string[]; day: string }>();
    hits
      .filter((hit) => {
        const campusMatch =
          hit.campus &&
          hit.campus.name &&
          hit.campus.name.trim() === selectedCampus.trim();
        if (hasSubGroups) {
          return (
            campusMatch &&
            hit.subGroupType &&
            hit.subGroupType.trim() === selectedSubGroupType.trim()
          );
        }
        return campusMatch;
      })
      .forEach((hit) => {
        const dates = normalizeEventFinderDates(hit.date);
        if (dates.length === 0) return;

        const dateKey = serializeEventFinderDates(dates);
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, {
            dates,
            day: hit.day,
          });
        }
      });
    return Array.from(dateMap.values()).sort((a, b) =>
      a.dates[0].localeCompare(b.dates[0]),
    );
  }, [hits, selectedCampus, selectedSubGroupType, hasSubGroups]);

  return (
    <div className='flex flex-wrap justify-center gap-4'>
      {uniqueDates.map((dateInfo) => {
        const dateKey = serializeEventFinderDates(dateInfo.dates);
        const title = joinEventFinderDateLabels(
          dateInfo.dates.map(formatEventFinderDateLabel),
        );

        return (
          <ClickableCard
            key={dateKey}
            variant='date'
            icon='calendarAlt'
            title={title}
            subtitle={dateInfo.day}
            onClick={() => onSelect(dateKey, dateInfo.day)}
          />
        );
      })}
    </div>
  );
};

// Time Step Component
interface TimeStepProps {
  hits: EventFinderHit[];
  selectedCampus: string;
  selectedSubGroupType: string;
  selectedDate: string;
  hasSubGroups: boolean;
  onSelect: (time: string) => void;
}

const TimeStep = ({
  hits,
  selectedCampus,
  selectedSubGroupType,
  selectedDate,
  hasSubGroups,
  onSelect,
}: TimeStepProps) => {
  // Get unique times for selected campus, subGroupType (if applicable), and date
  const uniqueTimes = useMemo(() => {
    const timeMap = new Map<string, { time: string; groupGuid: string }>();

    // Filter hits that match campus, subGroupType (if applicable), and date exactly
    // Trim values to handle any whitespace issues
    const matchingHits = hits.filter((hit) => {
      const campusMatch =
        hit.campus &&
        hit.campus.name &&
        hit.campus.name.trim() === selectedCampus.trim();
      const dateMatch = eventFinderDatesMatch(hit.date, selectedDate);
      if (hasSubGroups) {
        return (
          campusMatch &&
          dateMatch &&
          hit.subGroupType &&
          hit.subGroupType.trim() === selectedSubGroupType.trim()
        );
      }
      return campusMatch && dateMatch;
    });

    matchingHits.forEach((hit) => {
      if (!timeMap.has(hit.time)) {
        timeMap.set(hit.time, {
          time: hit.time,
          groupGuid: hit.groupGuid,
        });
      }
    });

    return Array.from(timeMap.values());
  }, [hits, selectedCampus, selectedSubGroupType, selectedDate, hasSubGroups]);

  if (uniqueTimes.length === 0) {
    return (
      <div className='w-full p-8 text-center'>
        <p className='text-gray-600'>
          No times available for the selected date. Please go back and select a
          different date.
        </p>
      </div>
    );
  }

  return (
    <div className='flex flex-wrap justify-center gap-4'>
      {uniqueTimes.map((timeInfo) => (
        <ClickableCard
          key={timeInfo.time}
          variant='time'
          icon='timeFive'
          title={timeInfo.time}
          subtitle='Eastern Time'
          onClick={() => onSelect(timeInfo.time)}
        />
      ))}
    </div>
  );
};

// Manual embed height per group type (px). Adjust as needed for each form.
const EMBED_HEIGHT_BY_GROUP_TYPE: Record<string, number> = {
  'Kids Dedication': 890,
  'Kids Starting Line': 890,
  'Kids Worship': 890,
  Baptism: 1440,
  'Dream Team Kickoff': 1000,
};

const DEFAULT_EMBED_HEIGHT = 1000;

/**
 * Fixed height for the confirmation page (after form submit) for non-Kids flows.
 * Kids Dedication / Kids Starting Line keep `formHeight` on confirmation loads.
 */
const CONFIRMATION_EMBED_HEIGHT = 600;

function getEmbedHeightForGroupType(groupType: string): number {
  const normalized = normalizeGroupType(groupType);
  return EMBED_HEIGHT_BY_GROUP_TYPE[normalized] ?? DEFAULT_EMBED_HEIGHT;
}

function normalizeGroupType(groupType: string): string {
  return groupType
    .replace(/-/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getRegistrationFormMode(groupType: string): 'native' | 'embed' {
  return ['Journey', 'Baptism', 'Dream Team Kickoff'].includes(
    normalizeGroupType(groupType),
  )
    ? 'native'
    : 'embed';
}

// Form Step Component
interface FormStepProps {
  groupGuid: string;
  groupType: string;
  selectedCampus: string;
  selectedDate: string;
  selectedDay: string;
  selectedTime: string;
  onResetRegistration: () => void;
}

export const FormStep = ({
  groupGuid,
  groupType,
  selectedCampus,
  selectedDate,
  selectedDay,
  selectedTime,
  onResetRegistration,
}: FormStepProps) => {
  const [isNativeSuccess, setIsNativeSuccess] = useState(false);
  const [nativeSuccessDetails, setNativeSuccessDetails] =
    useState<JourneyFinderSignUpSuccessDetails | null>(null);
  const [baptismSuccessDetails, setBaptismSuccessDetails] =
    useState<BaptismSignUpSuccessDetails | null>(null);
  const [dreamTeamSuccessDetails, setDreamTeamSuccessDetails] =
    useState<DreamTeamKickoffSuccessDetails | null>(null);
  const registrationFormMode = getRegistrationFormMode(groupType);
  const normalizedGroupType = normalizeGroupType(groupType);
  const isSpanish = isSpanishCampusLabel(selectedCampus);

  const workflowTypeGuid = getWorkflowTypeGuidForGroupType(groupType, {
    selectedCampus,
  });

  const isKidsGroupType =
    groupType === 'Kids Dedication' ||
    groupType === 'Kids Starting Line' ||
    groupType === 'Kids Worship';

  const rockEmbedUrl = `${ROCK_PUBLIC_SITE_ORIGIN}/${isKidsGroupType ? 'kids-' : ''}form-embed?WorkflowTypeGuid=${workflowTypeGuid}&Group=${groupGuid}&Embed=true"}`;

  const formHeight = getEmbedHeightForGroupType(groupType);
  const [embedHeight, setEmbedHeight] = useState(formHeight);
  const loadCountRef = useRef(0);

  const handleEmbedLoad = () => {
    loadCountRef.current += 1;
    const isFormLoad = loadCountRef.current % 2 === 1;
    setEmbedHeight(
      isFormLoad || isKidsGroupType ? formHeight : CONFIRMATION_EMBED_HEIGHT,
    );
  };

  if (!groupGuid) {
    return (
      <div className='w-full p-8 text-center'>
        <p className='text-gray-600'>
          Unable to load registration form. Please go back and try again.
        </p>
      </div>
    );
  }

  if (registrationFormMode === 'native') {
    if (normalizedGroupType === 'Baptism') {
      if (isNativeSuccess) {
        return (
          <div className='w-full max-w-[600px] mx-auto'>
            <BaptismSignUpConfirmation
              buttonText='Register someone else'
              details={{
                title: 'Baptism Details',
                campus: selectedCampus,
                date: formatEventFinderDatesDisplay(
                  parseSerializedEventFinderDates(selectedDate),
                  selectedDay,
                ),
                time: `${selectedTime} ET`,
                name:
                  baptismSuccessDetails?.firstName ||
                  baptismSuccessDetails?.lastName
                    ? `${baptismSuccessDetails?.firstName ?? ''} ${
                        baptismSuccessDetails?.lastName ?? ''
                      }`.trim()
                    : 'Baptism Registrant',
              }}
              onContinue={() => {
                setBaptismSuccessDetails(null);
                setIsNativeSuccess(false);
                onResetRegistration();
              }}
            />
          </div>
        );
      }

      return (
        <div className='w-full max-w-[600px] mx-auto rounded-xl border border-neutral-lighter bg-white p-6 shadow-sm md:p-8'>
          <BaptismSignUpForm
            groupGuid={groupGuid}
            isSpanish={isSpanish}
            showHeader={false}
            onSuccess={(details) => {
              setBaptismSuccessDetails(details ?? null);
              setIsNativeSuccess(true);
              requestAnimationFrame(() => {
                scrollToAnchor('register');
              });
            }}
          />
        </div>
      );
    }

    if (normalizedGroupType === 'Dream Team Kickoff') {
      if (isNativeSuccess) {
        return (
          <div className='w-full max-w-[600px] mx-auto'>
            <DreamTeamKickoffConfirmation
              buttonText='Register someone else'
              calendarTitle='Dream Team Kickoff at Christ Fellowship Church'
              details={{
                title: 'Dream Team Kickoff Details',
                campus: selectedCampus,
                date: formatEventFinderDatesDisplay(
                  parseSerializedEventFinderDates(selectedDate),
                  selectedDay,
                ),
                time: `${selectedTime} ET`,
                name:
                  dreamTeamSuccessDetails?.firstName ||
                  dreamTeamSuccessDetails?.lastName
                    ? `${dreamTeamSuccessDetails?.firstName ?? ''} ${
                        dreamTeamSuccessDetails?.lastName ?? ''
                      }`.trim()
                    : 'Dream Team Registrant',
              }}
              onContinue={() => {
                setDreamTeamSuccessDetails(null);
                setIsNativeSuccess(false);
                onResetRegistration();
              }}
            />
          </div>
        );
      }

      return (
        <div className='w-full max-w-[600px] mx-auto'>
          <DreamTeamKickoffForm
            groupGuid={groupGuid}
            onSuccess={(details) => {
              setDreamTeamSuccessDetails(details ?? null);
              setIsNativeSuccess(true);
            }}
          />
        </div>
      );
    }

    if (isNativeSuccess) {
      return (
        <div className='w-full max-w-[600px] mx-auto'>
          <JourneyFinderSignUpConfirmation
            buttonText='Register someone else'
            details={{
              title: 'Journey Details',
              campus: selectedCampus,
              date: formatEventFinderDatesDisplay(
                parseSerializedEventFinderDates(selectedDate),
                selectedDay,
              ),
              time: `${selectedTime} ET`,
              name:
                nativeSuccessDetails?.firstName ||
                nativeSuccessDetails?.lastName
                  ? `${nativeSuccessDetails?.firstName ?? ''} ${
                      nativeSuccessDetails?.lastName ?? ''
                    }`.trim()
                  : 'Journey Registrant',
            }}
            onContinue={() => {
              setNativeSuccessDetails(null);
              setIsNativeSuccess(false);
              onResetRegistration();
            }}
          />
        </div>
      );
    }

    return (
      <div className='w-full max-w-[600px] mx-auto'>
        <JourneyFinderSignUpForm
          groupGuid={groupGuid}
          isSpanish={isSpanish}
          onSuccess={(details) => {
            setNativeSuccessDetails(details ?? null);
            setIsNativeSuccess(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className='w-full max-w-[600px] mx-auto rounded-xl overflow-hidden'>
      <RockProxyEmbed
        url={rockEmbedUrl}
        height={embedHeight}
        showLoading={false}
        useAdvancedProxy={false}
        className='w-full'
        onLoad={handleEmbedLoad}
      />
    </div>
  );
};

// Fires onReady once when Algolia returns its first batch of hits
const HitsDetector = ({ onReady }: { onReady: () => void }) => {
  const { items } = useHits<EventFinderHit>();
  const calledRef = useRef(false);

  useEffect(() => {
    if (items.length > 0 && !calledRef.current) {
      calledRef.current = true;
      onReady();
    }
  }, [items.length, onReady]);

  return null;
};

const RegistrationSkeleton = ({ totalSteps }: { totalSteps: number }) => (
  <section className='flex items-center w-full py-8 md:py-16 content-padding bg-gray'>
    <div className='w-full max-w-3xl flex flex-col gap-13 mx-auto'>
      <div className='flex flex-col gap-4'>
        <div className='h-9 rounded animate-pulse bg-neutral-lighter w-64 mx-auto' />
        <div className='h-5 rounded animate-pulse bg-neutral-lighter w-80 mx-auto' />
      </div>
      <div className='flex flex-col gap-3'>
        <div className='flex flex-col gap-2 items-center'>
          <div className='h-7 rounded animate-pulse bg-neutral-lighter w-48' />
          <div className='flex gap-2 items-center'>
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className='size-[10px] rounded-full bg-neutral-lighter animate-pulse'
              />
            ))}
          </div>
          <div className='h-4 rounded animate-pulse bg-neutral-lighter w-24 mb-4' />
        </div>
        <div className='h-10 rounded-lg animate-pulse bg-neutral-lighter max-w-[400px] mx-auto w-full mb-4' />
        <div className='flex flex-wrap justify-center gap-4'>
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className='rounded-lg animate-pulse bg-neutral-lighter w-full md:w-[calc(33.333%-0.67rem)] md:max-w-[300px] h-[120px]'
            />
          ))}
        </div>
      </div>
    </div>
  </section>
);
