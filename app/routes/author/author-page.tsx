import React from 'react';
import { AuthorLoaderData } from './types';
import { useLoaderData } from 'react-router';
import BackButton from './components/back-button';
import AuthorTabs from './components/author-tabs';
import { AuthorBio } from './partials/author-bio';

export const AuthorPage: React.FC = () => {
  const data = useLoaderData<AuthorLoaderData>();

  return (
    <div className='relative'>
      {/* Background container */}
      <div className='absolute inset-0 h-full w-full grid grid-cols-5 z-0'>
        <div className='col-span-3' />
        <div className='col-span-2 md:bg-gray' />
      </div>
      {/* Content */}
      <div className='md:px-12 lg:px-18 z-1'>
        <section className='relative max-w-screen-content mx-auto grid grid-cols-3 bg-white'>
          {/* Main content - takes up 2/3 on desktop */}
          <div className='col-span-3 md:col-span-2 md:pb-12 md:pr-10'>
            <div className='flex flex-col items-start bg-gray md:bg-transparent pt-12 md:pb-10 px-8 md:px-0'>
              <BackButton />
              {/* Mobile Author Bio */}
              <div className='mb-8 pt-4 md:hidden'>
                <AuthorBio author={data} />
              </div>
              {/* Desktop Author Name */}
              <h1 className='hidden text-[40px] font-bold md:block'>
                {data?.fullName}
              </h1>
            </div>

            <div className='pb-12 md:pb-0'>
              <AuthorTabs
                articles={data?.authorAttributes?.publications?.articles}
              />
            </div>
          </div>

          {/* Sidebar - takes up 1/3 on desktop */}
          <div className='hidden md:block md:col-span-1 px-0 md:pl-10 py-12 bg-gray'>
            <AuthorBio author={data} />
          </div>
        </section>
      </div>
    </div>
  );
};
