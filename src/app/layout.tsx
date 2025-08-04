"use client";

import { useEffect } from "react";
import "./global.css";
import { initAuthListener } from "@/components/store/authListener";
import { ToastContainer } from "react-toastify";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    initAuthListener(); // ✅ Start Firebase listener when the app mounts
  }, []);

  return (
    <html lang="en">
      <body>{children}</body>
      <ToastContainer position="top-center" autoClose={3000} />
    </html>
  );
}
