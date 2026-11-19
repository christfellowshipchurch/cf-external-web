import type { FetchRockDataOptions } from './fetch-rock-data';
import {
  fetchViaV2Search,
  numericEnum,
  type V2SearchEntity,
} from './rock-v2-search';

/**
 * Person, alias, phone number, group, group member and schedule reads: the
 * same options and result as `fetchRockData`, run on Rock v2
 * (see docs/architecture/rock-v2-setup.md, "Step 4").
 */

const PERSON_FIELDS = [
  'Id',
  'Guid',
  'FirstName',
  'NickName',
  'LastName',
  'Email',
  'PhotoId',
  'PrimaryFamilyId',
];

const PEOPLE_V2: V2SearchEntity = {
  v1Endpoint: 'People',
  model: 'people',
  entityName: 'Person',
  fields: PERSON_FIELDS,
  expands: { Photo: 'Photo.Guid as Photo__Guid, Photo.Path as Photo__Path' },
  // v1's People endpoint never returns deceased people.
  baseWhere: 'IsDeceased == false',
  attributeValuesFromRecord: true,
};

const PERSON_ALIASES_V2: V2SearchEntity = {
  v1Endpoint: 'PersonAlias',
  model: 'personaliases',
  searchKey: 'personAliases',
  entityName: 'PersonAlias',
  fields: ['Id', 'Guid', 'PersonId', 'AliasPersonId'],
  expands: {
    Person: PERSON_FIELDS.map(
      (field) => `Person.${field} as Person__${field}`,
    ).join(', '),
  },
};

const PHONE_NUMBERS_V2: V2SearchEntity = {
  v1Endpoint: 'PhoneNumbers',
  model: 'phonenumbers',
  searchKey: 'phoneNumbers',
  entityName: 'PhoneNumber',
  fields: [
    'Id',
    'Guid',
    'PersonId',
    'Number',
    'NumberFormatted',
    'CountryCode',
    'NumberTypeValueId',
  ],
};

const GROUPS_V2: V2SearchEntity = {
  v1Endpoint: 'Groups',
  model: 'groups',
  entityName: 'Group',
  fields: [
    'Id',
    'Guid',
    'Name',
    'Description',
    'GroupTypeId',
    'CampusId',
    'ParentGroupId',
    'ScheduleId',
    'GroupCapacity',
    'IsActive',
    'IsPublic',
    'IsArchived',
    'IsSecurityRole',
  ],
  expands: {
    'Campus,GroupType':
      'Campus.Name as Campus__Name, Campus.ShortCode as Campus__ShortCode, GroupType.Name as GroupType__Name',
  },
};

/** Rock's GroupMemberStatus enum; v1 sends the number. */
const MEMBER_STATUS_NAMES: Record<string, string> = {
  '0': 'Inactive',
  '1': 'Active',
  '2': 'Pending',
};

const MEMBER_PERSON = [
  'Id',
  'Guid',
  'FirstName',
  'NickName',
  'LastName',
  'PhotoId',
].map((field) => `Person.${field} as Person__${field}`);
const MEMBER_ROLE =
  'GroupRole.Name as GroupRole__Name, GroupRole.IsLeader as GroupRole__IsLeader, GroupRole.Order as GroupRole__Order';

const GROUP_MEMBERS_V2: V2SearchEntity = {
  v1Endpoint: 'GroupMembers',
  model: 'groupmembers',
  searchKey: 'groupMembers',
  entityName: 'GroupMember',
  fields: [
    'Id',
    'Guid',
    'GroupId',
    'PersonId',
    'GroupRoleId',
    'GroupMemberStatus',
    'IsArchived',
  ],
  ...numericEnum('GroupMemberStatus', MEMBER_STATUS_NAMES),
  expands: {
    'Person,GroupRole': [...MEMBER_PERSON, MEMBER_ROLE].join(', '),
    'Person/Photo,GroupRole': [
      ...MEMBER_PERSON,
      'Person.Photo.Guid as Person__Photo__Guid',
      MEMBER_ROLE,
    ].join(', '),
  },
};

const SCHEDULES_V2: V2SearchEntity = {
  v1Endpoint: 'Schedules',
  model: 'schedules',
  entityName: 'Schedule',
  fields: ['Id', 'Guid', 'Name', 'iCalendarContent'],
};

export const fetchPeople = (options: FetchRockDataOptions) =>
  fetchViaV2Search(options, PEOPLE_V2);

export const fetchPersonAliases = (options: FetchRockDataOptions) =>
  fetchViaV2Search(options, PERSON_ALIASES_V2);

export const fetchPhoneNumbers = (options: FetchRockDataOptions) =>
  fetchViaV2Search(options, PHONE_NUMBERS_V2);

export const fetchGroups = (options: FetchRockDataOptions) =>
  fetchViaV2Search(options, GROUPS_V2);

export const fetchGroupMembers = (options: FetchRockDataOptions) =>
  fetchViaV2Search(options, GROUP_MEMBERS_V2);

export const fetchSchedules = (options: FetchRockDataOptions) =>
  fetchViaV2Search(options, SCHEDULES_V2);

export { GROUPS_V2 };
