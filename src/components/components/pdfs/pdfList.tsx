"use client";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import Link from "next/link";
import { db } from "@/components/lib/firebase";

interface PdfItem {
  id: string;
  title: string;
  url: string;
}

export default function PDFList() {
  const [pdfs, setPdfs] = useState<PdfItem[]>([]);

  useEffect(() => {
    const q = query(collection(db, "pdfs"), orderBy("uploadedAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs: PdfItem[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PdfItem[];
      setPdfs(docs);
    });
    return () => unsub();
  }, []);

  return (
    <div className="bg-white p-4 rounded shadow-md">
      <h2 className="text-lg font-semibold mb-2">Uploaded PDFs</h2>
      <ul className="space-y-2">
        {pdfs.map((pdf) => (
          <li key={pdf.id} className="flex justify-between items-center">
            <span>{pdf.title}</span>
            <Link
              href={`/viewer/${pdf.id}`}
              className="text-blue-600 hover:underline"
            >
              View
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
