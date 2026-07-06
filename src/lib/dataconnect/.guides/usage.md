# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createProperty, createDistressProperty, createBooking, fetchDistrictAvailability, secureDistressSearch, listAllProperties } from '@thelord-property/dataconnect';


// Operation CreateProperty:  For variables, look at type CreatePropertyVars in ../index.d.ts
const { data } = await CreateProperty(dataConnect, createPropertyVars);

// Operation CreateDistressProperty:  For variables, look at type CreateDistressPropertyVars in ../index.d.ts
const { data } = await CreateDistressProperty(dataConnect, createDistressPropertyVars);

// Operation CreateBooking:  For variables, look at type CreateBookingVars in ../index.d.ts
const { data } = await CreateBooking(dataConnect, createBookingVars);

// Operation FetchDistrictAvailability:  For variables, look at type FetchDistrictAvailabilityVars in ../index.d.ts
const { data } = await FetchDistrictAvailability(dataConnect, fetchDistrictAvailabilityVars);

// Operation SecureDistressSearch:  For variables, look at type SecureDistressSearchVars in ../index.d.ts
const { data } = await SecureDistressSearch(dataConnect, secureDistressSearchVars);

// Operation ListAllProperties:  For variables, look at type ListAllPropertiesVars in ../index.d.ts
const { data } = await ListAllProperties(dataConnect, listAllPropertiesVars);


```