import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex-1 w-full flex flex-col items-start gap-8 px-6 py-10 rtl">
      <div className="bg-accent text-lg p-4 rounded-md text-foreground border border-muted shadow-sm w-full max-w-2xl">
        <p className="text-muted-foreground mb-1">
          * هذه صفحة خاصة لا يمكن الوصول إليها إلا من قبل المستخدمين المصادق عليهم.
        </p>
        <p className="text-muted-foreground">
          * يمكنك استخدام هذه الصفحة لعرض معلومات خاصة بك أو تنفيذ إجراءات تتطلب تسجيل الدخول.
        </p>
      </div>

      <div className="w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-4 text-blue-800">الصفحات المتاحة:</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/home"
            className="bg-blue-100 text-blue-800 text-lg px-5 py-2 rounded-lg hover:bg-blue-200 transition"
            ></Link>
          <Link
            href="/employees"
            className="bg-blue-100 text-blue-800 text-lg px-5 py-2 rounded-lg hover:bg-blue-200 transition"
          >
            الموظفين
          </Link>
          <Link
            href="/payments/report"
            className="bg-blue-100 text-blue-800 text-lg px-5 py-2 rounded-lg hover:bg-blue-200 transition"
          >
            الرواتب
          </Link>
          <Link
            href="/promotions"
            className="bg-blue-100 text-blue-800 text-lg px-5 py-2 rounded-lg hover:bg-blue-200 transition"
          >
            الترقيات
          </Link>
        </div>
      </div>
    </div>
  );
}
