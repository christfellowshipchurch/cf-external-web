import { useLoaderData, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';

import { useCopyPagePath } from '~/hooks/use-copy-page-path';

import { VolunteerDetailNav } from '../components/volunteer-detail/volunteer-detail-nav.component';
import { VolunteerDetailHero } from '../components/volunteer-detail/volunteer-detail-hero.component';
import { ChurchSidebarShell } from './components/church-sidebar-shell.component';
import { ChurchRoleSelector } from './components/church-role-selector.component';
import {
  ChurchIntro,
  ChurchNotSureLink,
  ChurchContinueBar,
} from './partials/church-serving-area-partials.partial';
import type { LoaderReturnType } from './loader';

const CHURCH_OPPORTUNITY_OVERRIDES: Record<string, string> = {
  missions: '/volunteer#community',
  worship: '/cf-worship-team',
};

export function ChurchServingAreaPage() {
  const { bucket, roles } = useLoaderData<LoaderReturnType>();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [selectedRoleGuid, setSelectedRoleGuid] = useState<string | null>(null);
  const hasSelectedRole = Boolean(selectedRoleGuid?.trim());

  const { copyPath, copied } = useCopyPagePath();

  const onBack = useCallback(() => {
    navigate('/volunteer#church');
  }, [navigate]);

  const onContinue = useCallback(() => {
    const opportunityId = selectedRoleGuid?.trim();
    if (!opportunityId) return;

    const selectedRole = roles.find((role) => role.id === opportunityId);
    const overrideUrl = selectedRole
      ? CHURCH_OPPORTUNITY_OVERRIDES[selectedRole.title.trim().toLowerCase()]
      : null;
    if (overrideUrl) {
      if (/^https?:\/\//.test(overrideUrl)) {
        window.open(overrideUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      navigate(overrideUrl);
      return;
    }

    const searchParams = new URLSearchParams({
      embed: 'church-opportunity',
      opportunityId,
    });
    navigate(`/rock-page?${searchParams.toString()}`);
  }, [navigate, roles, selectedRoleGuid]);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`min-h-screen ${
        isVisible ? 'animate-fadeIn duration-400' : 'opacity-0'
      }`}
    >
      <article className='flex min-h-screen flex-col bg-white'>
        <VolunteerDetailNav
          copied={copied}
          onCopyPath={copyPath}
          onBack={onBack}
        />

        <VolunteerDetailHero
          title={bucket.name}
          coverImage={bucket.image}
          onBack={onBack}
        />

        <div className='min-h-0 flex-1 content-padding w-full pb-0 py-4 md:py-12 lg:mt-6'>
          <div className='grid grid-cols-1 gap-10 md:grid-cols-7 md:items-start md:gap-14 mx-auto max-w-content x-5 lg:px-10 mb-10'>
            <div className='min-w-0 space-y-6 space-x-10 col-span-3'>
              <ChurchIntro
                name={bucket.name}
                tag={bucket.tag}
                description={
                  "Take a look at the options below, pick the one that excites you the most, and then hit 'Continue' to complete your application."
                }
              />
              <div className='hidden md:block'>
                <ChurchNotSureLink />
              </div>

              {/* Role selector — visible below intro on mobile */}
              <div className='md:hidden'>
                <ChurchRoleSelector
                  roles={roles}
                  selectedRoleId={selectedRoleGuid}
                  onSelect={setSelectedRoleGuid}
                />
                <ChurchNotSureLink />
              </div>
            </div>

            {/* Desktop role selector + Continue in sidebar */}
            <div className='hidden md:block col-span-4 pl-3'>
              <ChurchSidebarShell>
                <ChurchRoleSelector
                  roles={roles}
                  selectedRoleId={selectedRoleGuid}
                  onSelect={setSelectedRoleGuid}
                />
              </ChurchSidebarShell>
            </div>
          </div>
        </div>

        <ChurchContinueBar
          hasSelectedRole={hasSelectedRole}
          onContinue={onContinue}
        />
      </article>
    </div>
  );
}
