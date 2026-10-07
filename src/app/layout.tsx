import type { Metadata, Viewport } from "next";
import { Noto_Sans_Bengali } from "next/font/google";
import { MessProvider } from "@/lib/store";
import { SessionProvider } from "@/lib/session";
import { getAppContext } from "@/lib/supabase/server";
import { Shell } from "@/components/shell";
import "./globals.css";

const bangla = Noto_Sans_Bengali({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bangla",
});

export const metadata: Metadata = {
  title: "মেসমেট",
  description: "মেসের মিল, বাজার আর মাসশেষের হিসাব",
};

export const viewport: Viewport = {
  themeColor: "#E9E1FF",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { profile, mess } = await getAppContext();
  return (
    <html lang="bn" className={`${bangla.variable} h-full antialiased`}>
      <body className="min-h-full">
        <SessionProvider profile={profile}>
          <MessProvider key={mess?.mess.id ?? "none"} context={mess}>
            <Shell>{children}</Shell>
          </MessProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
