//src/types/AllowedJobUpdateFields.ts
export type AllowedJobUpdateFields = {
    datetime: string;
    duration: number;
    entryName: string;
  };
  

  export type EnrichedUpdatePayload = {
      systemJobId: string;
      cacheKey: string;
      updatedFields: AllowedJobUpdateFields;
  };