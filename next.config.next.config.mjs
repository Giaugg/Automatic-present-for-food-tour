/** @type {import('next').NextConfig} */
const nextConfig = {
  /* Các cấu hình của bạn ở đây */
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Cho phép hiển thị ảnh từ mọi nguồn (hoặc điền domain backend của bạn)
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      }
    ],
  },
};

export default nextConfig;