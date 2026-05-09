import type { Metadata } from "next";
import "../styles/tailwind.css";
import DeviceTracker from "./DeviceTracker";
import ToastProvider from "./ToastProvider";

export const metadata: Metadata = {
  title: "Phố Ẩm Thực - Thuyết Minh Tự Động",
  description: "Hệ thống thuyết minh đa ngôn ngữ cho du khách trải nghiệm ẩm thực",
  viewport: "width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body suppressHydrationWarning>
        {/* Gắn tracker ở layout gốc để mọi trang đều ghi nhận thiết bị. */}
        <DeviceTracker />
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}