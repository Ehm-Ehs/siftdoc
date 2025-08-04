"use client";

import { useAuthStore } from "@/components/store/useAuthStore";
import { useState, useRef, useEffect } from "react";

import { FiUser } from "react-icons/fi"; // user icon
import { MdLogout } from "react-icons/md"; // logout icon
import { toast } from "react-toastify";

export function ProfileMenu() {
  const { currentUser, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // ✅ Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!currentUser) return null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Icon Button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition"
      >
        {currentUser.photoURL ? (
          <img
            src={currentUser.photoURL}
            alt="Profile"
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <FiUser size={20} className="text-gray-600" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-50">
          <div className="px-4 py-2 border-b border-gray-200">
            <p className="text-sm font-semibold">
              {currentUser.displayName || "User"}
            </p>
            <p className="text-xs text-gray-500">{currentUser.email}</p>
          </div>

          <button
            onClick={async () => {
              try {
                await logout();
                toast.success("Signed out successfully");
                setOpen(false);
              } catch (err: any) {
                toast.error(err.message || "Error signing out");
              }
            }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <MdLogout size={16} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
