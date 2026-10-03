import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import "./forge-ui.css";
import ForgeSyncBridge from "../components/forge-sync-bridge";

export const metadata: Metadata = {
  title: "FORGE — Train your ability to choose what you do next",
  description:
    "Short, competitive challenges for focus, control, patience, persistence and consistency.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <a className="skip-link" href="#main-content">Skip to main content</a>
          <div id="main-content">{children}</div>
          <ForgeSyncBridge />
        </body>
      </html>
    </ClerkProvider>
  );
}
