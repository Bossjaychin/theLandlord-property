import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface Booking_Key {
  id: UUIDString;
  __typename?: 'Booking_Key';
}

export interface CreateBookingData {
  booking_insert: Booking_Key;
}

export interface CreateBookingVariables {
  propertyId: UUIDString;
  checkIn: DateString;
  checkOut: DateString;
}

export interface CreateDistressPropertyData {
  property_insert: Property_Key;
}

export interface CreateDistressPropertyVariables {
  title: string;
  nightlyRate: number;
  district: string;
  askingPrice: number;
  description: string;
}

export interface CreatePropertyData {
  property_insert: Property_Key;
}

export interface CreatePropertyVariables {
  title: string;
  nightlyRate: number;
  district: string;
  isDistressSale?: boolean | null;
  agisVerified?: boolean | null;
  askingPrice?: number | null;
}

export interface FetchDistrictAvailabilityData {
  properties: ({
    id: UUIDString;
    title: string;
    nightlyRate: number;
    bookings_on_property: ({
      id: UUIDString;
      checkIn: DateString;
      checkOut: DateString;
    } & Booking_Key)[];
  } & Property_Key)[];
}

export interface FetchDistrictAvailabilityVariables {
  district: string;
  checkIn: DateString;
  checkOut: DateString;
}

export interface ListAllPropertiesData {
  properties: ({
    id: UUIDString;
    title: string;
    nightlyRate: number;
    district: string;
    isDistressSale?: boolean | null;
    agisVerified?: boolean | null;
    askingPrice?: number | null;
    bookings_on_property: ({
      id: UUIDString;
      checkIn: DateString;
      checkOut: DateString;
    } & Booking_Key)[];
  } & Property_Key)[];
}

export interface ListAllPropertiesVariables {
  checkIn: DateString;
  checkOut: DateString;
}

export interface Property_Key {
  id: UUIDString;
  __typename?: 'Property_Key';
}

export interface SecureDistressSearchData {
  properties: ({
    id: UUIDString;
    title: string;
    askingPrice?: number | null;
    district: string;
  } & Property_Key)[];
}

export interface SecureDistressSearchVariables {
  buyerQuery: string;
}

interface CreatePropertyRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreatePropertyVariables): MutationRef<CreatePropertyData, CreatePropertyVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreatePropertyVariables): MutationRef<CreatePropertyData, CreatePropertyVariables>;
  operationName: string;
}
export const createPropertyRef: CreatePropertyRef;

export function createProperty(vars: CreatePropertyVariables): MutationPromise<CreatePropertyData, CreatePropertyVariables>;
export function createProperty(dc: DataConnect, vars: CreatePropertyVariables): MutationPromise<CreatePropertyData, CreatePropertyVariables>;

interface CreateDistressPropertyRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateDistressPropertyVariables): MutationRef<CreateDistressPropertyData, CreateDistressPropertyVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateDistressPropertyVariables): MutationRef<CreateDistressPropertyData, CreateDistressPropertyVariables>;
  operationName: string;
}
export const createDistressPropertyRef: CreateDistressPropertyRef;

export function createDistressProperty(vars: CreateDistressPropertyVariables): MutationPromise<CreateDistressPropertyData, CreateDistressPropertyVariables>;
export function createDistressProperty(dc: DataConnect, vars: CreateDistressPropertyVariables): MutationPromise<CreateDistressPropertyData, CreateDistressPropertyVariables>;

interface CreateBookingRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateBookingVariables): MutationRef<CreateBookingData, CreateBookingVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateBookingVariables): MutationRef<CreateBookingData, CreateBookingVariables>;
  operationName: string;
}
export const createBookingRef: CreateBookingRef;

export function createBooking(vars: CreateBookingVariables): MutationPromise<CreateBookingData, CreateBookingVariables>;
export function createBooking(dc: DataConnect, vars: CreateBookingVariables): MutationPromise<CreateBookingData, CreateBookingVariables>;

interface FetchDistrictAvailabilityRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: FetchDistrictAvailabilityVariables): QueryRef<FetchDistrictAvailabilityData, FetchDistrictAvailabilityVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: FetchDistrictAvailabilityVariables): QueryRef<FetchDistrictAvailabilityData, FetchDistrictAvailabilityVariables>;
  operationName: string;
}
export const fetchDistrictAvailabilityRef: FetchDistrictAvailabilityRef;

export function fetchDistrictAvailability(vars: FetchDistrictAvailabilityVariables, options?: ExecuteQueryOptions): QueryPromise<FetchDistrictAvailabilityData, FetchDistrictAvailabilityVariables>;
export function fetchDistrictAvailability(dc: DataConnect, vars: FetchDistrictAvailabilityVariables, options?: ExecuteQueryOptions): QueryPromise<FetchDistrictAvailabilityData, FetchDistrictAvailabilityVariables>;

interface SecureDistressSearchRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: SecureDistressSearchVariables): QueryRef<SecureDistressSearchData, SecureDistressSearchVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: SecureDistressSearchVariables): QueryRef<SecureDistressSearchData, SecureDistressSearchVariables>;
  operationName: string;
}
export const secureDistressSearchRef: SecureDistressSearchRef;

export function secureDistressSearch(vars: SecureDistressSearchVariables, options?: ExecuteQueryOptions): QueryPromise<SecureDistressSearchData, SecureDistressSearchVariables>;
export function secureDistressSearch(dc: DataConnect, vars: SecureDistressSearchVariables, options?: ExecuteQueryOptions): QueryPromise<SecureDistressSearchData, SecureDistressSearchVariables>;

interface ListAllPropertiesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListAllPropertiesVariables): QueryRef<ListAllPropertiesData, ListAllPropertiesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListAllPropertiesVariables): QueryRef<ListAllPropertiesData, ListAllPropertiesVariables>;
  operationName: string;
}
export const listAllPropertiesRef: ListAllPropertiesRef;

export function listAllProperties(vars: ListAllPropertiesVariables, options?: ExecuteQueryOptions): QueryPromise<ListAllPropertiesData, ListAllPropertiesVariables>;
export function listAllProperties(dc: DataConnect, vars: ListAllPropertiesVariables, options?: ExecuteQueryOptions): QueryPromise<ListAllPropertiesData, ListAllPropertiesVariables>;

