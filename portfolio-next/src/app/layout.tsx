import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Eco² Portfolio | Backend & Infrastructure",
  description:
    "Multi-LLM Agent 기반 비동기 분산 클러스터 - 24-Node Kubernetes, LangGraph Pipeline, Event-Driven Architecture",
  keywords: [
    "Kubernetes",
    "LangGraph",
    "FastAPI",
    "LLM",
    "Distributed Systems",
    "Backend",
  ],
  authors: [{ name: "Jihwan Ryu", url: "https://github.com/mangowhoiscloud" }],
  openGraph: {
    title: "Eco² Portfolio",
    description: "Multi-LLM Agent 기반 비동기 분산 클러스터",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
