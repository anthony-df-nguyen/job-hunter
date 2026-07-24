import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

const themeInitScript = `
(function () {
  try {
    var dark = localStorage.getItem("theme") === "dark";
    if (dark) {
      document.documentElement.classList.add("dark");
    }
    document.documentElement.setAttribute("data-ag-theme-mode", dark ? "dark" : "light");
  } catch (e) {}
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Job Hunter",
  description: "Local job search scraper and tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-black">
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <nav className="mx-auto flex  items-center gap-6 px-6 py-3 text-sm font-medium">
            <span className="uppercase font-extrabold  text-lg text-sky-500 dark:text-zinc-100">Job Hunter</span>
            <Link
              href="/"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Jobs
            </Link>
            <Link
              href="/settings"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Settings
            </Link>
            <ThemeToggle />
          </nav>
        </header>
        <main className="mx-auto w-full flex-1 px-6 py-6 ">{children}</main>
      </body>
    </html>
  );
}
