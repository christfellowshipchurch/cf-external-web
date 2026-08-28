import { Link } from 'react-router';
import { GroupConnectModal } from '~/components/modals/group-connect/group-connect-modal';
import { cn } from '~/lib/utils';
import { Button } from '~/primitives/button/button.primitive';
import { Icon } from '~/primitives/icon/icon';
import { ImageSource, type GroupType } from '~/routes/group-finder/types';
import { MAX_VISIBLE_LEADERS } from '~/routes/group-finder/components/group-hit.component';
import { useStickyTopBelowNavbarClass } from '~/hooks/use-sticky-top-below-navbar';
import { useGroupSearchBackUrl } from '../group-single-back-url';

export const GroupSingleBanner = ({
  language,
  topics,
  leaderImages,
  groupName,
  groupId,
}: {
  language: GroupType['language'];
  topics: string[];
  leaderImages: ImageSource[];
  groupName: string;
  groupId: string;
}) => {
  const stickyTopClass = useStickyTopBelowNavbarClass();
  const backToGroupFinderUrl = useGroupSearchBackUrl();

  const imageStyles = 'size-20 rounded-[10px] object-cover';

  // Same cap as the Group Finder cards and the mobile hero: at most two leader
  // photos, with the rest summarized as a "+N" badge.
  const leaderImagesWithPhoto = leaderImages.filter(
    (image) => image?.sources?.[0]?.uri,
  );
  const visibleLeaderImages = leaderImagesWithPhoto.slice(
    0,
    MAX_VISIBLE_LEADERS,
  );
  const hiddenLeaderImageCount =
    leaderImagesWithPhoto.length - visibleLeaderImages.length;

  //  If language is Spanish, add "Español" to the list of Tags displayed
  const tags = language === 'Spanish' ? ['Español', ...topics] : topics;

  return (
    <div
      className={cn(
        'hidden md:block w-full bg-white content-padding pt-8 pb-4 sticky z-10 shadow-sm transition-[top] duration-300',
        stickyTopClass,
      )}
    >
      <div className='max-w-screen-content mx-auto w-full flex justify-between gap-8 items-center'>
        <div className='flex gap-6 lg:gap-8'>
          <div className='flex items-center gap-4'>
            <Link to={backToGroupFinderUrl} className='flex items-center group'>
              <Icon
                name='arrowBack'
                size={24}
                className='text-navy group-hover:text-dark-navy group-hover:-translate-x-[2px] transition-all duration-300'
              />
            </Link>

            {visibleLeaderImages.map((image, index) => (
              <div key={index} className='relative'>
                <img
                  src={image.sources![0].uri}
                  alt={groupName}
                  className={imageStyles}
                />
                {index === visibleLeaderImages.length - 1 &&
                  hiddenLeaderImageCount > 0 && (
                    <span className='absolute -bottom-1 -right-1 rounded-md bg-navy px-1.5 py-0.5 text-xs font-semibold text-white'>
                      +{hiddenLeaderImageCount}
                    </span>
                  )}
              </div>
            ))}
          </div>

          <div className='flex flex-col justify-between gap-2'>
            <p className='text-[28px] lg:text-[32px] font-extrabold leading-[130%]'>
              {groupName}
            </p>
            <div className='flex gap-[6px]'>
              {tags.map((tag, index) => (
                <TopicBadge key={index} label={tag} isPrimary={index === 0} />
              ))}
            </div>
          </div>
        </div>

        <GroupConnectModal
          groupId={groupId}
          buttonText="I'm Interested"
          ModalButton={(props) => (
            <Button
              intent='primary'
              className='min-w-0 px-4 lg:px-5 min-h-0 py-3 text-base lg:text-lg'
              {...props}
            />
          )}
        />
      </div>
    </div>
  );
};

export const TopicBadge = ({
  label,
  isPrimary,
}: {
  label: string;
  isPrimary: boolean;
}) => {
  return (
    <div
      className={cn(
        'w-fit flex rounded-sm text-sm font-semibold p-[6px] bg-navy-subdued text-dark-navy',
        isPrimary && 'lg:bg-dark-navy lg:text-navy-subdued',
      )}
    >
      {label}
    </div>
  );
};
