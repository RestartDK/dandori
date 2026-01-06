function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional<T extends string | undefined>(
  key: string,
  defaultValue: T
): T extends string ? string : string | undefined {
  return (process.env[key] ?? defaultValue) as T extends string
    ? string
    : string | undefined;
}

export const env = {
  // Database
  DATABASE_URL: required("DATABASE_URL"),

  // Google OAuth
  GOOGLE_CLIENT_ID: required("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: required("GOOGLE_CLIENT_SECRET"),

  // Google AI (Gemini)
  GOOGLE_GENERATIVE_AI_API_KEY: required("GOOGLE_GENERATIVE_AI_API_KEY"),

  // Server
  PORT: optional("PORT", "3000"),
  CORS_ORIGIN: optional("CORS_ORIGIN", ""),
} as const;

export type Env = typeof env;
