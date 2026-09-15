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
                Todd and Julie Mullins are the Senior Pastors of Christ
                Fellowship Church and have been part of the Christ Fellowship
                family since the very beginning. Over the years, they’ve served
                in just about every area of church life, and they still love
                nothing more than seeing people grow in their faith, discover
                their purpose, and become all God created them to be.
              </p>
              <p>
                Todd is passionate about helping people build a strong faith,
                understand God’s Word, and grow closer to Jesus. He is also the
                author of Don’t Let Doubt Take You Out, written to help people
                move through seasons of doubt and live with greater faith and
                confidence in God.
              </p>
              <p>
                Julie loves developing people and helping the next generation
                step into leadership and use the gifts God has placed inside
                them. Along with leading and investing in the Christ Fellowship
                staff, she leads Sisterhood, a movement for every girl from
                every generation to know God, find community, and make a
                difference.
              </p>
              <p>
                Todd and Julie have one son, Jefferson, who is married to
                Cassie. Jefferson and Cassie both serve on the Christ Fellowship
                team and recently welcomed their daughter, Adeline Grace, making
                Todd and Julie very happy grandparents!
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
