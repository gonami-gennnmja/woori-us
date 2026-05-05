import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://iyyko.com"),
  title: "iyyko | us",
  description: "Zen Serif mood scheduler for couples and close friends.",
  openGraph: {
    title: "iyyko | us",
    description: "A clean shared calendar for together and solo moments.",
    url: "https://iyyko.com/us",
    siteName: "iyyko | us",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "iyyko | us",
    description: "A clean shared calendar for together and solo moments.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
