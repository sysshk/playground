import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma가 생성하는 클라이언트 — 우리가 고칠 코드가 아니다.
    "app/generated/**",
  ]),
  {
    rules: {
      // const { a, b, ...rest } = obj 로 필드를 덜어내는 관용구를 허용한다.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { ignoreRestSiblings: true, argsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
