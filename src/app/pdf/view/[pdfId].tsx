"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/components/lib/firebase";
import PDFViewer from "@/components/components/pdfs/pdfViewer";

export default function PdfViewerPage() {
  const params = useParams();
  const pdfId = params?.pdfId as string;

  const [pdf, setPdf] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pdfId) return;

    async function fetchPdf() {
      try {
        const docRef = doc(db, "pdfs", pdfId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setPdf({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.error("No PDF found!");
        }
      } catch (err) {
        console.error("Error fetching PDF:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPdf();
  }, [pdfId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!pdf) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 text-lg">❌ PDF not found.</p>
      </div>
    );
  }

  return <PDFViewer pdf={pdf} />;
}
