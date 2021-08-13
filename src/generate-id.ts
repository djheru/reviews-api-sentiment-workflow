import { ulid } from 'ulid';

export const handler = async (event: any) => {
  console.log('idGenerator: %j', event);
  const generatedId = ulid();
  console.log(`Generated ID: ${generatedId}`);
  return generatedId;
};
