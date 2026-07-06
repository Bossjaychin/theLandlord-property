# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `default`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*FetchDistrictAvailability*](#fetchdistrictavailability)
  - [*SecureDistressSearch*](#securedistresssearch)
  - [*ListAllProperties*](#listallproperties)
- [**Mutations**](#mutations)
  - [*CreateProperty*](#createproperty)
  - [*CreateDistressProperty*](#createdistressproperty)
  - [*CreateBooking*](#createbooking)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `default`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@thelord-property/dataconnect` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@thelord-property/dataconnect';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@thelord-property/dataconnect';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `default` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## FetchDistrictAvailability
You can execute the `FetchDistrictAvailability` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
fetchDistrictAvailability(vars: FetchDistrictAvailabilityVariables, options?: ExecuteQueryOptions): QueryPromise<FetchDistrictAvailabilityData, FetchDistrictAvailabilityVariables>;

interface FetchDistrictAvailabilityRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: FetchDistrictAvailabilityVariables): QueryRef<FetchDistrictAvailabilityData, FetchDistrictAvailabilityVariables>;
}
export const fetchDistrictAvailabilityRef: FetchDistrictAvailabilityRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
fetchDistrictAvailability(dc: DataConnect, vars: FetchDistrictAvailabilityVariables, options?: ExecuteQueryOptions): QueryPromise<FetchDistrictAvailabilityData, FetchDistrictAvailabilityVariables>;

interface FetchDistrictAvailabilityRef {
  ...
  (dc: DataConnect, vars: FetchDistrictAvailabilityVariables): QueryRef<FetchDistrictAvailabilityData, FetchDistrictAvailabilityVariables>;
}
export const fetchDistrictAvailabilityRef: FetchDistrictAvailabilityRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the fetchDistrictAvailabilityRef:
```typescript
const name = fetchDistrictAvailabilityRef.operationName;
console.log(name);
```

### Variables
The `FetchDistrictAvailability` query requires an argument of type `FetchDistrictAvailabilityVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface FetchDistrictAvailabilityVariables {
  district: string;
  checkIn: DateString;
  checkOut: DateString;
}
```
### Return Type
Recall that executing the `FetchDistrictAvailability` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `FetchDistrictAvailabilityData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `FetchDistrictAvailability`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, fetchDistrictAvailability, FetchDistrictAvailabilityVariables } from '@thelord-property/dataconnect';

// The `FetchDistrictAvailability` query requires an argument of type `FetchDistrictAvailabilityVariables`:
const fetchDistrictAvailabilityVars: FetchDistrictAvailabilityVariables = {
  district: ..., 
  checkIn: ..., 
  checkOut: ..., 
};

// Call the `fetchDistrictAvailability()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await fetchDistrictAvailability(fetchDistrictAvailabilityVars);
// Variables can be defined inline as well.
const { data } = await fetchDistrictAvailability({ district: ..., checkIn: ..., checkOut: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await fetchDistrictAvailability(dataConnect, fetchDistrictAvailabilityVars);

console.log(data.properties);

// Or, you can use the `Promise` API.
fetchDistrictAvailability(fetchDistrictAvailabilityVars).then((response) => {
  const data = response.data;
  console.log(data.properties);
});
```

### Using `FetchDistrictAvailability`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, fetchDistrictAvailabilityRef, FetchDistrictAvailabilityVariables } from '@thelord-property/dataconnect';

// The `FetchDistrictAvailability` query requires an argument of type `FetchDistrictAvailabilityVariables`:
const fetchDistrictAvailabilityVars: FetchDistrictAvailabilityVariables = {
  district: ..., 
  checkIn: ..., 
  checkOut: ..., 
};

// Call the `fetchDistrictAvailabilityRef()` function to get a reference to the query.
const ref = fetchDistrictAvailabilityRef(fetchDistrictAvailabilityVars);
// Variables can be defined inline as well.
const ref = fetchDistrictAvailabilityRef({ district: ..., checkIn: ..., checkOut: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = fetchDistrictAvailabilityRef(dataConnect, fetchDistrictAvailabilityVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.properties);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.properties);
});
```

## SecureDistressSearch
You can execute the `SecureDistressSearch` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
secureDistressSearch(vars: SecureDistressSearchVariables, options?: ExecuteQueryOptions): QueryPromise<SecureDistressSearchData, SecureDistressSearchVariables>;

interface SecureDistressSearchRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: SecureDistressSearchVariables): QueryRef<SecureDistressSearchData, SecureDistressSearchVariables>;
}
export const secureDistressSearchRef: SecureDistressSearchRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
secureDistressSearch(dc: DataConnect, vars: SecureDistressSearchVariables, options?: ExecuteQueryOptions): QueryPromise<SecureDistressSearchData, SecureDistressSearchVariables>;

interface SecureDistressSearchRef {
  ...
  (dc: DataConnect, vars: SecureDistressSearchVariables): QueryRef<SecureDistressSearchData, SecureDistressSearchVariables>;
}
export const secureDistressSearchRef: SecureDistressSearchRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the secureDistressSearchRef:
```typescript
const name = secureDistressSearchRef.operationName;
console.log(name);
```

### Variables
The `SecureDistressSearch` query requires an argument of type `SecureDistressSearchVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface SecureDistressSearchVariables {
  buyerQuery: string;
}
```
### Return Type
Recall that executing the `SecureDistressSearch` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `SecureDistressSearchData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface SecureDistressSearchData {
  properties: ({
    id: UUIDString;
    title: string;
    askingPrice?: number | null;
    district: string;
  } & Property_Key)[];
}
```
### Using `SecureDistressSearch`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, secureDistressSearch, SecureDistressSearchVariables } from '@thelord-property/dataconnect';

// The `SecureDistressSearch` query requires an argument of type `SecureDistressSearchVariables`:
const secureDistressSearchVars: SecureDistressSearchVariables = {
  buyerQuery: ..., 
};

// Call the `secureDistressSearch()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await secureDistressSearch(secureDistressSearchVars);
// Variables can be defined inline as well.
const { data } = await secureDistressSearch({ buyerQuery: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await secureDistressSearch(dataConnect, secureDistressSearchVars);

console.log(data.properties);

// Or, you can use the `Promise` API.
secureDistressSearch(secureDistressSearchVars).then((response) => {
  const data = response.data;
  console.log(data.properties);
});
```

### Using `SecureDistressSearch`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, secureDistressSearchRef, SecureDistressSearchVariables } from '@thelord-property/dataconnect';

// The `SecureDistressSearch` query requires an argument of type `SecureDistressSearchVariables`:
const secureDistressSearchVars: SecureDistressSearchVariables = {
  buyerQuery: ..., 
};

// Call the `secureDistressSearchRef()` function to get a reference to the query.
const ref = secureDistressSearchRef(secureDistressSearchVars);
// Variables can be defined inline as well.
const ref = secureDistressSearchRef({ buyerQuery: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = secureDistressSearchRef(dataConnect, secureDistressSearchVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.properties);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.properties);
});
```

## ListAllProperties
You can execute the `ListAllProperties` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listAllProperties(vars: ListAllPropertiesVariables, options?: ExecuteQueryOptions): QueryPromise<ListAllPropertiesData, ListAllPropertiesVariables>;

interface ListAllPropertiesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListAllPropertiesVariables): QueryRef<ListAllPropertiesData, ListAllPropertiesVariables>;
}
export const listAllPropertiesRef: ListAllPropertiesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAllProperties(dc: DataConnect, vars: ListAllPropertiesVariables, options?: ExecuteQueryOptions): QueryPromise<ListAllPropertiesData, ListAllPropertiesVariables>;

interface ListAllPropertiesRef {
  ...
  (dc: DataConnect, vars: ListAllPropertiesVariables): QueryRef<ListAllPropertiesData, ListAllPropertiesVariables>;
}
export const listAllPropertiesRef: ListAllPropertiesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAllPropertiesRef:
```typescript
const name = listAllPropertiesRef.operationName;
console.log(name);
```

### Variables
The `ListAllProperties` query requires an argument of type `ListAllPropertiesVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListAllPropertiesVariables {
  checkIn: DateString;
  checkOut: DateString;
}
```
### Return Type
Recall that executing the `ListAllProperties` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAllPropertiesData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListAllProperties`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAllProperties, ListAllPropertiesVariables } from '@thelord-property/dataconnect';

// The `ListAllProperties` query requires an argument of type `ListAllPropertiesVariables`:
const listAllPropertiesVars: ListAllPropertiesVariables = {
  checkIn: ..., 
  checkOut: ..., 
};

// Call the `listAllProperties()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAllProperties(listAllPropertiesVars);
// Variables can be defined inline as well.
const { data } = await listAllProperties({ checkIn: ..., checkOut: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAllProperties(dataConnect, listAllPropertiesVars);

console.log(data.properties);

// Or, you can use the `Promise` API.
listAllProperties(listAllPropertiesVars).then((response) => {
  const data = response.data;
  console.log(data.properties);
});
```

### Using `ListAllProperties`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAllPropertiesRef, ListAllPropertiesVariables } from '@thelord-property/dataconnect';

// The `ListAllProperties` query requires an argument of type `ListAllPropertiesVariables`:
const listAllPropertiesVars: ListAllPropertiesVariables = {
  checkIn: ..., 
  checkOut: ..., 
};

// Call the `listAllPropertiesRef()` function to get a reference to the query.
const ref = listAllPropertiesRef(listAllPropertiesVars);
// Variables can be defined inline as well.
const ref = listAllPropertiesRef({ checkIn: ..., checkOut: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAllPropertiesRef(dataConnect, listAllPropertiesVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.properties);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.properties);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `default` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateProperty
You can execute the `CreateProperty` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
createProperty(vars: CreatePropertyVariables): MutationPromise<CreatePropertyData, CreatePropertyVariables>;

interface CreatePropertyRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreatePropertyVariables): MutationRef<CreatePropertyData, CreatePropertyVariables>;
}
export const createPropertyRef: CreatePropertyRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createProperty(dc: DataConnect, vars: CreatePropertyVariables): MutationPromise<CreatePropertyData, CreatePropertyVariables>;

interface CreatePropertyRef {
  ...
  (dc: DataConnect, vars: CreatePropertyVariables): MutationRef<CreatePropertyData, CreatePropertyVariables>;
}
export const createPropertyRef: CreatePropertyRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createPropertyRef:
```typescript
const name = createPropertyRef.operationName;
console.log(name);
```

### Variables
The `CreateProperty` mutation requires an argument of type `CreatePropertyVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreatePropertyVariables {
  title: string;
  nightlyRate: number;
  district: string;
  isDistressSale?: boolean | null;
  agisVerified?: boolean | null;
  askingPrice?: number | null;
}
```
### Return Type
Recall that executing the `CreateProperty` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreatePropertyData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreatePropertyData {
  property_insert: Property_Key;
}
```
### Using `CreateProperty`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createProperty, CreatePropertyVariables } from '@thelord-property/dataconnect';

// The `CreateProperty` mutation requires an argument of type `CreatePropertyVariables`:
const createPropertyVars: CreatePropertyVariables = {
  title: ..., 
  nightlyRate: ..., 
  district: ..., 
  isDistressSale: ..., // optional
  agisVerified: ..., // optional
  askingPrice: ..., // optional
};

// Call the `createProperty()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createProperty(createPropertyVars);
// Variables can be defined inline as well.
const { data } = await createProperty({ title: ..., nightlyRate: ..., district: ..., isDistressSale: ..., agisVerified: ..., askingPrice: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createProperty(dataConnect, createPropertyVars);

console.log(data.property_insert);

// Or, you can use the `Promise` API.
createProperty(createPropertyVars).then((response) => {
  const data = response.data;
  console.log(data.property_insert);
});
```

### Using `CreateProperty`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createPropertyRef, CreatePropertyVariables } from '@thelord-property/dataconnect';

// The `CreateProperty` mutation requires an argument of type `CreatePropertyVariables`:
const createPropertyVars: CreatePropertyVariables = {
  title: ..., 
  nightlyRate: ..., 
  district: ..., 
  isDistressSale: ..., // optional
  agisVerified: ..., // optional
  askingPrice: ..., // optional
};

// Call the `createPropertyRef()` function to get a reference to the mutation.
const ref = createPropertyRef(createPropertyVars);
// Variables can be defined inline as well.
const ref = createPropertyRef({ title: ..., nightlyRate: ..., district: ..., isDistressSale: ..., agisVerified: ..., askingPrice: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createPropertyRef(dataConnect, createPropertyVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.property_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.property_insert);
});
```

## CreateDistressProperty
You can execute the `CreateDistressProperty` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
createDistressProperty(vars: CreateDistressPropertyVariables): MutationPromise<CreateDistressPropertyData, CreateDistressPropertyVariables>;

interface CreateDistressPropertyRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateDistressPropertyVariables): MutationRef<CreateDistressPropertyData, CreateDistressPropertyVariables>;
}
export const createDistressPropertyRef: CreateDistressPropertyRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createDistressProperty(dc: DataConnect, vars: CreateDistressPropertyVariables): MutationPromise<CreateDistressPropertyData, CreateDistressPropertyVariables>;

interface CreateDistressPropertyRef {
  ...
  (dc: DataConnect, vars: CreateDistressPropertyVariables): MutationRef<CreateDistressPropertyData, CreateDistressPropertyVariables>;
}
export const createDistressPropertyRef: CreateDistressPropertyRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createDistressPropertyRef:
```typescript
const name = createDistressPropertyRef.operationName;
console.log(name);
```

### Variables
The `CreateDistressProperty` mutation requires an argument of type `CreateDistressPropertyVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateDistressPropertyVariables {
  title: string;
  nightlyRate: number;
  district: string;
  askingPrice: number;
  description: string;
}
```
### Return Type
Recall that executing the `CreateDistressProperty` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateDistressPropertyData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateDistressPropertyData {
  property_insert: Property_Key;
}
```
### Using `CreateDistressProperty`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createDistressProperty, CreateDistressPropertyVariables } from '@thelord-property/dataconnect';

// The `CreateDistressProperty` mutation requires an argument of type `CreateDistressPropertyVariables`:
const createDistressPropertyVars: CreateDistressPropertyVariables = {
  title: ..., 
  nightlyRate: ..., 
  district: ..., 
  askingPrice: ..., 
  description: ..., 
};

// Call the `createDistressProperty()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createDistressProperty(createDistressPropertyVars);
// Variables can be defined inline as well.
const { data } = await createDistressProperty({ title: ..., nightlyRate: ..., district: ..., askingPrice: ..., description: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createDistressProperty(dataConnect, createDistressPropertyVars);

console.log(data.property_insert);

// Or, you can use the `Promise` API.
createDistressProperty(createDistressPropertyVars).then((response) => {
  const data = response.data;
  console.log(data.property_insert);
});
```

### Using `CreateDistressProperty`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createDistressPropertyRef, CreateDistressPropertyVariables } from '@thelord-property/dataconnect';

// The `CreateDistressProperty` mutation requires an argument of type `CreateDistressPropertyVariables`:
const createDistressPropertyVars: CreateDistressPropertyVariables = {
  title: ..., 
  nightlyRate: ..., 
  district: ..., 
  askingPrice: ..., 
  description: ..., 
};

// Call the `createDistressPropertyRef()` function to get a reference to the mutation.
const ref = createDistressPropertyRef(createDistressPropertyVars);
// Variables can be defined inline as well.
const ref = createDistressPropertyRef({ title: ..., nightlyRate: ..., district: ..., askingPrice: ..., description: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createDistressPropertyRef(dataConnect, createDistressPropertyVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.property_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.property_insert);
});
```

## CreateBooking
You can execute the `CreateBooking` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
createBooking(vars: CreateBookingVariables): MutationPromise<CreateBookingData, CreateBookingVariables>;

interface CreateBookingRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateBookingVariables): MutationRef<CreateBookingData, CreateBookingVariables>;
}
export const createBookingRef: CreateBookingRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createBooking(dc: DataConnect, vars: CreateBookingVariables): MutationPromise<CreateBookingData, CreateBookingVariables>;

interface CreateBookingRef {
  ...
  (dc: DataConnect, vars: CreateBookingVariables): MutationRef<CreateBookingData, CreateBookingVariables>;
}
export const createBookingRef: CreateBookingRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createBookingRef:
```typescript
const name = createBookingRef.operationName;
console.log(name);
```

### Variables
The `CreateBooking` mutation requires an argument of type `CreateBookingVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateBookingVariables {
  propertyId: UUIDString;
  checkIn: DateString;
  checkOut: DateString;
}
```
### Return Type
Recall that executing the `CreateBooking` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateBookingData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateBookingData {
  booking_insert: Booking_Key;
}
```
### Using `CreateBooking`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createBooking, CreateBookingVariables } from '@thelord-property/dataconnect';

// The `CreateBooking` mutation requires an argument of type `CreateBookingVariables`:
const createBookingVars: CreateBookingVariables = {
  propertyId: ..., 
  checkIn: ..., 
  checkOut: ..., 
};

// Call the `createBooking()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createBooking(createBookingVars);
// Variables can be defined inline as well.
const { data } = await createBooking({ propertyId: ..., checkIn: ..., checkOut: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createBooking(dataConnect, createBookingVars);

console.log(data.booking_insert);

// Or, you can use the `Promise` API.
createBooking(createBookingVars).then((response) => {
  const data = response.data;
  console.log(data.booking_insert);
});
```

### Using `CreateBooking`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createBookingRef, CreateBookingVariables } from '@thelord-property/dataconnect';

// The `CreateBooking` mutation requires an argument of type `CreateBookingVariables`:
const createBookingVars: CreateBookingVariables = {
  propertyId: ..., 
  checkIn: ..., 
  checkOut: ..., 
};

// Call the `createBookingRef()` function to get a reference to the mutation.
const ref = createBookingRef(createBookingVars);
// Variables can be defined inline as well.
const ref = createBookingRef({ propertyId: ..., checkIn: ..., checkOut: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createBookingRef(dataConnect, createBookingVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.booking_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.booking_insert);
});
```

