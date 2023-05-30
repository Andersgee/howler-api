/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable @typescript-eslint/no-namespace */
import { z } from "zod";

// import this file in next.config.mjs to validate process.env at build time
// also update envSchema when changing .env
// this file cant be .ts until next.config supports .ts extension

/**
 * keep this up to date with .env
 *
 * its only purpose is to type the global process.env
 */
export const envSchema = z.object({
  DATABASE_URL: z.string(),
  API_PORT: z.string(),
  HOWLER_FIREBASE_ADMIN_PROJECT_ID: z.string(),
  HOWLER_FIREBASE_ADMIN_CLIENT_EMAIL: z.string(),
  HOWLER_FIREBASE_ADMIN_SERVICE_ACCOUNT_PRIVATE_KEY: z.string(),
});

function formatErrors(errors: Record<string, any>) {
  return Object.entries(errors)
    .map(([name, value]) => {
      if (value && "_errors" in value)
        return `${name}: ${value._errors.join(", ")}\n`;
    })
    .filter(Boolean);
}

const parsedSchema = envSchema.safeParse(process.env);

if (!parsedSchema.success) {
  console.error(
    "❌ Invalid env vars:\n",
    ...formatErrors(parsedSchema.error.format())
  );
  throw new Error("Invalid environment variables");
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envSchema> {}
  }
}
