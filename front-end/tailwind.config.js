/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    // Thêm các đường dẫn khác của bạn
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--border)", // Ánh xạ class 'border-border' vào biến CSS --border
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};