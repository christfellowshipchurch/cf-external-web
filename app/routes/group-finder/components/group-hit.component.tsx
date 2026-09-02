import { cn, withRockGetImageSizing } from '~/lib/utils';
import Icon from '~/primitives/icon';
import { GroupType, splitGroupTopics } from '../types';
import { Link } from 'react-router-dom';

/** Group cards and the group detail hero show at most this many leader avatars; extras become a "+N" badge. */
export const MAX_VISIBLE_LEADERS = 2;

export const defaultLeaderPhoto =
  'https://cloudfront.christfellowship.church/GetAvatar.ashx?PhotoId=&AgeClassification=Adult&Gender=Unknown&RecordTypeId=1&Text=JC&Size=180&Style=icon&BackgroundColor=E4E4E7&ForegroundColor=A1A1AA';

/** Spanish campuses use a long "Christ Fellowship Español …" label; shorten to "CFE …" on cards. */
function formatGroupHitCampusName(campusName: string): string {
  const marker = 'Español';
  const i = campusName.indexOf(marker);
  if (i === -1) return campusName;
  const afterMarker = campusName.slice(i + marker.length).trim();
  return afterMarker ? `CFE ${afterMarker}` : 'CFE';
}

/**
 * City for the card's bottom bar: the group's own meeting city when set
 * (`meetingLocation` is "City, FL 33458"), else the campus city, else the
 * campus name itself (e.g. "Online (CF Everywhere)").
 */
function groupHitCityLabel(
  hit: GroupType,
  campusCityByName: Record<string, string>,
): string {
  const meetingCity = (hit.meetingLocation || '').split(',')[0]?.trim();
  if (meetingCity) return meetingCity;
  return (
    campusCityByName[hit.campusName] ?? formatGroupHitCampusName(hit.campusName)
  );
}

function formatDistanceMiles(meters: number): string {
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} miles away`;
}

function hasKnownGroupHitGeoloc(
  geoloc: GroupType['_geoloc'],
): geoloc is { lat: number; lng: number } {
  return (
    geoloc != null &&
    typeof geoloc.lat === 'number' &&
    typeof geoloc.lng === 'number' &&
    Number.isFinite(geoloc.lat) &&
    Number.isFinite(geoloc.lng)
  );
}

export function GroupHit({
  hit,
  backUrl,
  isGeoSearch = false,
  isVirtualFilterActive = false,
  campusCityByName = {},
}: {
  hit: GroupType;
  backUrl?: string;
  isGeoSearch?: boolean;
  /** When the "Virtual" meeting-type filter is active, the footer bar reads
   * "Online" instead of a physical meeting location. */
  isVirtualFilterActive?: boolean;
  campusCityByName?: Record<string, string>;
}) {
  const coverImage = hit.coverImage?.sources?.[0]?.uri || '';
  const preference = hit.groupFor?.trim() || 'Anyone';
  const topicTags = splitGroupTopics(hit.topics);

  const formatTime = (timeString: string) => {
    const normalizedTimeString = timeString.replace(/\bE[SD]T\b/g, 'ET');

    if (
      normalizedTimeString.toLowerCase().includes('am') ||
      normalizedTimeString.toLowerCase().includes('pm')
    ) {
      return normalizedTimeString.includes('ET')
        ? normalizedTimeString
        : `${normalizedTimeString.replace(' ', '')} ET`;
    }

    try {
      const [hoursStr, minutesStr] = normalizedTimeString.split(':');
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr || '0', 10);

      if (isNaN(hours) || isNaN(minutes)) return normalizedTimeString;

      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');

      return `${displayHours}:${displayMinutes}${ampm} ET`;
    } catch {
      return normalizedTimeString;
    }
  };

  const formattedMeetingDay = (() => {
    const daysOfWeek = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    const day = hit.meetingDay || '';
    const isDayOfWeek = daysOfWeek.some((d) => day.includes(d));
    return isDayOfWeek ? day.slice(0, 3) : day;
  })();
  const formattedMeetingTime = formatTime(hit.meetingTime);

  const meetingInfo = formattedMeetingDay + ' ' + formattedMeetingTime;

  // Forward the active Group Search filters (its URL query string) to the detail
  // page as a stateless `from` param, so the back button can restore the filtered
  // results. Using a query param (not router `state`) keeps it working across
  // refreshes and shared links. `backUrl` is the Group Search URL (path + search).
  const qIndex = backUrl?.indexOf('?') ?? -1;
  const fromSearch = qIndex >= 0 ? backUrl!.slice(qIndex + 1) : '';
  const groupSingleUrl = fromSearch
    ? `/group-finder/${hit.groupGuid}?from=${encodeURIComponent(fromSearch)}`
    : `/group-finder/${hit.groupGuid}`;

  const leaders = Array.isArray(hit.leaders) ? hit.leaders : [];
  // Cards cap the leader avatars so a group with many leaders doesn't crowd the
  // cover image; the rest are summarized as a "+N" badge.
  const visibleLeaders = leaders.slice(0, MAX_VISIBLE_LEADERS);
  const hiddenLeaderCount = leaders.length - visibleLeaders.length;
  // Algolia can return groups with blank-string `_geoloc` (no real coordinates).
  // Only show a distance when geoloc is numeric and a finite geoDistance exists;
  // otherwise the group's location "varies".
  const distanceLabel =
    isGeoSearch &&
    hasKnownGroupHitGeoloc(hit._geoloc) &&
    typeof hit._rankingInfo?.geoDistance === 'number' &&
    Number.isFinite(hit._rankingInfo.geoDistance)
      ? formatDistanceMiles(hit._rankingInfo.geoDistance)
      : null;

  // A group whose own meeting type is virtual/online has no physical location,
  // so its footer always reads "Online" rather than the affiliated campus city
  // or a distance, regardless of the active filters or search mode.
  const isVirtualGroup = (() => {
    const t = hit.meetingType?.trim().toLowerCase();
    return t === 'virtual' || t === 'online';
  })();

  // Footer bar text + icon. Priority: the group's own virtual meeting type or
  // the active "Virtual" filter, then a geo distance when one is available,
  // otherwise the group/campus city. A geo search with no usable distance falls
  // back to the same city label instead of "Location Varies".
  const footerShowsOnline = isVirtualGroup || isVirtualFilterActive;
  const footerLabel = footerShowsOnline
    ? 'Online'
    : isGeoSearch && distanceLabel
      ? distanceLabel
      : groupHitCityLabel(hit, campusCityByName);

  return (
    <Link
      prefetch='intent'
      to={groupSingleUrl}
      className='flex h-full min-h-0 w-full max-w-full flex-col'
    >
      <div
        className={cn(
          'mx-auto flex h-full min-h-0 w-full max-w-[360px] flex-1 cursor-pointer flex-col rounded-lg',
          'md:max-w-[300px] lg:max-w-[333px] xl:max-w-[300px]',
          'transition-transform duration-300 ease-out',
          'hover:-translate-y-1',
        )}
      >
        <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-white'>
          <div className='relative flex flex-col gap-2'>
            <img
              src={coverImage}
              alt={hit.title}
              className='w-full h-[140px] object-cover overflow-hidden'
            />

            <div className='flex gap-1 absolute -bottom-4 lg:-bottom-10 xl:-bottom-4 right-4'>
              {visibleLeaders.map((leader, idx) => (
                <div key={leader.id || idx} className='relative'>
                  <img
                    className='rounded-lg border-[1.534px] border-[#EBEBEF] size-[77px] object-cover'
                    style={{
                      boxShadow:
                        '0px 5.114px 10.228px -2.557px rgba(0, 0, 0, 0.10), 0px 2.557px 5.114px -2.557px rgba(0, 0, 0, 0.06)',
                    }}
                    src={withRockGetImageSizing(
                      leader.photo?.sources?.[0]?.uri ?? defaultLeaderPhoto,
                      { maxwidth: 200, maxheight: 200, quality: 80 },
                    )}
                    alt={leader.firstName}
                  />
                  {idx === visibleLeaders.length - 1 &&
                    hiddenLeaderCount > 0 && (
                      <span className='absolute -bottom-1 -right-1 rounded-md bg-navy px-1.5 py-0.5 text-xs font-semibold text-white'>
                        +{hiddenLeaderCount}
                      </span>
                    )}
                </div>
              ))}
            </div>
          </div>

          <div className='flex min-h-0 flex-1 flex-col gap-3 pt-[10px]'>
            <div className='flex flex-col px-6 gap-3'>
              <div className='flex flex-col gap-[10px]'>
                <div
                  className={`${
                    preference === 'Women'
                      ? 'bg-peach/15 text-[#B33A1B]'
                      : preference === 'Men'
                        ? 'bg-cotton-candy/15 text-cotton-candy'
                        : preference === 'Anyone'
                          ? 'bg-ocean/15 text-ocean'
                          : // Couples
                            'bg-lemon/35 text-[#937200]'
                  } w-fit flex rounded-sm text-xs font-semibold px-2 py-1`}
                >
                  {preference}
                </div>
              </div>

              <div className='flex flex-col gap-1'>
                <h3 className='text-lg font-bold leading-6 line-clamp-2'>
                  {hit.title}
                </h3>
                <p className='text-sm text-neutral-default'>{meetingInfo}</p>
              </div>
            </div>
          </div>

          <div className='flex flex-col mt-auto pt-3.5'>
            <div className='flex flex-wrap px-6 gap-x-2 pb-2'>
              {topicTags.map((topic, index) => (
                <TagButton key={index} label={topic} />
              ))}
            </div>
            <div className='w-full px-6 flex items-center justify-center gap-2 py-3 bg-navy text-white '>
              <Icon
                name={footerShowsOnline ? 'globe' : 'map'}
                size={20}
                color='white'
              />
              <p className='text-sm font-semibold'>{footerLabel}</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

const TagButton = ({ label }: { label: string }) => {
  return (
    <div className='bg-navy-subdued text-dark-navy shrink-0 h-6 rounded-sm text-xs font-semibold p-1 mb-2'>
      {label}
    </div>
  );
};
