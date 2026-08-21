import { useFetcher, useLoaderData } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';

import { CampusInfo } from './campus-info.partial';
import { LocationFAQ } from './faq.partial';
import { DynamicHero } from '~/components/dynamic-hero';
import { LocationViewModel } from '../types';
import { CampusTabs } from '../components/tabs-component/campus-tabs.component';
import { AboutUs } from './tabs/about-us';
import { SundayDetails } from './tabs/sunday-details';
import { ForFamilies } from './tabs/families';
import {
  englishTabData,
  onlineTabsData,
  spanishTabData,
} from '../location-single-data';
import { useResponsive } from '~/hooks/use-responsive';
import { LoaderReturnType } from '../loader';
import {
  buildWistiaOEmbedRequestUrl,
  buildWistiaSwatchImageUrl,
  type WistiaOEmbedPayload,
} from '~/lib/wistia-oembed';

function useResponsiveVideo(
  backgroundVideoMobile?: string,
  backgroundVideoDesktop?: string,
) {
  const { isSmall } = useResponsive();

  // On mobile: prefer mobile video, fallback to desktop
  // On desktop: prefer desktop video, fallback to mobile
  if (isSmall) {
    return backgroundVideoMobile || backgroundVideoDesktop;
  }
  return backgroundVideoDesktop || backgroundVideoMobile;
}

/** Hero backdrop: Wistia oEmbed thumbnail (with swatch fallback) or campus image. */
function useLocationHeroBackgroundImage(
  wistiaId: string | undefined,
  campusImage: string | undefined,
): string | undefined {
  const [wistiaPosterUrl, setWistiaPosterUrl] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = wistiaId?.trim() ?? '';
    if (!trimmed) {
      setWistiaPosterUrl(null);
      return;
    }

    setWistiaPosterUrl(null);

    const controller = new AbortController();

    const loadPoster = async () => {
      try {
        const response = await fetch(buildWistiaOEmbedRequestUrl(trimmed), {
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as WistiaOEmbedPayload;
        if (data.thumbnail_url) {
          setWistiaPosterUrl(data.thumbnail_url);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
      }
    };

    void loadPoster();
    return () => controller.abort();
  }, [wistiaId]);

  const trimmed = wistiaId?.trim() ?? '';
  if (!trimmed) {
    return campusImage;
  }
  return wistiaPosterUrl ?? buildWistiaSwatchImageUrl(trimmed);
}

export function LocationSingle({ location }: { location: LocationViewModel }) {
  const [activeTab, setActiveTab] = useState('sunday-details');
  const fetcher = useFetcher<{ isValid: boolean }>();

  const {
    campusName,
    campusUrl,
    campusLocation = undefined,
    campusImage,
    campusInstagram,
    campusPastor,
    digitalTourVideo = '',
    phoneNumber,
    serviceTimes,
    setReminderVideo: originalSetReminderVideo = '',
    weeklyMinistryServices = [],
    additionalInfo,
    backgroundVideoMobile,
    backgroundVideoDesktop,
  } = location;

  // Validate Wistia ID if it exists
  useEffect(() => {
    if (originalSetReminderVideo) {
      fetcher.load(
        `/validate-wistia?videoId=${encodeURIComponent(
          originalSetReminderVideo,
        )}`,
      );
    }
  }, [originalSetReminderVideo]);

  // Use validated video ID - only use it if validation passed
  // Don't render video while validation is in progress or if validation failed
  const setReminderVideo =
    originalSetReminderVideo &&
    fetcher.state === 'idle' &&
    fetcher.data?.isValid === true
      ? originalSetReminderVideo
      : undefined;

  const wistiaId = useResponsiveVideo(
    backgroundVideoMobile,
    backgroundVideoDesktop,
  );

  const heroBackgroundImage = useLocationHeroBackgroundImage(
    wistiaId,
    campusImage,
  );

  const isOnline =
    campusUrl === 'cf-everywhere' ||
    campusName?.includes('Online') ||
    campusName?.includes('Everywhere');
  const isSpanish = campusName?.includes('Español');

  if (isOnline) {
    return <OnlineCampus location={location} />;
  }

  // Dynamic Hero Hardcoded Content / Data
  const heading1 = isSpanish ? 'Este es un' : "You're";
  const heading2 = isSpanish ? 'lugar para ti' : 'welcome here';
  const ctas = [
    {
      title: isSpanish ? 'Visítanos' : 'Plan a Visit',
      href: '#',
      isSetAReminder: true,
    },
    {
      title: isSpanish ? 'Mapa y direcciones' : 'Map & Directions',
      href: location.mapLink || '#',
      target: '_blank',
    },
  ];

  return (
    <div className='w-full overflow-hidden'>
      <DynamicHero
        isSpanish={isSpanish}
        wistiaId={wistiaId}
        imagePath={heroBackgroundImage}
        desktopHeight='800px'
        titleAs='div'
        customTitle={`<span style='font-weight: 800;'><span style='color: #0092BC;'>${heading1}</span> <br/>${heading2}</span>`}
        ctas={ctas}
      />

      <CampusInfo
        serviceTimes={serviceTimes}
        phoneNumber={phoneNumber}
        additionalInfo={additionalInfo}
        campusName={campusName}
        campusLocation={campusLocation}
        digitalTourVideo={digitalTourVideo}
        weeklyMinistryServices={weeklyMinistryServices}
      />

      <CampusTabsWrapper
        activeTab={activeTab}
        isSpanish={isSpanish}
        setActiveTab={setActiveTab}
        setReminderVideo={setReminderVideo}
        isOnline={false}
        campusPastor={campusPastor}
        campusName={campusName}
        campusInstagram={campusInstagram}
        campusUrl={campusUrl}
      />

      <LocationFAQ campusName={campusName} campusUrl={campusUrl} />
    </div>
  );
}

const OnlineCampus = ({ location }: { location: LocationViewModel }) => {
  const fetcher = useFetcher<{ isValid: boolean }>();

  const {
    campusName,
    campusImage,
    campusInstagram,
    campusPastor,
    digitalTourVideo = '',
    setReminderVideo: originalSetReminderVideo = '',
    phoneNumber,
    serviceTimes,
    additionalInfo,
    backgroundVideoMobile,
    backgroundVideoDesktop,
  } = location;

  // Validate Wistia ID if it exists
  useEffect(() => {
    if (originalSetReminderVideo) {
      fetcher.load(
        `/validate-wistia?videoId=${encodeURIComponent(
          originalSetReminderVideo,
        )}`,
      );
    }
  }, [originalSetReminderVideo]);

  // Use validated video ID - only use it if validation passed
  // Don't render video while validation is in progress or if validation failed
  const setReminderVideo =
    originalSetReminderVideo &&
    fetcher.state === 'idle' &&
    fetcher.data?.isValid === true
      ? originalSetReminderVideo
      : undefined;

  const [activeTab, setActiveTab] = useState('sunday-details');

  const wistiaId = useResponsiveVideo(
    backgroundVideoMobile,
    backgroundVideoDesktop,
  );

  const heroBackgroundImage = useLocationHeroBackgroundImage(
    wistiaId,
    campusImage,
  );

  return (
    <div className='w-full overflow-hidden'>
      <DynamicHero
        wistiaId={wistiaId}
        imagePath={heroBackgroundImage}
        desktopHeight='800px'
        titleAs='div'
        customTitle="<span style='font-weight: 800;'><span style='color: #0092BC;'>You're</span> <br/>welcome here</span>"
        ctas={[
          { title: 'Set a Reminder', href: '#', isSetAReminder: true },
          {
            title: 'Watch Live',
            href: 'https://www.youtube.com/user/christfellowship',
          },
        ]}
      />
      <CampusInfo
        serviceTimes={serviceTimes}
        phoneNumber={phoneNumber}
        additionalInfo={additionalInfo}
        campusName={campusName}
        digitalTourVideo={digitalTourVideo}
        isOnline={true}
      />

      <CampusTabsWrapper
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setReminderVideo={setReminderVideo}
        isOnline={true}
        campusPastor={campusPastor}
        campusName={campusName}
        campusInstagram={campusInstagram}
        campusUrl='cf-everywhere'
      />

      <LocationFAQ campusName={campusName} campusUrl='cf-everywhere' />
    </div>
  );
};

const CampusTabsWrapper = ({
  activeTab,
  isSpanish,
  campusPastor,
  campusName,
  campusInstagram,
  setActiveTab,
  setReminderVideo,
  isOnline,
  campusUrl,
}: {
  activeTab: string;
  campusPastor: {
    email: string;
    firstName: string;
    lastName: string;
    photo: string;
  };
  campusName: string;
  campusInstagram: string;
  isSpanish?: boolean;
  setActiveTab: (tab: string) => void;
  setReminderVideo: string | undefined;
  isOnline: boolean;
  campusUrl?: string;
}) => {
  const { upcomingEvents } = useLoaderData<LoaderReturnType>();
  const hasUpcomingEvents = (upcomingEvents.collection?.length ?? 0) > 0;

  const defaultTabData = isOnline
    ? onlineTabsData
    : isSpanish
      ? spanishTabData
      : englishTabData;
  const tabData = hasUpcomingEvents
    ? defaultTabData
    : defaultTabData.filter((tab) => tab.value !== 'upcoming-events');

  const activeTabValue = tabData.some((tab) => tab.value === activeTab)
    ? activeTab
    : 'sunday-details';

  const SundayTabPanel = useMemo(() => {
    function SundayTabPanel() {
      return (
        <SundayDetails
          setReminderVideo={setReminderVideo}
          isOnline={isOnline}
          isSpanish={isSpanish}
          campusUrl={campusUrl}
        />
      );
    }
    return SundayTabPanel;
  }, [setReminderVideo, isOnline, isSpanish, campusUrl]);

  const AboutTabPanel = useMemo(() => {
    function AboutTabPanel() {
      return (
        <AboutUs
          campusPastor={campusPastor}
          isSpanish={isSpanish}
          campusName={campusName}
          campusInstagram={campusInstagram}
        />
      );
    }
    return AboutTabPanel;
  }, [campusPastor, isSpanish, campusName, campusInstagram]);

  const FamiliesTabPanel = useMemo(() => {
    function FamiliesTabPanel() {
      return <ForFamilies isSpanish={isSpanish} />;
    }
    return FamiliesTabPanel;
  }, [isSpanish]);

  const tabs = useMemo(
    () =>
      !isOnline
        ? [SundayTabPanel, AboutTabPanel, FamiliesTabPanel]
        : [SundayTabPanel, AboutTabPanel],
    [SundayTabPanel, AboutTabPanel, FamiliesTabPanel, isOnline],
  );

  return (
    <div className='relative h-full w-full'>
      <CampusTabs
        activeTab={activeTabValue}
        isSpanish={isSpanish}
        setActiveTab={setActiveTab}
        tabs={tabs}
        tabData={tabData}
        isOnline={isOnline}
        setReminderVideo={setReminderVideo}
      />
    </div>
  );
};
