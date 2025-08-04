import { useState } from "react";
import { db } from "../lib/firebase";
import {
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  Timestamp,
} from "firebase/firestore";
import { useAuthStore } from "../store/useAuthStore";
import { toast } from "react-toastify";

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

interface HighlightPanelProps {
  pdf: PdfDocument;
  currentPage: number;
  highlights: Highlight[];
}

export function HighlightPanel({
  pdf,
  currentPage,
  highlights,
}: HighlightPanelProps) {
  const currentUser = useAuthStore((state) => state.currentUser);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [filter, setFilter] = useState<"all" | "current">("all");

  const filteredHighlights =
    filter === "current"
      ? highlights.filter((h) => h.page === currentPage)
      : highlights;

  const handleSaveNote = async (highlightId: string) => {
    try {
      await updateDoc(doc(db, "highlights", highlightId), {
        note: noteText.trim() || null,
      });
      setEditingNote(null);
      setNoteText("");
      toast.success("Note saved!");
    } catch (error) {
      toast.error("Failed to save note");
    }
  };

  const handleDeleteHighlight = async (highlightId: string) => {
    if (confirm("Are you sure you want to delete this highlight?")) {
      try {
        await deleteDoc(doc(db, "highlights", highlightId));
        toast.success("Highlight deleted!");
      } catch (error) {
        toast.error("Failed to delete highlight");
      }
    }
  };

  const handleGenerateFlashcard = async (highlight: Highlight) => {
    if (!currentUser) return;

    try {
      // Determine chapter based on current page
      let chapter = undefined;
      if (pdf.chapters) {
        const foundChapter = pdf.chapters.find(
          (ch) => highlight.page >= ch.startPage && highlight.page <= ch.endPage
        );
        if (foundChapter) {
          chapter = foundChapter.title;
        }
      }

      // Create a simple flashcard from the highlight
      const question = `What is the significance of: "${highlight.text.substring(
        0,
        100
      )}..."?`;
      const answer =
        highlight.text + (highlight.note ? `\n\nNote: ${highlight.note}` : "");

      await addDoc(collection(db, "flashcards"), {
        pdfId: pdf.id,
        userId: currentUser.uid,
        highlightId: highlight.id,
        question,
        answer,
        page: highlight.page,
        chapter,
        difficulty: "medium",
        correctCount: 0,
        incorrectCount: 0,
        createdAt: Timestamp.now(),
      });

      toast.success("Flashcard generated!");
    } catch (error) {
      toast.error("Failed to generate flashcard");
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">Highlights</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as "all" | "current")}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="all">All Pages</option>
          <option value="current">Current Page</option>
        </select>
      </div>

      {filteredHighlights.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No highlights yet</p>
          <p className="text-sm mt-1">
            Select text in the PDF to create highlights
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHighlights.map((highlight) => (
            <div
              key={highlight.id}
              className="border rounded-lg p-3 bg-gray-50"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: highlight.color }}
                  />
                  <span className="text-xs text-gray-500">
                    Page {highlight.page}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleGenerateFlashcard(highlight)}
                    className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                    title="Generate flashcard"
                  >
                    📚
                  </button>
                  <button
                    onClick={() => handleDeleteHighlight(highlight.id)}
                    className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded"
                    title="Delete highlight"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-800 mb-2 leading-relaxed">
                "{highlight.text}"
              </p>

              {editingNote === highlight.id ? (
                <div className="space-y-2">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note..."
                    className="w-full text-sm border rounded px-2 py-1 resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveNote(highlight.id)}
                      className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingNote(null);
                        setNoteText("");
                      }}
                      className="text-xs px-3 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {highlight.note ? (
                    <p className="text-sm text-gray-600 italic mb-2">
                      Note: {highlight.note}
                    </p>
                  ) : null}
                  <button
                    onClick={() => {
                      setEditingNote(highlight.id);
                      setNoteText(highlight.note || "");
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {highlight.note ? "Edit note" : "Add note"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
