export type ConnectFormType = {
  FirstName: string;
  LastName: string;
  Campus: string; // campus guid
  EmailAddress: string;
  PhoneNumber: string;
  Decision?: string;
  AllThatApplies?: string;
  Selection?: string;
  NextStep?: string;
  Other?: string;
  /** Present on Spanish workflow 403 only (matches other Rock form launches). */
  LaunchSource?: 'app';
};

export type ConnectCardLoaderReturnType = {
  campuses: { guid: string; name: string; url?: string }[];
  allThatApplies: { guid: string; value: string }[];
};

export type ConnectCardPrefill = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  campus?: string; // campus guid
};

export type ConnectCardPrefillStatus =
  | 'success'
  | 'invalid-id'
  | 'not-found'
  | 'error';

export type ConnectCardPrefillResponse =
  | { status: 'success'; prefill: ConnectCardPrefill }
  | { status: 'invalid-id' }
  | { status: 'not-found' }
  | { status: 'error'; message: string };
