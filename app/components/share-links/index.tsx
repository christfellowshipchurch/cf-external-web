import { useLoaderData, useLocation } from 'react-router';
import CopyToClipboard from './copy-link.component';
import Icon from '~/primitives/icon';
import { buildSocialShareUrls } from '~/lib/share';

const socialIcons: {
  name: 'linkAlt' | 'linkedIn' | 'twitter' | 'facebook' | 'instagram';
  color?: string;
}[] = [
  { name: 'linkAlt' },
  { name: 'linkedIn' },
  { name: 'twitter' },
  { name: 'facebook' },
  { name: 'instagram' },
];

type ShareLinksProps = {
  size: number;
  url?: string;
  overrideCopyUrl?: string;
  backgroundColor?: string;
  /** Optional page title used to pre-fill the share message on Twitter/X. */
  title?: string;
  socialMedia: SocialMedia[];
  hideSocialLinks?: boolean;
};

/**
 * url is optional — when omitted, ShareLinks auto-generates the correct
 * social share URL for known platforms (twitter, facebook, linkedIn) using
 * the current page URL + title.
 */
type SocialMedia = { type: string; url?: string };

export function ShareLinks({
  size: _size = 8,
  socialMedia,
  url,
  overrideCopyUrl,
  backgroundColor,
  title,
  hideSocialLinks = false,
}: ShareLinksProps) {
  // Add the host URL to the loader data in the route loader, since we can't use window or access env via client-side
  const data = useLoaderData<{ hostUrl?: string }>();
  const hostUrl = url || data?.hostUrl;
  const { pathname } = useLocation();
  const fullPath = `${hostUrl}${pathname}`;

  // Pre-build share URLs from the current page URL + title so consumers
  // don't need to construct them manually.
  const generatedUrls = buildSocialShareUrls(fullPath, title);

  if (hideSocialLinks) {
    return null;
  }

  return socialIcons?.map((icon, index) => {
    const socialEntry = socialMedia?.find(
      (media) => media?.type === icon?.name,
    );

    // Resolve the href:
    // 1. Use an explicitly provided URL if it looks like a real link.
    // 2. Auto-generate for known social types using the current page URL.
    // 3. Skip if neither applies.
    const resolveHref = (): string | null => {
      const provided = socialEntry?.url;
      if (provided && provided.startsWith('http')) return provided;

      const key = icon.name as keyof typeof generatedUrls;
      return generatedUrls[key] ?? null;
    };

    if (socialEntry) {
      const href = resolveHref();
      if (!href) return null;

      return (
        <a target='_blank' key={index} href={href} rel='noreferrer'>
          <Icon
            name={icon?.name}
            size={38}
            color='#0092bc'
            className={`duration-300 hover:scale-105 p-1 rounded-full ${
              backgroundColor || 'bg-white'
            }`}
          />
        </a>
      );
    } else if (icon?.name === 'linkAlt') {
      return (
        <div key={index}>
          <CopyToClipboard textToCopy={overrideCopyUrl || fullPath}>
            <Icon
              name='linkAlt'
              size={38}
              className={`text-ocean duration-300 hover:scale-105 p-1 rounded-full ${
                backgroundColor || 'bg-white'
              }`}
            />
          </CopyToClipboard>
        </div>
      );
    }
    return null;
  });
}
