import { SectionTitle } from '~/components/section-title';

export function SeniorPastorsSection() {
  return (
    <section
      id='leadership'
      className='relative z-30 scroll-mt-18 bg-gray py-16 md:py-24 lg:py-30 content-padding'
    >
      <div className='max-w-screen-content mx-auto flex flex-col gap-10 lg:gap-12'>
        <SectionTitle sectionTitle='our leaders' />
        <div className='grid gap-10 lg:grid-cols-2 lg:gap-12 lg:items-center xl:grid-cols-[minmax(0,620px)_1fr] xl:gap-20'>
          <div className='flex flex-col gap-6 md:flex-row md:items-center md:gap-8 lg:flex-col lg:items-stretch lg:gap-6'>
            <img
              src='/assets/images/home/senior-pastors.webp'
              alt='Pastors Todd and Julie Mullins'
              width={620}
              height={680}
              className='w-full rounded-2xl object-cover aspect-[31/34] md:w-[45%] md:shrink-0 lg:w-full'
            />
            <div>
              <h2 className='text-[28px] md:text-[32px] font-extrabold leading-tight'>
                Todd &amp; Julie Mullins
              </h2>
              <p className='mt-2 text-lg font-semibold text-ocean'>
                Senior Pastors
              </p>
            </div>
          </div>
          <div className='flex flex-col gap-8 lg:gap-10'>
            <div>
              <h2 className='text-[32px] md:text-[40px] lg:text-5xl font-extrabold leading-tight'>
                Meet Our Senior Pastors
              </h2>
            </div>
            <div className='flex flex-col gap-5 text-base md:text-lg leading-normal'>
              <p>
                Since becoming Senior Pastors in 2011, the Mullins have led
                Christ Fellowship with a heart for people and a clear vision to
                see lives transformed by the hope and love of Jesus. Under their
                leadership, Christ Fellowship has continued its growth as a
                multi-site congregation that gathers thousands in South Florida
                each week and digitally reaches thousands beyond the region
                through Christ Fellowship Everywhere.
              </p>
              <p>
                Their leadership expands beyond the walls of Christ Fellowship
                as they serve the South Florida region and beyond. They are the
                founders of Church United, a partnership of local churches
                across various denominations who join together to transform
                South Florida. Todd and Julie also serve on the lead team of the
                Association of Related Churches (ARC), as well as on the board
                of directors for Place of Hope Children's Home in South Florida.
                They are both frequently invited to churches and conferences
                around the globe to share the love and message of Jesus Christ.
                Todd recently authored his debut book, Don't Let Doubt Take You
                Out. Their son Jefferson and his wife Cassie also serve together
                in ministry at Christ Fellowship.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
