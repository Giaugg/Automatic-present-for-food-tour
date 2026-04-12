import type { Metadata } from "next";
import "../styles/tailwind.css";
import DeviceTracker from "./DeviceTracker";
import ToastProvider from "./ToastProvider";

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
        {/* Gắn tracker ở layout gốc để mọi trang đều ghi nhận thiết bị. */}
        <DeviceTracker />
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}