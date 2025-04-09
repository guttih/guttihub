// src/types/global.d.ts or src/global.d.ts


export {};

declare global {
  let __streamStore: Map<string, string> | undefined;
}