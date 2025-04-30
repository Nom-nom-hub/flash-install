import { Metadata } from "next";
import Image from "next/image";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flash Install for Vercel",
  description: "Accelerate your Vercel builds with Flash Install for faster dependency installation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-black text-white">
        <div className="flex-1">
          {children}
        </div>
        <footer className="mt-12 flex items-center justify-center w-full h-24 border-t border-gray-800">
          <a
            className="flex items-center justify-center text-gray-400 hover:text-yellow-400 transition-colors"
            href="https://github.com/flash-install-cli/flash-install"
            target="_blank"
            rel="noopener noreferrer"
          >
            Powered by Flash Install
          </a>
        </footer>
      </body>
    </html>
  );
}
