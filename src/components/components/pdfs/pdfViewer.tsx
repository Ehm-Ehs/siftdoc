"use client";
import { useEffect, useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import { toast } from "react-toastify";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { useAuthStore } from "@/components/store/useAuthStore";
import { db } from "@/components/lib/firebase";
import GuestModal from "./guestModal";
import { HighlightPanel } from "../HighlightPanel";
import { FlashcardPanel } from "../FlashcardPanel";
import { QuizPanel } from "../QuizPanel";

export default function PDFViewer({ pdf }: { pdf: any }) {
  const currentUser = useAuthStore((state) => state.currentUser);

  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [activePanel, setActivePanel] = useState("highlights");
  const [guestModal, setGuestModal] = useState(false);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [guestHighlights, setGuestHighlights] = useState<any[]>([]);

  // 🔔 Warn guest on refresh
  useEffect(() => {
    if (!currentUser) {
      const warn = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        setGuestModal(true);
        e.returnValue = "";
      };
      window.addEventListener("beforeunload", warn);
      return () => window.removeEventListener("beforeunload", warn);
    }
  }, [currentUser]);

  // 📥 Fetch highlights for logged-in users
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "highlights"),
      where("pdfId", "==", pdf.id),
      where("userId", "==", currentUser.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      setHighlights(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [pdf.id, currentUser]);

  const handleCreateHighlight = async (text: string, color = "#ffff00") => {
    if (!text) return;

    if (currentUser) {
      await addDoc(collection(db, "highlights"), {
        pdfId: pdf.id,
        userId: currentUser.uid,
        text,
        page: pageNumber,
        position: { x: 0, y: 0, width: 100, height: 20 },
        color,
        createdAt: Timestamp.now(),
      });
    } else {
      setGuestHighlights((prev) => [
        ...prev,
        { id: Date.now().toString(), text, page: pageNumber, color },
      ]);
      toast.info("Highlight added (Guest Mode)");
    }
  };

  return (
    <div className="flex h-screen">
      {guestModal && <GuestModal onClose={() => setGuestModal(false)} />}
      {/* PDF Area */}
      <div className="flex-1 bg-gray-100 flex flex-col">
        <div className="flex justify-between p-4 bg-white border-b">
          <h2>{pdf.title}</h2>
          <div>
            <button
              onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
              disabled={pageNumber === 1}
            >
              Prev
            </button>
            <span>
              Page {pageNumber} of {numPages}
            </span>
            <button
              onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
              disabled={pageNumber === numPages}
            >
              Next
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <Document
            file={pdf.url}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          >
            <Page pageNumber={pageNumber} />
          </Document>
        </div>
      </div>

      {/* Side Panel */}
      <div className="w-96 bg-white border-l flex flex-col">
        <div className="flex">
          {["highlights", "flashcards", "quiz"].map((panel) => (
            <button
              key={panel}
              onClick={() => setActivePanel(panel)}
              className={`flex-1 px-4 py-2 ${
                activePanel === panel ? "border-b-2 border-blue-600" : ""
              }`}
            >
              {panel}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto">
          {/* {activePanel === "highlights" && (
            <HighlightPanel
              pdf={pdf}
              highlights={currentUser ? highlights : guestHighlights}
              onAddHighlight={handleCreateHighlight}
            />
          )}
          {activePanel === "flashcards" && <FlashcardPanel pdf={pdf} />} */}
          {activePanel === "quiz" && <QuizPanel pdf={pdf} />}
        </div>
      </div>
    </div>
  );
}
