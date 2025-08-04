"use client";

import { useAuthStore } from "@/components/store/useAuthStore";
import { useState } from "react";
import { SignInForm } from "./auth/SignInForm";
import { PdfViewer } from "@/components/components/PdfViewer";
import { PdfLibrary } from "@/components/components/PdfLibrary";
import { ProfileMenu } from "./auth/profile";
import UploadPDF from "@/components/components/pdfs/upload";
import PDFList from "@/components/components/pdfs/pdfList";

interface PdfDocument {
  id: string;
  title: string;
  fileName: string;
  url: string;
  totalPages: number;
  uploadedAt: Date;
  chapters?: Array<{
    title: string;
    startPage: number;
    endPage: number;
  }>;
}

export default function HomePage() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const [selectedPdf, setSelectedPdf] = useState<PdfDocument | null>(null);

  // ✅ If no user is logged in → show Sign In
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md mx-auto p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-blue-600 mb-4">SiftDocs </h1>
            <p className="text-xl text-gray-600">
              Highlight, create flashcards, and quiz yourself from PDFs
            </p>
          </div>
          <SignInForm />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-blue-600">SiftDocs</h2>
          {selectedPdf && (
            <button
              onClick={() => setSelectedPdf(null)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              ← Back to Library
            </button>
          )}
        </div>
        <ProfileMenu />
      </header>

      <main className="flex-1">
        <h1 className="text-3xl font-bold text-blue-700 text-center">
          PDF Study Assistant
        </h1>
        <p className="text-gray-600 text-center">
          Upload PDFs, highlight important text, create flashcards & quiz
          yourself!
        </p>

        {/* Upload Section */}
        <UploadPDF />

        {/* List of PDFs */}
        <PDFList />
      </main>
    </div>
  );
}
