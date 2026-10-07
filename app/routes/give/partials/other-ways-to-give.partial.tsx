import Icon from '~/primitives/icon';
import { sanitizeCmsHtml } from '~/lib/sanitize';
import { icons } from '~/lib/icons';
import { Link } from 'react-router';

export const OtherWaysToGive = () => {
  return (
    <div className='w-full py-12 md:py-24 content-padding' id='give-other-ways'>
      <div className='flex flex-col gap-12 md:gap-16 items-center mx-auto max-w-screen-content'>
        {/* Title Section*/}
        <div className='flex flex-col gap-1 md:gap-2 items-center text-center'>
          <h2 className='text-[32px] md:text-[52px] font-extrabold leading-tight'>
            Other Ways to Give
          </h2>
          <div className='bg-ocean w-[160px] md:w-[265px] h-2 rounded-lg' />
        </div>

        {/* Cards */}
        <div className='flex flex-col md:flex-row gap-10 xl:gap-16'>
          {otherWaysToGiveData.map((item, index) => (
            <OtherWaysToGiveCard key={index} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
};

const OtherWaysToGiveCard = ({
  title,
  description,
  ctas,
}: {
  title: string;
  description: string;
  ctas?: {
    icon: keyof typeof icons;
    href: string;
  }[];
}) => {
  return (
    <div className='w-full max-w-[434px] flex flex-col gap-2 md:gap-6 lg:gap-8 items-center text-center'>
      <h3 className='text-2xl md:text-[28px] lg:text-[32px] font-extrabold leading-tight'>
        {title}
      </h3>
      <p
        className='leading-tight text-text-secondary lg:text-lg'
        dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(description) }}
      />

      {ctas && (
        <div className='flex gap-2 items-center justify-center'>
          {ctas.map((cta, index) => (
            <Link
              key={index}
              to={cta.href}
              target='_blank'
              className={`${cta.icon === 'appleLogo' ? 'md:hidden' : ''}`}
              aria-label={`${cta.icon} Link`}
            >
              <Icon
                name={cta.icon}
                className='size-8 md:size-[46px] text-ocean'
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

const otherWaysToGiveData: {
  title: string;
  description: string;
  ctas?: {
    icon: keyof typeof icons;
    href: string;
  }[];
}[] = [
  {
    title: 'Other Online Options',
    description:
      'Online gifts given through Cash App or Venmo cannot be designated to a specific fund or campus.',
    ctas: [
      {
        icon: 'paypal',
        href: 'https://www.paypal.com/paypalme/ChristFellowshipFL',
      },
      {
        icon: 'venmo',
        href: 'https://account.venmo.com/u/Christ-Fellowship',
      },
      // {
      //   icon: "appleLogo",
      //   href: "https://apple.com/apple-pay",
      // },
    ],
  },
  {
    title: 'Cash or Check',
    description:
      "Give at any Christ Fellowship location or mail to: <br/><br/> <span class='italic md:not-italic'>Christ Fellowship Church Contributions<br/> 5343 Northlake Blvd, Palm Beach Gardens, FL 33418</span>",
  },
  {
    title: 'Stocks, bonds, crypto, and other assets',
    description:
      "To give by stock, bond, or cryptocurrency, please <a class='text-ocean font-bold underline' href='mailto:contributions@christfellowship.church'>contact us</a>.",
  },
];
