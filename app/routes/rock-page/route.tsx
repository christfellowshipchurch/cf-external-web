import { useCallback } from 'react';
import { Link, useLoaderData } from 'react-router';
import { RockProxyEmbed } from '~/components/rock-embed';
import Icon from '~/primitives/icon';
import { loader } from './loader';
import { meta } from './meta';
import { getRockPageVolunteerBackLink } from './rock-page.data';

export { meta };
export { loader };

export default function RockPage() {
  const { url, embed } = useLoaderData<typeof loader>();
  const backLink = getRockPageVolunteerBackLink(embed);

  const handleParentScrollToTop = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
      });
    });
  }, []);

  return (
    <div className='w-full max-w-screen-content mx-auto px-4 py-4'>
      {backLink && (
        <nav className='mb-4'>
          <Link
            to={backLink.href}
            className='inline-flex items-center gap-2 text-sm font-semibold text-neutral-darker transition-colors hover:text-ocean'
          >
            <Icon name='chevronLeft' size={20} className='shrink-0' />
            {backLink.label}
          </Link>
        </nav>
      )}
      <RockProxyEmbed
        useAdvancedProxy={false}
        url={url}
        autoHeight
        height={1200}
        showLoading={false}
        onLoad={handleParentScrollToTop}
        onScrollToTop={handleParentScrollToTop}
      />
    </div>
  );
}
