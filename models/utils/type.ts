export type Nullable<T> = T | null;
export type ValueNulable<T> = {
  [P in keyof T]?: T[P] | null | undefined;
};
