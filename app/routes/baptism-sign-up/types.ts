export type BaptismSignUpFormType = {
  FirstName: string;
  LastName: string;
  PhoneNumber: string;
  EmailAddress: string;
  Campus1: string; // campus guid
  Birthdate: string;
  /** English 1465: Location GUID. Spanish 1644: formatted address (Address field). */
  Address: string;
  'T-ShirtSize': string;
  ShareYourStory: string;
  MyStory: string;
  LaunchSource: string; // hardcoded 'app'
  Group: string;
  // Age-conditional — present only when the form's age logic requires them.
  AreyouinHighSchool?: string; // literal 'True' | 'False' (Rock Boolean default)
  Grade?: string;
  GFirstName?: string;
  GLastName?: string;
  GuardiansEmail?: string;
  GuardiansPhoneNumber?: string;
  Relationship?: string;
};

export type BaptismSignUpLoaderReturnType = {
  campuses: { guid: string; name: string }[];
};
