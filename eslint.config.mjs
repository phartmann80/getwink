import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-config-next@16 ships native flat configs, so they are composed
// directly. FlatCompat is only for legacy .eslintrc-format shareable configs
// and crashes ("Converting circular structure to JSON") when pointed at these
// already-flat configs.
const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/",
      ".next/",
      "out/",
      "apps/mobile/",
      "next-env.d.ts",
    ],
  },
  {
    // Honor the existing `_`-prefix convention for intentionally-unused
    // identifiers (e.g. required-but-unused route handler request args).
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];

export default config;
