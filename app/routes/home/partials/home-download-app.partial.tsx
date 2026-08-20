import { appleLink, googleLink } from '~/lib/utils';
import { Icon } from '~/primitives/icon/icon';

const features = [
  {
    icon: 'map' as const,
    title: 'Sunday Service Guide',
    description:
      "Find service times, get directions, see exactly what's happening, and sign up for upcoming events effortlessly.",
  },
  {
    icon: 'bookContent' as const,
    title: 'Interactive Sermon Notes',
    description:
      'Follow along with the live message, fill in note outlines, and save key takeaways directly to your personal journal.',
  },
  {
    icon: 'heart' as const,
    title: 'Community Prayer Wall',
    description:
      'Need backup? Share prayer requests anonymously or with your name and watch thousands in our community lift you up.',
  },
  {
    icon: 'calendar' as const,
    title: 'Weekly Connections',
    description:
      'Stay in loop with weekly events, resources, and specific ministries tailored for kids, students, and young adults.',
  },
];

export function HomeDownloadAppSection() {
  return (
    <section className='relative z-30 overflow-hidden bg-linear-to-br from-[#1C3647] to-navy py-16 md:py-24 lg:py-30 content-padding'>
      <div className='max-w-screen-content mx-auto grid items-center gap-12 lg:grid-cols-[333px_1fr] lg:gap-20'>
        <img
          src='/assets/images/home/app-image.webp'
          alt='Christ Fellowship app'
          width={333}
          height={699}
          className='mx-auto w-full max-w-[260px] lg:max-w-[333px]'
        />
        <div className='flex flex-col gap-8'>
          <div>
            <h2 className='text-[36px] md:text-[54px] font-extrabold leading-[1.1] text-white'>
              See what we&apos;re about.
              <br />
              <span className='text-ocean'>Right from your phone.</span>
            </h2>
            <p className='mt-4 max-w-4xl text-base md:text-lg text-white/75'>
              Curious about church but not ready to walk through the doors? The
              Christ Fellowship app is designed to let you explore faith, get to
              know our community, and take your own next steps at your own pace.
            </p>
          </div>
          <div className='grid gap-5 sm:grid-cols-2'>
            {features.map((feature) => (
              <div
                key={feature.title}
                className='rounded-2xl border border-white/10 bg-white/3 p-6'
              >
                <div className='flex size-10 items-center justify-center rounded-xl bg-ocean text-white'>
                  <Icon name={feature.icon} size={20} />
                </div>
                <h3 className='mt-3 text-xl font-extrabold text-white'>
                  {feature.title}
                </h3>
                <p className='mt-1 text-sm text-white/70'>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
          <div>
            <p className='mb-4 text-sm font-semibold text-white/50'>
              Download now &amp; start exploring
            </p>
            <div className='flex flex-wrap gap-3'>
              <StoreLink
                href={appleLink}
                icon='appleLogo'
                eyebrow='Download on the'
                label='App Store'
              />
              <StoreLink
                href={googleLink}
                icon='google'
                eyebrow='Get it on'
                label='Google Play'
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StoreLink({
  href,
  icon,
  eyebrow,
  label,
}: {
  href: string;
  icon: 'appleLogo' | 'google';
  eyebrow: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      aria-label={`${eyebrow} ${label}`}
      className='flex min-w-44 items-center gap-2 rounded-full border border-white/10 bg-navy px-6 py-2 text-white shadow-lg transition-colors hover:bg-navy/70'
    >
      <Icon name={icon} size={36} />
      <span className='flex flex-col leading-none'>
        <span className='text-[10px] uppercase opacity-60'>{eyebrow}</span>
        <span className='mt-1 text-lg font-bold'>{label}</span>
      </span>
    </a>
  );
}
