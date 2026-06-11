import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { SidebarProvider } from "@/app/components/ui/sidebar";
import { AppSidebar } from "@/app/components/AppSidebar";
import { Topbar } from "@/app/components/Topbar";
import { PageTransition } from "@/app/components/PageTransition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Learning Curve",
  description: "Test your knowledge with interactive quizzes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <SidebarProvider>
          <AppSidebar />
          <div className="flex min-h-svh flex-1 flex-col">
            <Topbar />
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-6xl mx-auto px-5 py-8">
                <PageTransition>{children}</PageTransition>
              </div>
            </main>
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}
