import { useState, useRef, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { Document, Page, pdfjs } from "react-pdf";
import { HighlightPanel } from "./HighlightPanel";
import { FlashcardPanel } from "./FlashcardPanel";
import { QuizPanel } from "./QuizPanel";
import { useAuthStore } from "../store/useAuthStore";
import { toast } from "react-toastify";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

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

interface Highlight {
  id: string;
  text: string;
  page: number;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  color: string;
  note?: string;
  createdAt: Date;
}

interface PdfViewerProps {
  pdf: PdfDocument;
}

export function PdfViewer({ pdf }: PdfViewerProps) {
  const currentUser = useAuthStore((state) => state.currentUser);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [activePanel, setActivePanel] = useState<
    "highlights" | "flashcards" | "quiz"
  >("highlights");
  const [selectedText, setSelectedText] = useState<string>("");
  const [isSelecting, setIsSelecting] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  const pageRef = useRef<HTMLDivElement>(null);

  // Load highlights
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "highlights"),
      where("pdfId", "==", pdf.id),
      where("userId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const highlightList: Highlight[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        highlightList.push({
          id: doc.id,
          text: data.text,
          page: data.page,
          position: data.position,
          color: data.color,
          note: data.note,
          createdAt: data.createdAt.toDate(),
        });
      });
      setHighlights(highlightList);
    });

    return () => unsubscribe();
  }, [pdf.id, currentUser]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
      setIsSelecting(true);
    }
  };

  const handleCreateHighlight = async (color: string = "#ffff00") => {
    if (!selectedText || !currentUser) return;

    try {
      await addDoc(collection(db, "highlights"), {
        pdfId: pdf.id,
        userId: currentUser.uid,
        text: selectedText,
        page: pageNumber,
        position: {
          x: 0,
          y: 0,
          width: 100,
          height: 20,
        },
        color,
        createdAt: Timestamp.now(),
      });

      toast.success("Highlight created!");
      setSelectedText("");
      setIsSelecting(false);
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      toast.error("Failed to create highlight");
    }
  };

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(handleTextSelection, 10);
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  return (
    <div className="flex h-full">
      {/* PDF Viewer */}
      <div className="flex-1 flex flex-col bg-gray-100">
        {/* Controls */}
        <div className="bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-gray-900">{pdf.title}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                disabled={pageNumber <= 1}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {pageNumber} of {numPages}
              </span>
              <button
                onClick={() =>
                  setPageNumber(Math.min(numPages, pageNumber + 1))
                }
                disabled={pageNumber >= numPages}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded"
              >
                Next
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
              >
                -
              </button>
              <span className="text-sm text-gray-600">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale(Math.min(2, scale + 0.1))}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Text Selection Toolbar */}
        {isSelecting && selectedText && (
          <div className="bg-yellow-100 border-b p-2 flex items-center justify-between">
            <span className="text-sm text-gray-700">
              Selected: "{selectedText.substring(0, 50)}..."
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleCreateHighlight("#ffff00")}
                className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-black rounded text-sm"
              >
                Highlight Yellow
              </button>
              <button
                onClick={() => handleCreateHighlight("#90EE90")}
                className="px-3 py-1 bg-green-400 hover:bg-green-500 text-black rounded text-sm"
              >
                Highlight Green
              </button>
              <button
                onClick={() => handleCreateHighlight("#FFB6C1")}
                className="px-3 py-1 bg-pink-400 hover:bg-pink-500 text-black rounded text-sm"
              >
                Highlight Pink
              </button>
              <button
                onClick={() => {
                  setSelectedText("");
                  setIsSelecting(false);
                  window.getSelection()?.removeAllRanges();
                }}
                className="px-3 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* PDF Document */}
        <div className="flex-1 overflow-auto p-4">
          <div className="flex justify-center">
            <div ref={pageRef} className="relative">
              <Document
                file={pdf.url}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex justify-center items-center h-96">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={false}
                />
              </Document>

              {/* Render highlights for current page */}
              {highlights
                .filter((h) => h.page === pageNumber)
                .map((highlight) => (
                  <div
                    key={highlight.id}
                    className="absolute pointer-events-none opacity-30"
                    style={{
                      backgroundColor: highlight.color,
                      left: `${highlight.position.x}%`,
                      top: `${highlight.position.y}%`,
                      width: `${highlight.position.width}%`,
                      height: `${highlight.position.height}%`,
                    }}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Side Panel */}
      <div className="w-96 bg-white border-l flex flex-col">
        {/* Panel Tabs */}
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActivePanel("highlights")}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 ${
                activePanel === "highlights"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Highlights
            </button>
            <button
              onClick={() => setActivePanel("flashcards")}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 ${
                activePanel === "flashcards"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Flashcards
            </button>
            <button
              onClick={() => setActivePanel("quiz")}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 ${
                activePanel === "quiz"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Quiz
            </button>
          </div>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-auto">
          {activePanel === "highlights" && (
            <HighlightPanel
              pdf={pdf}
              currentPage={pageNumber}
              highlights={highlights}
            />
          )}
          {activePanel === "flashcards" && (
            <FlashcardPanel pdf={pdf} currentPage={pageNumber} />
          )}
          {activePanel === "quiz" && <QuizPanel pdf={pdf} />}
        </div>
      </div>
    </div>
  );
}
