import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // The database client connects with full rights, so only the catalogue reader, the
  // db folder, checkout, email and admin code, server actions and API routes may import it. Pages read through @/lib/catalog.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/lib/catalog.ts",
      "src/lib/db/**",
      "src/lib/checkout/**",
      "src/lib/email/**",
      "src/lib/admin/**",
      "src/lib/account/**",
      "src/actions/**",
      "src/app/api/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/db", "@/lib/db/*"],
              message:
                "Read the catalogue through @/lib/catalog; write through a server action in src/actions.",
            },
          ],
        },
      ],
    },
  },
  // Disable stylistic rules that conflict with Prettier (keep last).
  prettier,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
