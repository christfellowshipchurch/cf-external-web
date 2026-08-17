import { HelpMeFindAGroupModal } from '~/components/modals';
import { Button } from '~/primitives/button/button.primitive';
import { GroupSearch } from './partials/group-search.partial';
import { FinderHero } from '../../components/finders/hero';

const leadGroupUrl = 'https://rock.gocf.org/page/5984';

export function GroupFinderPage() {
  return (
    <div className='flex flex-col min-h-svh'>
      <div className='flex-none'>
        <div className='w-full hidden md:block'>
          <FinderHero
            bgColor='navy'
            bgImage='/assets/images/groups-hero.webp'
            sectionTitle='life together'
            sectionTitleColor='#0092BC'
            title={`Find Your Group <span className="hidden md:inline">Today</span>`}
            mobileDescription="Small groups are all about real life change through authentic relationships. God created us for community, and Groups are where we connect with others, grow in our faith, and take our next step in following Jesus. Whether you're looking for a Bible study, an activity group, or people to do life with, there's a group for you. Life is better together, and we can't wait for you to experience the difference that biblical community can make."
            desktopDescription="Small groups are all about real life change through authentic relationships. God created us for community, and Groups are where we connect with others, grow in our faith, and take our next step in following Jesus. Whether you're looking for a Bible study, an activity group, or people to do life with, there's a group for you. Life is better together, and we can't wait for you to experience the difference that biblical community can make."
            ctas={[
              {
                key: 'help-me-find-a-group',
                render: () => (
                  <HelpMeFindAGroupModal>
                    <Button
                      intent='secondaryWhite'
                      className='text-base font-normal'
                    >
                      Help me find a group
                    </Button>
                  </HelpMeFindAGroupModal>
                ),
              },
              {
                href: leadGroupUrl,
                title: 'Host a group',
                intent: 'primary',
                className:
                  'text-base font-normal hover:bg-white! hover:text-ocean!',
              },
            ]}
          />
        </div>
        <div className='w-full md:hidden'>
          <FinderHero
            bgColor='navy'
            bgImage='/assets/images/groups-hero.webp'
            sectionTitle='life together'
            sectionTitleColor='#0092BC'
            title={`Find Your Group <span className="hidden md:inline">Today</span>`}
            mobileDescription="Small groups are all about real life change through authentic relationships. God created us for community, and Groups are where we connect with others, grow in our faith, and take our next step in following Jesus. Whether you're looking for a Bible study, an activity group, or people to do life with, there's a group for you. Life is better together, and we can't wait for you to experience the difference that biblical community can make."
            desktopDescription="Small groups are all about real life change through authentic relationships. God created us for community, and Groups are where we connect with others, grow in our faith, and take our next step in following Jesus. Whether you're looking for a Bible study, an activity group, or people to do life with, there's a group for you. Life is better together, and we can't wait for you to experience the difference that biblical community can make."
            ctas={[
              {
                key: 'help-me-find-a-group',
                render: () => (
                  <HelpMeFindAGroupModal>
                    <Button intent='white' className='text-base font-normal'>
                      Help me find a group
                    </Button>
                  </HelpMeFindAGroupModal>
                ),
              },
              {
                href: leadGroupUrl,
                title: 'Host a group',
                intent: 'primary',
                className:
                  'text-base font-normal hover:bg-white! hover:text-ocean!',
              },
            ]}
          />
        </div>
      </div>
      <div className='flex flex-col flex-1 w-full'>
        <GroupSearch />
      </div>
    </div>
  );
}
