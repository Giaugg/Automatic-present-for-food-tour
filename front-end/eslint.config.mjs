// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  basePath: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // 1. Cho phép dùng 'any' (Giải quyết lỗi đỏ khi ép kiểu nhanh)
      "@typescript-eslint/no-explicit-any": "off",

      // 2. Cho phép biến đã khai báo nhưng chưa dùng (Thường gặp khi dev)
      "@typescript-eslint/no-unused-vars": "off",

      // 3. Cho phép để mảng trống [] mà không báo lỗi 'never'
      "@typescript-eslint/no-array-constructor": "off",

      // 4. Tắt cảnh báo về việc require (nếu bạn còn dùng CommonJS)
      "@typescript-eslint/no-var-requires": "off",

      // 5. Cho phép dùng @ts-ignore để bỏ qua lỗi cục bộ
      "@typescript-eslint/ban-ts-comment": "off",
      
      // 6. Cho phép các biểu thức không được sử dụng (void, v.v.)
      "@typescript-eslint/no-unused-expressions": "off"
    },
  },
];

export default eslintConfig;