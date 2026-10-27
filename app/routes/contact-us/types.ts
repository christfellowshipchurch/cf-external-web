export type ContactFormType = {
  FirstName: string;
  LastName: string;
  EmailAddress: string;
  PhoneNumber: string;
  Campus: string; // campus guid
  Message: string;
  SendingFormName: string;
  LaunchSource: string;
};

export type ContactUsLoaderReturnType = {
  campuses: { guid: string; name: string }[];
  formStartedAt: number;
};
