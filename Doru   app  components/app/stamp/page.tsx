'use client';

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const BulkStampFeeForm = () => {
  const supabase = createClient();

  const [amount, setAmount] = useState<number>(2000);
  const [month, setMonth] = useState<number>(6); // Default: June
  const [labelText, setLabelText] = useState("رسم طابع"); // Default title
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const getDateRange = (year: number, month: number) => {
    const from = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
    return { from, to };
  };

  const handleApplyStampFee = async () => {
    setLoading(true);
    setMessage("");

    try {
      const year = new Date().getFullYear();
      const { from, to } = getDateRange(year, month);

      const { data: payments, error: fetchError } = await supabase
        .from("payments")
        .select("id")
        .gte("month", from)
        .lte("month", to);

      if (fetchError) throw fetchError;
      if (!payments?.length) throw new Error("لم يتم العثور على سجلات رواتب لهذا الشهر.");

      let insertCount = 0;

      for (const payment of payments) {
        const { data: existingEntry, error: checkError } = await supabase
          .from("payments_entries")
          .select("id")
          .eq("payment_id", payment.id)
          .eq("title", labelText)
          .eq("type", "debit")
          .maybeSingle();

        if (checkError) {
          console.error("خطأ أثناء التحقق:", checkError);
          continue;
        }

        if (!existingEntry) {
          const { error: insertError } = await supabase
            .from("payments_entries")
            .insert({
              payment_id: payment.id,
              title: labelText,
              type: "debit",
              amount,
            });

          if (insertError) {
            console.error("خطأ أثناء الإدخال:", insertError);
          } else {
            insertCount++;
          }
        }
      }

      setMessage(`✅ تمت إضافة الاستقطاع "${labelText}" لـ ${insertCount} موظف${insertCount !== 1 ? "ين" : ""}.`);
    } catch (err: any) {
      console.error("خطأ غير متوقع:", err);
      setMessage(`❌ ${err.message || "حدث خطأ أثناء التنفيذ."}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStampFee = async () => {
    setLoading(true);
    setMessage("");

    try {
      const year = new Date().getFullYear();
      const { from, to } = getDateRange(year, month);

      const { data: payments, error: fetchError } = await supabase
        .from("payments")
        .select("id")
        .gte("month", from)
        .lte("month", to);

      if (fetchError) throw fetchError;
      if (!payments?.length) throw new Error("لا توجد رواتب لهذا الشهر.");

      const paymentIds = payments.map(p => p.id);

      const { error: deleteError } = await supabase
        .from("payments_entries")
        .delete()
        .in("payment_id", paymentIds)
        .eq("title", labelText)
        .eq("type", "debit");

      if (deleteError) throw deleteError;

      setMessage(`✅ تم حذف "${labelText}" لهذا الشهر بنجاح.`);
    } catch (err: any) {
      console.error("خطأ في الحذف:", err);
      setMessage(`❌ ${err.message || "حدث خطأ أثناء الحذف."}`);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg w-full max-w-md">
  
        {/* Title */}
        <h2 className="text-xl font-bold text-center text-blue-800 mb-6">
          إضافة استقطاع لجميع الموظفين
        </h2>
  
        {/* Deduction Type */}
        <label htmlFor="title" className="block mb-2 text-sm font-medium">
          نوع الاستقطاع:
        </label>
        <select
          id="title"
          value={labelText}
          onChange={(e) => setLabelText(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 w-full mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="رسم طابع">رسم طابع</option>
          <option value="استقطاعات اخرى">استقطاعات اخرى</option>
        </select>
  
        {/* Amount Input */}
        <label htmlFor="amount" className="block mb-2 text-sm font-medium">
          قيمة المبلغ (دينار):
        </label>
        <input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="border border-gray-300 rounded px-3 py-2 w-full mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          min={0}
          placeholder="أدخل قيمة الاستقطاع"
        />
  
        {/* Month Selector */}
        <label htmlFor="month" className="block mb-2 text-sm font-medium">
          الشهر:
        </label>
        <select
          id="month"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="border border-gray-300 rounded px-3 py-2 w-full mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {[
            "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
            "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"
          ].map((name, idx) => (
            <option key={idx} value={idx + 1}>
              {idx + 1} - {name}
            </option>
          ))}
        </select>
  
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleApplyStampFee}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full"
            disabled={loading}
          >
            {loading ? "جاري التنفيذ..." : "تنفيذ"}
          </button>
  
          <button
            onClick={handleDeleteStampFee}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded w-full"
            disabled={loading}
          >
            {loading ? "..." : "حذف"}
          </button>
        </div>
  
        {/* Back to Home */}
        <div className="mt-4">
          <Link
            href="/home"
            className="block text-center bg-gray-100 hover:bg-gray-200 text-blue-600 font-medium px-4 py-2 rounded shadow-sm transition duration-200"
          >
            الرجوع إلى الصفحة الرئيسية
          </Link>
        </div>
  
        {/* Status Message */}
        {message && (
          <p className="mt-4 text-sm text-center text-gray-700">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}  
export default BulkStampFeeForm;
