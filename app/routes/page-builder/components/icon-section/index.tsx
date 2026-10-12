import Icon from '~/primitives/icon';
import { HTMLRenderer } from '~/primitives/html-renderer/html-renderer.component';
import { IconSectionItem, PageBuilderSection } from '../../types';

export const IconSection = ({ data }: { data: PageBuilderSection }) => {
  const sectionTitle =
    data.titleOverride && data.titleOverride !== ''
      ? data.titleOverride
      : data.name;
  const shouldShowTitle = !data.hideTitle && Boolean(sectionTitle?.trim());
  const eyebrow = data.eyebrow?.trim();

  return (
    <div className='w-full bg-white content-padding py-16 lg:py-20'>
      <div className='mx-auto flex max-w-screen-content flex-col gap-4'>
        {eyebrow && (
          <p className='text-xs font-bold uppercase leading-normal text-ocean'>
            {eyebrow}
          </p>
        )}
        {shouldShowTitle && (
          <h2 className='text-[40px] font-extrabold leading-[1.2] text-text-primary lg:text-[52px]'>
            {sectionTitle}
          </h2>
        )}

        <div className='flex flex-col gap-10 pt-12 lg:flex-row'>
          {data.iconSection?.map((item) => (
            <IconSectionColumn key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
};

const IconSectionColumn = ({ item }: { item: IconSectionItem }) => (
  <div className='flex min-w-0 flex-1 flex-col gap-3 border-t-2 border-ocean pt-8 lg:pt-7'>
    {item.icon && (
      <Icon
        name={item.icon}
        className='size-8 self-start text-ocean lg:size-10'
      />
    )}
    <h3 className='pt-3 text-2xl font-extrabold leading-[1.4] text-text-primary lg:pt-1.5'>
      {item.title}
    </h3>
    <HTMLRenderer
      className='leading-normal text-text-secondary'
      html={item.description}
    />
  </div>
);
