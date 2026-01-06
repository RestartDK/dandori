function required(key: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  VITE_SERVER_URL: required("VITE_SERVER_URL"),
} as const;

export type Env = typeof env;
