import { LoaderFunction } from 'react-router';
import { fetchCampuses, type CampusOption } from '~/lib/.server/rock-campuses';
import { fetchDefinedValues } from '~/lib/.server/rock-defined-values';
import { ConnectCardLoaderReturnType } from './types';

export const loader: LoaderFunction = async () => {
  // All That Applies Checkboxes
  const ALL_THAT_APPLIES_ID = 389; //Rock Define Type ID
  const rockDefineTypes = await fetchDefinedValues<{
    guid: string;
    value: string;
  }>({
    definedTypeId: ALL_THAT_APPLIES_ID,
    activeOnly: true,
    fields: ['Guid', 'Value'],
  });

  // Campuses
  const campuses = await fetchCampuses<CampusOption>({ active: true }, [
    'Name',
    'Guid',
    'Url',
  ]);

  const data: ConnectCardLoaderReturnType = {
    campuses: campuses,
    allThatApplies: rockDefineTypes,
  };

  return <ConnectCardLoaderReturnType>data;
};
