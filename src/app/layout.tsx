import type { Metadata } from "next";
import localFont from "next/font/local";
import "@/styles/global/base.css";

const satoshi = localFont({
  src: "../../public/fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  weight: "300 900",
});

const sentient = localFont({
  src: [
    {
      path: "../../public/fonts/Sentient-Variable.woff2",
      style: "normal",
    },
    {
      path: "../../public/fonts/Sentient-VariableItalic.woff2",
      style: "italic",
    },
  ],
  variable: "--font-sentient",
  weight: "200 700",
});

export const metadata: Metadata = {
  title: "Vibe Template App",
  description: "App scaffolded from the Vibe Template.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${satoshi.variable} ${sentient.variable}`}>
      <body>{children}</body>
    </html>
  );
}
