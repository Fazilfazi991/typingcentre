import type { Metadata } from "next";
import "./globals.css";
import "./customer-responsive.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://typingcentre.vercel.app"),
  title: { default: "Note It", template: "%s | Note It" },
  description: "Document expiry, renewal and follow-up management for typing centres.",
  icons: { icon: "/brand/favicon-32.png", apple: "/brand/favicon-192.png" },
  openGraph: { title: "Note It", description: "Document expiry, renewal and follow-up management for typing centres.", images: ["/brand/note-it-app-icon.png"] },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
