import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
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

interface QuizSession {
  id: string;
  flashcardIds: string[];
  currentIndex: number;
  score: number;
  totalQuestions: number;
  isCompleted: boolean;
}

interface QuizPanelProps {
  pdf: PdfDocument;
}

export function QuizPanel({ pdf }: QuizPanelProps) {
  const currentUser = useAuthStore((state) => state.currentUser);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [activeSession, setActiveSession] = useState<QuizSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Flashcard | null>(
    null
  );
  const [quizType, setQuizType] = useState<"all" | "chapter" | "page">("all");
  const [selectedFilter, setSelectedFilter] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");

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

  // Update current question when session changes
  useEffect(() => {
    if (activeSession && !activeSession.isCompleted) {
      const flashcardId =
        activeSession.flashcardIds[activeSession.currentIndex];
      const flashcard = flashcards.find((f) => f.id === flashcardId);
      setCurrentQuestion(flashcard || null);
    } else {
      setCurrentQuestion(null);
    }
  }, [activeSession, flashcards]);

  const chapters = pdf.chapters || [];

  const startQuiz = async () => {
    if (flashcards.length === 0) {
      toast.error("No flashcards available for quiz");
      return;
    }

    // Filter flashcards based on quiz type
    let filteredFlashcards = flashcards;
    if (quizType === "chapter" && selectedFilter) {
      filteredFlashcards = flashcards.filter(
        (f) => f.chapter === selectedFilter
      );
    } else if (quizType === "page" && selectedFilter) {
      const page = parseInt(selectedFilter);
      filteredFlashcards = flashcards.filter((f) => f.page === page);
    }

    if (filteredFlashcards.length === 0) {
      toast.error("No flashcards found for this quiz");
      return;
    }

    // Shuffle flashcards
    const shuffled = [...filteredFlashcards].sort(() => Math.random() - 0.5);
    const flashcardIds = shuffled.map((f) => f.id);

    const session: QuizSession = {
      id: Date.now().toString(),
      flashcardIds,
      currentIndex: 0,
      score: 0,
      totalQuestions: flashcardIds.length,
      isCompleted: false,
    };

    setActiveSession(session);
    setShowAnswer(false);
    setUserAnswer("");
    toast.success("Quiz started!");
  };

  const handleAnswer = async (correct: boolean) => {
    if (!activeSession || !currentQuestion) return;

    try {
      // Update flashcard stats
      await updateDoc(doc(db, "flashcards", currentQuestion.id), {
        correctCount: correct
          ? currentQuestion.correctCount + 1
          : currentQuestion.correctCount,
        incorrectCount: correct
          ? currentQuestion.incorrectCount
          : currentQuestion.incorrectCount + 1,
        lastReviewed: Timestamp.now(),
      });

      // Update session
      const newIndex = activeSession.currentIndex + 1;
      const newScore = correct ? activeSession.score + 1 : activeSession.score;
      const isCompleted = newIndex >= activeSession.totalQuestions;

      const updatedSession = {
        ...activeSession,
        currentIndex: newIndex,
        score: newScore,
        isCompleted,
      };

      setActiveSession(updatedSession);

      if (isCompleted) {
        toast.success(
          `Quiz completed! Score: ${newScore}/${activeSession.totalQuestions}`
        );
      } else {
        setShowAnswer(false);
        setUserAnswer("");
      }
    } catch (error) {
      toast.error("Failed to submit answer");
    }
  };

  const getFilteredFlashcardCount = () => {
    switch (quizType) {
      case "chapter":
        return selectedFilter
          ? flashcards.filter((f) => f.chapter === selectedFilter).length
          : 0;
      case "page":
        return selectedFilter
          ? flashcards.filter((f) => f.page === parseInt(selectedFilter)).length
          : 0;
      default:
        return flashcards.length;
    }
  };

  // if (activeSession) {
  //   if (activeSession.isCompleted) {
  //     return (
  //       <div className="p-4">
  //         <div className="text-center py-8">
  //           <h3 className="text-lg font-semibold text-gray-900 mb-4">
  //             Quiz Completed!
  //           </h3>
  //           <div className="text-3xl font-bold text-blue-600 mb-2">
  //             {activeSession.score}/{activeSession.totalQuestions}
  //           </div>
  //           <p className="text-gray-600 mb-4">
  //             {Math.round(
  //               (activeSession.score / activeSession.totalQuestions) * 100
  //             )}
  //             % correct
  //           </p>
  //           <button
  //             onClick={() => setActiveSession(null)}
  //             className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
  //           >
  //             Start New Quiz
  //           </button>
  //         </div>
  //       </div>
  //     );
  //   }

  //   if (currentQuestion) {
  //     return (
  //       <div className="p-4">
  //         <div className="mb-4">
  //           <div className="flex justify-between items-center mb-2">
  //             <h3 className="font-semibold text-gray-900">Quiz in Progress</h3>
  //             <button
  //               onClick={() => {
  //                 if (confirm("Are you sure you want to quit the quiz?")) {
  //                   setActiveSession(null);
  //                 }
  //               }}
  //               className="text-sm text-red-600 hover:text-red-800"
  //             >
  //               Quit Quiz
  //             </button>
  //           </div>
  //           <div className="text-sm text-gray-600">
  //             Question {activeSession.currentIndex + 1} of{" "}
  //             {activeSession.totalQuestions} • Score: {activeSession.score}/
  //             {activeSession.currentIndex}
  //           </div>
  //           <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
  //             <div
  //               className="bg-blue-600 h-2 rounded-full transition-all"
  //               style={{
  //                 width: `${
  //                   (activeSession.currentIndex /
  //                     activeSession.totalQuestions) *
  //                   100
  //                 }%`,
  //               }}
  //             />
  //           </div>
  //         </div>

  //         <div className="border rounded-lg p-4 bg-white">
  //           <div className="mb-4">
  //             <p className="text-sm text-gray-500 mb-2">Question:</p>
  //             <p className="text-gray-900">{currentQuestion.question}</p>
  //           </div>

  //           {!showAnswer ? (
  //             <div className="space-y-3">
  //               <div>
  //                 <label className="block text-sm font-medium text-gray-700 mb-2">
  //                   Your Answer:
  //                 </label>
  //                 <textarea
  //                   value={userAnswer}
  //                   onChange={(e) => setUserAnswer(e.target.value)}
  //                   className="w-full border rounded px-3 py-2 resize-none"
  //                   rows={3}
  //                   placeholder="Type your answer here..."
  //                 />
  //               </div>
  //               <button
  //                 onClick={() => setShowAnswer(true)}
  //                 className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
  //               >
  //                 Reveal Answer
  //               </button>
  //             </div>
  //           ) : (
  //             <div className="space-y-4">
  //               <div>
  //                 <p className="text-sm text-gray-500 mb-2">Correct Answer:</p>
  //                 <div className="p-3 bg-gray-50 rounded border">
  //                   <p className="text-gray-900">{currentQuestion.answer}</p>
  //                 </div>
  //               </div>

  //               {userAnswer && (
  //                 <div>
  //                   <p className="text-sm text-gray-500 mb-2">Your Answer:</p>
  //                   <div className="p-3 bg-blue-50 rounded border">
  //                     <p className="text-gray-900">{userAnswer}</p>
  //                   </div>
  //                 </div>
  //               )}

  //               <div className="text-center">
  //                 <p className="text-sm text-gray-600 mb-3">
  //                   Did you get it right?
  //                 </p>
  //                 <div className="flex gap-3">
  //                   <button
  //                     onClick={() => handleAnswer(false)}
  //                     className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
  //                   >
  //                     Incorrect
  //                   </button>
  //                   <button
  //                     onClick={() => handleAnswer(true)}
  //                     className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
  //                   >
  //                     Correct
  //                   </button>
  //                 </div>
  //               </div>
  //             </div>
  //           )}
  //         </div>
  //       </div>
  //     );
  //   }
  // }

  return (
    <div className="p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Start a Quiz</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quiz Type
          </label>
          <select
            value={quizType}
            onChange={(e) => {
              setQuizType(e.target.value as "all" | "chapter" | "page");
              setSelectedFilter("");
            }}
            className="w-full border rounded px-3 py-2"
          >
            <option value="all">All Flashcards</option>
            {chapters.length > 0 && <option value="chapter">By Chapter</option>}
            <option value="page">By Page</option>
          </select>
        </div>

        {quizType === "chapter" && chapters.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Chapter
            </label>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Choose a chapter</option>
              {chapters.map((chapter) => (
                <option key={chapter.title} value={chapter.title}>
                  {chapter.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {quizType === "page" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Page Number
            </label>
            <input
              type="number"
              min="1"
              max={pdf.totalPages || 1}
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Enter page number"
            />
          </div>
        )}

        <div className="text-sm text-gray-600">
          Available flashcards: {getFilteredFlashcardCount()}
        </div>

        <button
          onClick={startQuiz}
          disabled={
            getFilteredFlashcardCount() === 0 ||
            (quizType !== "all" && !selectedFilter)
          }
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded"
        >
          Start Quiz
        </button>
      </div>

      {flashcards.length === 0 && (
        <div className="mt-6 text-center py-4 text-gray-500">
          <p>No flashcards available</p>
          <p className="text-sm mt-1">
            Create some flashcards first to start quizzing
          </p>
        </div>
      )}
    </div>
  );
}
