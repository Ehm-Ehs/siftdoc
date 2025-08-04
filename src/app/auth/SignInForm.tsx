"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/components/store/useAuthStore";
import { FcGoogle } from "react-icons/fc";
import { toast } from "react-toastify";

// ✅ Validation schema
const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type AuthFormData = z.infer<typeof authSchema>;

export function SignInForm() {
  const { login, signup, signInWithGoogle } = useAuthStore(); // ✅ Zustand auth actions
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  const onSubmit = async (data: AuthFormData) => {
    setSubmitting(true);
    try {
      if (flow === "signIn") {
        await login(data.email, data.password);
        toast.success("Signed in successfully!");
      } else {
        await signup(data.email, data.password, data.email.split("@")[0]);
        toast.success("Account created successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      {/* ✅ Main Email/Password Form */}
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        {/* Email */}
        <div>
          <input
            className="auth-input-field"
            type="email"
            placeholder="Email"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <input
            className="auth-input-field"
            type="password"
            placeholder="Password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button className="auth-button" type="submit" disabled={submitting}>
          {submitting
            ? "Processing..."
            : flow === "signIn"
            ? "Sign in"
            : "Sign up"}
        </button>

        {/* Switch between Sign In / Sign Up */}
        <div className="text-center text-sm text-gray-600">
          {flow === "signIn" ? (
            <>
              Don’t have an account?{" "}
              <button
                type="button"
                className="text-blue-600 hover:underline"
                onClick={() => setFlow("signUp")}
              >
                Sign up instead
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="text-blue-600 hover:underline"
                onClick={() => setFlow("signIn")}
              >
                Sign in instead
              </button>
            </>
          )}
        </div>
      </form>

      {/* Divider */}
      <div className="flex items-center justify-center my-4">
        <hr className="flex-grow border-gray-300" />
        <span className="mx-3 text-gray-500">or</span>
        <hr className="flex-grow border-gray-300" />
      </div>

      {/* ✅ Google Sign-In Button */}
      <button
        className="auth-button flex items-center justify-center gap-2 bg-white text-gray-700 border hover:bg-gray-50"
        onClick={async () => {
          try {
            await signInWithGoogle();
            toast.success("Signed in with Google!");
          } catch (err: any) {
            toast.error(err.message || "Google Sign-In failed");
          }
        }}
      >
        <FcGoogle size={20} />
        Continue with Google
      </button>
    </div>
  );
}
