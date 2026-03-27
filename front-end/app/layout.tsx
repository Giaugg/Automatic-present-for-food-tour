import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google"; // Dùng Montserrat cho chất "ẩm thực"
import "../styles/index.css";

// Cấu hình Font Inter cho các đoạn văn bản
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// Cấu hình Montserrat cho Tiêu đề (Hỗ trợ tiếng Việt cực tốt)
const montserrat = Montserrat({
  subsets: ["vietnamese"],
  weight: ["400", "700", "900"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Phố Ẩm Thực - Thuyết Minh Tự Động",
  description: "Hệ thống thuyết minh đa ngôn ngữ cho du khách trải nghiệm ẩm thực",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${inter.variable} ${montserrat.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}