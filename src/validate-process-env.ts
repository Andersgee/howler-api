/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable @typescript-eslint/no-namespace */
import { z } from "zod";

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
  AUTH_SECRET: z.string(),
});

function formatErrors(errors: z.ZodFormattedError<z.infer<typeof envSchema>>) {
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
