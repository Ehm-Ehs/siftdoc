"use client";
import { useState } from "react";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { toast } from "react-toastify";
import { useAuthStore } from "@/components/store/useAuthStore";
import { db, storage } from "@/components/lib/firebase";

export default function UploadPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const currentUser = useAuthStore((state) => state.currentUser);

  const handleUpload = async () => {
    if (!file) return toast.error("Select a file first!");
    setLoading(true);

    try {
      // ✅ Upload to Firebase Storage
      const storageRef = ref(storage, `pdfs/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // ✅ Save metadata to Firestore
      await addDoc(collection(db, "pdfs"), {
        title: file.name,
        url,
        userId: currentUser ? currentUser.uid : null,
        uploadedAt: Timestamp.now(),
      });

      toast.success("PDF uploaded successfully!");
      setFile(null);
    } catch (err) {
      console.error(err);
      toast.error("Upload failed!");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-4 rounded shadow-md mb-4">
      <h2 className="text-lg font-semibold mb-2">Upload a PDF</h2>
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button
        onClick={handleUpload}
        disabled={loading}
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Uploading..." : "Upload PDF"}
      </button>
    </div>
  );
}
