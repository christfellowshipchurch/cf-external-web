import { SectionTitle } from '~/components/section-title';

export function SeniorPastorsSection() {
  return (
    <section className='relative z-30 bg-gray py-16 md:py-24 lg:py-30 content-padding'>
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
              <p className='mt-4 text-lg text-text-secondary'>
                Leading Christ Fellowship with a passion to help you love God,
                love people, and lead others.
              </p>
            </div>
            <div className='flex flex-col gap-5 text-base md:text-lg leading-normal'>
              <p>
                Since becoming Senior Pastors in 2011, Todd and Julie Mullins
                have led Christ Fellowship Church with a profound heart for
                people and a clear, unwavering vision: to see lives transformed
                by the love of Jesus. Together, they have nurtured Christ
                Fellowship from a regional community into a thriving family of
                multiple locations across Florida and online, reaching tens of
                thousands of people every week.
              </p>
              <p>
                Their leadership extends far beyond Sunday services. Pastor Todd
                is a champion of global leadership development, serving on the
                boards of several international ministries and organizations.
                Julie is deeply passionate about empowering women and leading
                initiatives that bring hope and support to local communities,
                foster care systems, and families in need. They believe that the
                local church is the hope of the world when we work together to
                serve and lift up others.
              </p>
            </div>
            <blockquote className='border-l-4 border-ocean py-2 pl-6 text-dark-navy'>
              <p className='text-base md:text-lg font-semibold'>
                “Our greatest joy is walking alongside families just like yours,
                helping everyone take their next step in faith, and building a
                community where nobody has to do life alone.”
              </p>
              <footer className='mt-1 text-sm font-bold text-text-secondary'>
                — Pastors Todd &amp; Julie Mullins
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  );
}
