import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function Page() {
  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6 md:p-10 rtl"
      dir="rtl"
    >
      <div className="w-full max-w-sm">
        <ForgotPasswordForm />
      </div>
    </div>
  );
  
}
