import { useLocation } from 'react-router-dom';
import { ContactInfo } from './footer-contact.partial';
import { FooterSocialLinks } from './footer-links.partial';
import { FooterColumnComponent } from './footer-column.component';
import { footerColumns } from './footer-data';
import { Icon } from '~/primitives/icon/icon';
import { shouldHideFooter } from '../navbar/navbar-routes';

export const Footer = () => {
  const { pathname } = useLocation();
  const year = new Date().getFullYear();

  // Routes that render the footer-less (bare) layout
  if (shouldHideFooter(pathname)) {
    return null;
  }

  return (
    <footer className='flex flex-col items-center w-full bg-navy px-4 lg:px-18 relative z-30'>
      <div className='flex flex-col items-center w-full max-w-screen-content'>
        <div className='relative w-full'>
          <div className='absolute w-full h-4 bg-ocean -top-2' />
        </div>
        {/* Contact Info */}
        <ContactInfo />

        {/* Info Section */}
        <div className='w-full border-t border-[#417890] items-start py-14 text-lg text-coconut grid grid-cols-2 md:grid-cols-[repeat(21,1fr)] lg:grid-cols-5 gap-y-14 md:gap-y-8'>
          <div className='flex flex-col items-center md:items-start md:gap-8 col-span-2 md:col-span-5 lg:col-span-1 mr-4'>
            <div className='h-[100px] md:h-auto'>
              <Icon
                name='logo'
                className='size-40 -mt-8 md:mt-auto'
                color='white'
              />
            </div>
            <div className='flex flex-col gap-3'>
              <FooterSocialLinks />
            </div>
          </div>

          {footerColumns.map((column) => (
            <FooterColumnComponent key={column.title} column={column} />
          ))}
        </div>
      </div>

      {/* Copyright */}
      <div className='flex justify-center w-full border-t py-8 text-xs md:text-base text-coconut border-[#417890]'>
        <p className='text-coconut'>
          © {year} Christ Fellowship Church. All Rights Reserved
        </p>
      </div>
    </footer>
  );
};
