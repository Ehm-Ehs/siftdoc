export default function GuestModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-md w-96">
        <h2 className="text-lg font-bold text-red-600 mb-2">
          Guest Mode Warning
        </h2>
        <p className="mb-4">
          If you refresh or leave this page, you’ll lose all your docs,
          highlights, and flashcards. Sign up to save your progress!
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Continue as Guest
          </button>
          <button
            onClick={() => {
              // TODO: navigate to signup page
              alert("Redirect to signup");
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
