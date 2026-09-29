import type { Metadata } from "next";
import "./globals.css";
import "./forge-ui.css";

export const metadata: Metadata = {
  title: "FORGE — Train your ability to choose what you do next",
  description: "Short, competitive challenges for focus, control, patience, persistence and consistency.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
