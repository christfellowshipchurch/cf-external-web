import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';
import {
  JOURNEY_SESSION_NUMBERS,
  pickEarliestAvailable,
  type JourneySessionNumber,
  type JourneySessionSelection,
  type JourneySessionsData,
} from '~/lib/journey-sessions';
import { isSpanishCampusLabel } from '../../registration.data';
import { JourneyCampusStep } from './journey-campus-step.component';
import { PlanYourJourneyStep } from './plan-your-journey-step.component';
import {
  YourInformationStep,
  type JourneyPersonDetails,
} from './your-information-step.component';
import { JourneyConfirmation } from './journey-confirmation.component';

type Step = 1 | 2 | 3 | 'confirmation';

type SessionsResponse = JourneySessionsData | { error: string };

const sameCampusForAll = (campusId: number) => ({
  1: campusId,
  2: campusId,
  3: campusId,
});

export const JourneyRegistration = () => {
  const fetcher = useFetcher<SessionsResponse>();
  const [step, setStep] = useState<Step>(1);
  const [preferredCampusId, setPreferredCampusId] = useState<number>(0);
  const [sessionCampusIds, setSessionCampusIds] = useState<
    Record<JourneySessionNumber, number>
  >(sameCampusForAll(0));
  const [selection, setSelection] = useState<JourneySessionSelection>({});
  const [registered, setRegistered] = useState<JourneySessionSelection>({});
  const [person, setPerson] = useState<JourneyPersonDetails>();

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

  const choosePreferredCampus = (campusId: number) => {
    setPreferredCampusId(campusId);
    setSessionCampusIds(sameCampusForAll(campusId));
    setStep(2);
  };

  const resetAll = () => {
    setStep(1);
    setPreferredCampusId(0);
    setSessionCampusIds(sameCampusForAll(0));
    setSelection({});
    setRegistered({});
    setPerson(undefined);
  };

  const renderStep = () => {
    if (loadError) {
      return <p className='text-center text-alert'>{loadError}</p>;
    }
    if (!sessionsData) {
      return (
        <p className='text-center text-neutral-default'>
          Loading Journey sessions...
        </p>
      );
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
            sessionCampusIds={sessionCampusIds}
            selection={selection}
            registered={registered}
            onChangePreferredCampus={() => setStep(1)}
            onChangeSessionCampus={(sessionNumber, campusId) =>
              setSessionCampusIds((prev) => ({
                ...prev,
                [sessionNumber]: campusId,
              }))
            }
            onSelect={(sessionNumber, option) =>
              setSelection((prev) => ({ ...prev, [sessionNumber]: option }))
            }
            onSelectEarliest={() => {
              setSessionCampusIds(sameCampusForAll(preferredCampusId));
              setSelection(
                pickEarliestAvailable(
                  sessionsData.options,
                  preferredCampusId,
                  registeredSessions,
                ),
              );
            }}
            onBack={() => setStep(1)}
            onContinue={() => setStep(3)}
          />
        );
      case 3:
        return (
          <YourInformationStep
            campuses={sessionsData.campuses}
            preferredCampusId={preferredCampusId}
            selection={selection}
            registered={registered}
            isSpanish={isSpanish}
            defaults={person}
            onBack={() => setStep(2)}
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
