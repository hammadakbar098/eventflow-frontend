import type { Metadata } from "next";
import { QueryProvider } from "@/lib/query/query-provider";
import { APP_NAME } from "@/constants/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Make room for the unforgettable`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Bring people together with EventFlow. Discover inspiring events and create experiences worth showing up for.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
