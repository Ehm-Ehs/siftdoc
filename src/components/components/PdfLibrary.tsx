import { useState, useRef, useEffect } from "react";
import { storage, db } from "../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
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

interface PdfLibraryProps {
  onSelectPdf: (pdf: PdfDocument) => void;
}

export function PdfLibrary({ onSelectPdf }: PdfLibraryProps) {
  const currentUser = useAuthStore((state) => state.currentUser);
  const [pdfs, setPdfs] = useState<PdfDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "pdfs"),
      where("userId", "==", currentUser.uid),
      orderBy("uploadedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pdfList: PdfDocument[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        pdfList.push({
          id: doc.id,
          title: data.title,
          fileName: data.fileName,
          url: data.url,
          totalPages: data.totalPages,
          uploadedAt: data.uploadedAt.toDate(),
          chapters: data.chapters,
        });
      });
      setPdfs(pdfList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }

    if (!currentUser) {
      toast.error("You must be signed in to upload files");
      return;
    }

    setUploading(true);
    try {
      // Upload file to Firebase Storage
      const storageRef = ref(
        storage,
        `pdfs/${currentUser.uid}/${Date.now()}_${file.name}`
      );
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Save PDF metadata to Firestore
      await addDoc(collection(db, "pdfs"), {
        title: file.name.replace(".pdf", ""),
        fileName: file.name,
        url: downloadURL,
        totalPages: 1, // We'll update this when the PDF is loaded
        userId: currentUser.uid,
        uploadedAt: Timestamp.now(),
      });

      toast.success("PDF uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload PDF");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Your PDF Library</h1>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
            id="pdf-upload"
          />
          <label
            htmlFor="pdf-upload"
            className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer ${
              uploading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {uploading ? "Uploading..." : "Upload PDF"}
          </label>
        </div>
      </div>

      {pdfs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No PDFs uploaded yet
          </h3>
          <p className="text-gray-500 mb-4">
            Upload your first PDF to start highlighting and creating flashcards
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pdfs.map((pdf) => (
            <div
              key={pdf.id}
              onClick={() => onSelectPdf(pdf)}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer p-6 border"
            >
              <div className="flex items-center mb-4">
                <div className="text-red-500 mr-3">
                  <svg
                    className="w-8 h-8"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {pdf.title}
                  </h3>
                  <p className="text-sm text-gray-500">{pdf.fileName}</p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                <p>{pdf.totalPages} pages</p>
                <p>Uploaded {pdf.uploadedAt.toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
