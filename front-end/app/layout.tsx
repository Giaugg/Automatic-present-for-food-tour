import type { Metadata } from "next";
import "../styles/tailwind.css";

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
      <body>
        {children}
      </body>
    </html>
  );
}