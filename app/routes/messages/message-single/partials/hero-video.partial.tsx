import { VideoHeader } from '~/components';
import type { VideoHeaderCta } from '~/components/video-header';
import { LoaderReturnType } from '../loader';
import { useLoaderData } from 'react-router';

const VideoSkeleton = () => (
  <div className='w-full aspect-video bg-gradient-to-r from-gray-700 via-gray-800 to-gray-700 bg-[length:200%_100%] animate-gradient rounded-lg' />
);

export const MessageVideo: React.FC = () => {
  const { message } = useLoaderData<LoaderReturnType>();

  const ctas: VideoHeaderCta[] = [
    ...(message.seriesId
      ? [
          {
            title: 'Sermon Series Resources',
            href: `/series-resources/${message.seriesUrl || message.seriesId}`,
          },
        ]
      : []),
    { title: 'Share', kind: 'share' },
  ];

  return (
    <VideoHeader
      wistiaId={message.video || ''}
      video={message.video || ''}
      videoClassName='aspect-7/4'
      controls={false}
      ctas={ctas}
      fallback={<VideoSkeleton />}
    />
  );
};
