import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
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

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  page: number;
  chapter?: string;
  difficulty: "easy" | "medium" | "hard";
  correctCount: number;
  incorrectCount: number;
  lastReviewed?: Date;
  createdAt: Date;
}

interface FlashcardPanelProps {
  pdf: PdfDocument;
  currentPage: number;
}

export function FlashcardPanel({ pdf, currentPage }: FlashcardPanelProps) {
  const currentUser = useAuthStore((state) => state.currentUser);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [filter, setFilter] = useState<"all" | "current" | "chapter">("all");
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFlashcard, setNewFlashcard] = useState({
    question: "",
    answer: "",
    difficulty: "medium" as "easy" | "medium" | "hard",
  });
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  // Load flashcards
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "flashcards"),
      where("pdfId", "==", pdf.id),
      where("userId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const flashcardList: Flashcard[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        flashcardList.push({
          id: doc.id,
          question: data.question,
          answer: data.answer,
          page: data.page,
          chapter: data.chapter,
          difficulty: data.difficulty,
          correctCount: data.correctCount,
          incorrectCount: data.incorrectCount,
          lastReviewed: data.lastReviewed?.toDate(),
          createdAt: data.createdAt.toDate(),
        });
      });
      setFlashcards(flashcardList);
    });

    return () => unsubscribe();
  }, [pdf.id, currentUser]);

  const getFilteredFlashcards = () => {
    switch (filter) {
      case "current":
        return flashcards.filter((f) => f.page === currentPage);
      case "chapter":
        return selectedChapter
          ? flashcards.filter((f) => f.chapter === selectedChapter)
          : flashcards;
      default:
        return flashcards;
    }
  };

  const filteredFlashcards = getFilteredFlashcards();

  const handleCreateFlashcard = async () => {
    if (!newFlashcard.question.trim() || !newFlashcard.answer.trim()) {
      toast.error("Please fill in both question and answer");
      return;
    }

    if (!currentUser) return;

    try {
      // Determine chapter based on current page
      let chapter = undefined;
      if (pdf.chapters) {
        const foundChapter = pdf.chapters.find(
          (ch) => currentPage >= ch.startPage && currentPage <= ch.endPage
        );
        if (foundChapter) {
          chapter = foundChapter.title;
        }
      }

      await addDoc(collection(db, "flashcards"), {
        pdfId: pdf.id,
        userId: currentUser.uid,
        question: newFlashcard.question,
        answer: newFlashcard.answer,
        page: currentPage,
        chapter,
        difficulty: newFlashcard.difficulty,
        correctCount: 0,
        incorrectCount: 0,
        createdAt: Timestamp.now(),
      });

      setNewFlashcard({ question: "", answer: "", difficulty: "medium" });
      setShowCreateForm(false);
      toast.success("Flashcard created!");
    } catch (error) {
      toast.error("Failed to create flashcard");
    }
  };

  const handleDeleteFlashcard = async (flashcardId: string) => {
    if (confirm("Are you sure you want to delete this flashcard?")) {
      try {
        await deleteDoc(doc(db, "flashcards", flashcardId));
        toast.success("Flashcard deleted!");
      } catch (error) {
        toast.error("Failed to delete flashcard");
      }
    }
  };

  const toggleFlip = (flashcardId: string) => {
    const newFlipped = new Set(flippedCards);
    if (newFlipped.has(flashcardId)) {
      newFlipped.delete(flashcardId);
    } else {
      newFlipped.add(flashcardId);
    }
    setFlippedCards(newFlipped);
  };

  const chapters = pdf.chapters || [];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">Flashcards</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="text-sm px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          + Create
        </button>
      </div>

      {/* Filter Controls */}
      <div className="mb-4 space-y-2">
        <select
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value as "all" | "current" | "chapter")
          }
          className="w-full text-sm border rounded px-2 py-1"
        >
          <option value="all">All Flashcards</option>
          <option value="current">Current Page</option>
          {chapters.length > 0 && <option value="chapter">By Chapter</option>}
        </select>

        {filter === "chapter" && chapters.length > 0 && (
          <select
            value={selectedChapter}
            onChange={(e) => setSelectedChapter(e.target.value)}
            className="w-full text-sm border rounded px-2 py-1"
          >
            <option value="">Select Chapter</option>
            {chapters.map((chapter) => (
              <option key={chapter.title} value={chapter.title}>
                {chapter.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="mb-4 p-3 border rounded-lg bg-gray-50">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Question
              </label>
              <textarea
                value={newFlashcard.question}
                onChange={(e) =>
                  setNewFlashcard({ ...newFlashcard, question: e.target.value })
                }
                className="w-full text-sm border rounded px-2 py-1 resize-none"
                rows={2}
                placeholder="Enter your question..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Answer
              </label>
              <textarea
                value={newFlashcard.answer}
                onChange={(e) =>
                  setNewFlashcard({ ...newFlashcard, answer: e.target.value })
                }
                className="w-full text-sm border rounded px-2 py-1 resize-none"
                rows={3}
                placeholder="Enter the answer..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                value={newFlashcard.difficulty}
                onChange={(e) =>
                  setNewFlashcard({
                    ...newFlashcard,
                    difficulty: e.target.value as "easy" | "medium" | "hard",
                  })
                }
                className="w-full text-sm border rounded px-2 py-1"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateFlashcard}
                className="flex-1 text-sm px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 text-sm px-3 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flashcards List */}
      {filteredFlashcards.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No flashcards yet</p>
          <p className="text-sm mt-1">
            Create flashcards from highlights or manually
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFlashcards.map((flashcard) => {
            const isFlipped = flippedCards.has(flashcard.id);
            return (
              <div
                key={flashcard.id}
                className="border rounded-lg bg-white shadow-sm"
              >
                <div
                  onClick={() => toggleFlip(flashcard.id)}
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          flashcard.difficulty === "easy"
                            ? "bg-green-100 text-green-700"
                            : flashcard.difficulty === "medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {flashcard.difficulty}
                      </span>
                      <span className="text-xs text-gray-500">
                        Page {flashcard.page}
                      </span>
                      {flashcard.chapter && (
                        <span className="text-xs text-gray-500">
                          • {flashcard.chapter}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFlashcard(flashcard.id);
                      }}
                      className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="min-h-[60px] flex items-center">
                    {isFlipped ? (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Answer:</p>
                        <p className="text-sm text-gray-800">
                          {flashcard.answer}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Question:</p>
                        <p className="text-sm text-gray-800">
                          {flashcard.question}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="text-center mt-3">
                    <span className="text-xs text-blue-600">
                      Click to {isFlipped ? "see question" : "reveal answer"}
                    </span>
                  </div>
                </div>

                {flashcard.correctCount > 0 || flashcard.incorrectCount > 0 ? (
                  <div className="px-4 pb-2 text-xs text-gray-500">
                    Stats: {flashcard.correctCount} correct,{" "}
                    {flashcard.incorrectCount} incorrect
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
