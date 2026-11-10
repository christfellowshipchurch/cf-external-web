import { TTL } from '~/lib/.server/fetch-rock-data';
import { fetchDefinedValues } from '~/lib/.server/rock-defined-values';
import { IconName } from '~/primitives/button/types';
import type { HeroAction } from './loader';

interface HeroActionRaw {
  attributeValues?: { icon?: { value?: string }; url?: { value?: string } };
  description?: string;
  value?: string;
  order?: number;
}

const sanitizeIconName = (raw: string | undefined): IconName | undefined => {
  if (raw == null || typeof raw !== 'string') return undefined;
  const cleaned = raw.replace(/\|/g, '').replace(/\s/g, '').trim();
  return cleaned.length > 0 ? (cleaned as IconName) : undefined;
};

export const fetchHeroActions = async (): Promise<HeroAction[]> => {
  const definedTypeId = 631;

  try {
    const heroActions = await fetchDefinedValues<HeroActionRaw>({
      definedTypeId,
      activeOnly: true,
      orderBy: 'Order desc',
      limit: 2,
      attributes: 'simple',
      ttl: TTL.NONE,
    });

    return heroActions.map((action) => ({
      iconName: (sanitizeIconName(action.attributeValues?.icon?.value) ??
        'bell') as IconName,
      heading: action.description as string,
      title: action.value as string,
      url: action.attributeValues?.url?.value as string,
      position: action.order as number,
    }));
  } catch (error) {
    console.error('Error fetching hero actions:', error);
    return [];
  }
};
