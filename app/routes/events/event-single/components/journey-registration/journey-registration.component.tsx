import { useEffect, useRef, useState } from 'react';
import { useFetcher, useSearchParams } from 'react-router';
import {
  JOURNEY_SESSION_NUMBERS,
  findJourneyCampusBySlug,
  pickEarliestAvailable,
  type JourneySessionSelection,
  type JourneySessionsData,
} from '~/lib/journey-sessions';
import { isSpanishCampusLabel } from '../../registration.data';
import {
  JourneyCampusStep,
  JourneyCampusStepSkeleton,
} from './journey-campus-step.component';
import { PlanYourJourneyStep } from './plan-your-journey-step.component';
import {
  YourInformationStep,
  type JourneyInformationDraft,
} from './your-information-step.component';
import { JourneyConfirmation } from './journey-confirmation.component';

type Step = 1 | 2 | 3 | 'confirmation';

type SessionsResponse = JourneySessionsData | { error: string };

export const JourneyRegistration = () => {
  const fetcher = useFetcher<SessionsResponse>();
  const [searchParams] = useSearchParams();
  const appliedCampusLink = useRef(false);
  const [step, setStep] = useState<Step>(1);
  const [preferredCampusId, setPreferredCampusId] = useState<number>(0);
  const [selection, setSelection] = useState<JourneySessionSelection>({});
  const [registered, setRegistered] = useState<JourneySessionSelection>({});
  const [person, setPerson] = useState<JourneyInformationDraft>();

  useEffect(() => {
    fetcher.load('/api/journey-sessions');
  }, []);

  const sessionsData =
    fetcher.data && 'options' in fetcher.data ? fetcher.data : undefined;
  const loadError =
    fetcher.data && 'error' in fetcher.data ? fetcher.data.error : undefined;

  const preferredCampus = sessionsData?.campuses.find(
    (campus) => campus.id === preferredCampusId,
  );
  const isSpanish = isSpanishCampusLabel(preferredCampus?.name ?? '');
  const registeredSessions = JOURNEY_SESSION_NUMBERS.filter(
    (n) => registered[n],
  );

  // Keeps the address bar a copyable campus link. replaceState instead of navigate,
  // so the event loader doesn't refetch and the page doesn't jump to the hash.
  const syncCampusInUrl = (slug?: string) => {
    const url = new URL(window.location.href);
    if (slug) url.searchParams.set('campus', slug);
    else url.searchParams.delete('campus');
    url.hash = 'register';
    window.history.replaceState(window.history.state, '', url);
  };

  const choosePreferredCampus = (campusId: number) => {
    // One campus per registration: a new campus starts over, keeping only the person's details.
    if (campusId !== preferredCampusId) {
      setSelection({});
      setRegistered({});
    }
    setPreferredCampusId(campusId);
    setStep(2);
    syncCampusInUrl(
      sessionsData?.campuses.find((campus) => campus.id === campusId)?.url,
    );
  };

  // A campus link (`?campus=port-st-lucie#register`) skips step 1. Applied once, so
  // a later reload of the sessions can't pull the person back to step 2.
  useEffect(() => {
    if (!sessionsData || appliedCampusLink.current) return;
    appliedCampusLink.current = true;
    const linkedCampus = findJourneyCampusBySlug(
      sessionsData.campuses,
      searchParams.get('campus'),
    );
    if (linkedCampus) choosePreferredCampus(linkedCampus.id);
  }, [sessionsData]);

  const backToCampusStep = () => {
    setStep(1);
    syncCampusInUrl();
  };

  const resetAll = () => {
    setStep(1);
    setPreferredCampusId(0);
    setSelection({});
    setRegistered({});
    setPerson(undefined);
    syncCampusInUrl();
  };

  const renderStep = () => {
    if (loadError) {
      return <p className='text-center text-alert'>{loadError}</p>;
    }
    if (!sessionsData) {
      return <JourneyCampusStepSkeleton />;
    }
    if (sessionsData.campuses.length === 0) {
      return (
        <p className='text-center text-neutral-default'>
          There are no upcoming Journey sessions right now. Please check back
          soon.
        </p>
      );
    }

    switch (step) {
      case 1:
        return (
          <JourneyCampusStep
            campuses={sessionsData.campuses}
            onSelect={choosePreferredCampus}
          />
        );
      case 2:
        return (
          <PlanYourJourneyStep
            campuses={sessionsData.campuses}
            options={sessionsData.options}
            preferredCampusId={preferredCampusId}
            selection={selection}
            registered={registered}
            onChangePreferredCampus={backToCampusStep}
            onSelect={(sessionNumber, option) =>
              setSelection((prev) => ({ ...prev, [sessionNumber]: option }))
            }
            onSelectEarliest={() =>
              setSelection(
                pickEarliestAvailable(
                  sessionsData.options,
                  preferredCampusId,
                  registeredSessions,
                ),
              )
            }
            onBack={backToCampusStep}
            onContinue={() => setStep(3)}
          />
        );
      case 3:
        return (
          <YourInformationStep
            campuses={sessionsData.campuses}
            selection={selection}
            registered={registered}
            isSpanish={isSpanish}
            defaults={person}
            onBack={(draft) => {
              setPerson(draft);
              setStep(2);
            }}
            onSuccess={(details) => {
              setPerson(details);
              setRegistered((prev) => ({ ...prev, ...selection }));
              setSelection({});
              setStep('confirmation');
            }}
          />
        );
      case 'confirmation':
        return (
          <JourneyConfirmation
            campuses={sessionsData.campuses}
            registered={registered}
            onScheduleAnother={() => setStep(2)}
            onRegisterSomeoneElse={resetAll}
          />
        );
    }
  };

  return (
    <div className='flex w-full justify-center bg-gray-50 px-4 py-12 md:py-16'>
      <div className='flex w-full max-w-[960px] flex-col items-center gap-8'>
        <div className='flex flex-col items-center gap-3 text-center'>
          <h2 className='text-[32px] font-extrabold text-black'>
            Register for Journey
          </h2>
          <p className='text-neutral-default'>
            Journey includes three sessions. Complete all three in any order.
          </p>
        </div>

        {step !== 'confirmation' && (
          <div className='flex flex-col items-center gap-2'>
            <div className='flex gap-2'>
              {[1, 2, 3].map((dot) => (
                <span
                  key={dot}
                  className={`size-[10px] rounded-full ${dot === step ? 'bg-ocean' : 'bg-neutral-lighter'}`}
                />
              ))}
            </div>
            <p className='text-sm font-semibold text-black'>Step {step} of 3</p>
          </div>
        )}

        {renderStep()}
      </div>
    </div>
  );
};
