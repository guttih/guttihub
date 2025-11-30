// Minimal local typings for bcrypt used in the project
// If preferred, install official types: npm i -D @types/bcrypt

declare module "bcrypt" {
  export type BinaryLike = string | Buffer;

  export function hash(data: BinaryLike, saltOrRounds: string | number): Promise<string>;
  export function compare(data: BinaryLike, encrypted: string): Promise<boolean>;
  export function genSalt(rounds?: number): Promise<string>;

  const _default: {
    hash: typeof hash;
    compare: typeof compare;
    genSalt: typeof genSalt;
  };
  export default _default;
}

