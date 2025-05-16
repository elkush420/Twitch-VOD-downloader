import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import AmplifyConfig from "../components/AmplifyConfig";

import { AuthProvider } from '../context/auth-context';
import NavBar from "../components/NavBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AmplifyConfig />
        <AuthProvider>
          <NavBar></NavBar>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
