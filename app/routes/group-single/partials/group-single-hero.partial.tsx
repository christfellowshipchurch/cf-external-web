import { cn } from '~/lib/utils';
import { TopicBadge } from '../components/group-single-banner.component';
import { GroupType, splitGroupTopics } from '~/routes/group-finder/types';
import { formatGroupMeetingScheduleTitle } from '~/routes/group-finder/format-group-meeting-schedule';
import { icons } from '~/lib/icons';
import { Icon } from '~/primitives/icon/icon';
import { Link } from 'react-router-dom';
import { useGroupSearchBackUrl } from '../group-single-back-url';

export function GroupSingleHero({ hit }: { hit: GroupType }) {
  const imagePath = hit.coverImage?.sources?.[0]?.uri ?? '';
  const backToGroupFinderUrl = useGroupSearchBackUrl();
  const topicTags = splitGroupTopics(hit.topics);

  return (
    <>
      <div className='w-full md:hidden relative'>
        <img
          src={imagePath}
          alt='Group Finder Hero'
          className='w-full max-w-screen aspect-video object-cover'
        />
        {/* Back Button */}
        <Link
          to={backToGroupFinderUrl}
          className='absolute top-4 left-4 flex items-center gap-2 bg-white shadow-sm border border-[#DEE0E3] rounded-full p-2'
        >
          <Icon name='arrowBack' className='text-neutral-darker' />
        </Link>
      </div>
      <div
        className={cn(
          'w-full bg-gray relative content-padding pt-10 pb-16 md:pt-16 lg:py-24',
        )}
      >
        <div className='w-full flex flex-col md:flex-col-reverse lg:flex-row gap-10 lg:gap-8 md:justify-between items-center max-w-screen-content mx-auto'>
          {/* Left Side - Desktop, Mobile - EVERYTHING  */}
          <div className='flex flex-col gap-8'>
            <div className='flex md:hidden flex-col gap-2'>
              {topicTags.length > 0 ? (
                <div className='flex flex-wrap gap-1 w-full'>
                  {topicTags.map((topic, index) => (
                    <TopicBadge
                      key={index}
                      label={topic}
                      isPrimary={index === 0}
                    />
                  ))}
                </div>
              ) : null}
              <h1 className='text-4xl font-bold'>{hit.title}</h1>
            </div>

            {/* Mobile Only Leaders Section */}
            <div className='md:hidden flex items-center gap-2'>
              <div className='flex items-center gap-1'>
                {hit.leaders?.map(
                  (leader, index) =>
                    leader?.photo?.sources?.[0]?.uri && (
                      <img
                        key={index}
                        src={leader.photo.sources[0].uri}
                        alt='Leader'
                        className='w-10 h-10 rounded-[8px] object-cover'
                      />
                    ),
                )}
              </div>
              <div className='flex flex-col gap-1'>
                <h2 className='text-neutral-default leading-none'>Led By:</h2>
                <div className='flex flex-wrap gap-1 w-full'>
                  {hit.leaders?.map((leader, index) => (
                    <h3
                      key={index}
                      className='text-neutral-darker font-semibold text-lg leading-none'
                    >
                      {index > 0 ? ' & ' : ''} {leader.firstName}
                    </h3>
                  ))}
                </div>
              </div>
            </div>

            <GroupInfo hit={hit} />
          </div>

          {/* Right Side */}
          <img
            src={imagePath}
            alt='Group Finder Hero'
            className='hidden md:block w-full lg:max-w-[735px] xl:max-w-[935px] aspect-video object-cover rounded-lg'
          />
        </div>
      </div>
    </>
  );
}

const GroupInfo = ({ hit }: { hit: GroupType }) => {
  const {
    meetingDay,
    meetingFrequency,
    meetingLocationType,
    meetingLocation,
    meetingTime,
    campusName,
    groupFor,
    peopleWhoAre,
    minMaxAge,
    adultsOnly,
    childCareDescription,
    summary,
    title,
  } = hit;
  const adultsOnlyBool = adultsOnly === 'True';

  const formattedMeetingTime = meetingTime
    .replace(/\s*(EST|EDT|ET)$/i, '')
    .replace(/\s/g, '');
  const campus = (campusName || '').trim();
  const rawLocationType = (meetingLocationType || '').trim();
  const locationType = rawLocationType.toLowerCase();

  const meetingLocationLabel = (() => {
    if (locationType === 'church' && campus) {
      return `Group Meets at ${campus}`;
    }
    if (rawLocationType && locationType !== 'church') {
      return `Group Meets at ${rawLocationType}`;
    }
    return 'TBD';
  })();
  const groupItemTitle = `${groupFor || 'Anyone'}${
    peopleWhoAre && peopleWhoAre.length > 0 ? `, ${peopleWhoAre[0]}` : ''
  }`;
  const meetingScheduleTitle = formatGroupMeetingScheduleTitle({
    meetingFrequency,
    meetingDay,
    summary,
    title,
  });

  return (
    <div className='flex flex-col md:flex-row md:flex-wrap lg:flex-col gap-8'>
      <InfoItem
        title={meetingLocation}
        description={meetingLocationLabel}
        icon='map'
      />
      <InfoItem
        title={groupItemTitle}
        description={`${minMaxAge} years old`}
        icon='group'
        isLayoutReversed={true}
      />
      {meetingDay && meetingTime && (
        <InfoItem
          title={meetingScheduleTitle}
          description={`${formattedMeetingTime} ET`}
          icon='calendarAlt'
          isLayoutReversed={true}
        />
      )}
      <InfoItem
        title={adultsOnlyBool ? 'Adults Only' : 'Children Welcome'}
        description={childCareDescription ?? ''}
        icon={adultsOnlyBool ? 'male' : 'child'}
      />
      <InfoItem
        title={campusName}
        description='Affiliated Campus Location'
        icon='cfLogo'
      />
    </div>
  );
};

const InfoItem = ({
  description,
  title,
  icon,
  isLayoutReversed,
}: {
  title: string;
  description?: string | undefined;
  icon: keyof typeof icons;
  isLayoutReversed?: boolean;
}) => {
  return (
    <div className='flex items-center gap-[10px] pt-6 lg:pt-0 lg:pb-6 border-t lg:border-b lg:border-t-0 border-[#6E6E6E]/10 w-full md:max-w-[42vw]'>
      <Icon name={icon} className='text-ocean' />

      <div
        className={`flex ${isLayoutReversed ? 'flex-col-reverse' : 'flex-col'}`}
      >
        {description ? (
          <span className='text-text-secondary'>{description}</span>
        ) : null}
        {title ? <h3 className='text-lg font-semibold'>{title}</h3> : null}
      </div>
    </div>
  );
};
