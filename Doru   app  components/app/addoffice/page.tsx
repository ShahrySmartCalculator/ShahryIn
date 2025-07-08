"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function OfficeForm() {
  const supabase = createClient();

  const [officeName, setOfficeName] = useState("");
  const [parentOfficeId, setParentOfficeId] = useState<string | null>(null);
  const [officeOptions, setOfficeOptions] = useState<{ id: string; name: string }[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [insertedOffice, setInsertedOffice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch current user and existing offices
  useEffect(() => {
    const fetchData = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setUserEmail(userData.user.email);
      }

      const { data: offices, error: officesError } = await supabase
        .from("offices")
        .select("id, name")
        .order("name", { ascending: true });

      if (!officesError && offices) {
        setOfficeOptions(offices);
      }
    };

    fetchData();
  }, []);

  const handleInsert = async () => {
    setInsertedOffice(null);
    setErrorMessage("");

    const payload: { name: string; parent_id?: string } = {
      name: officeName,
    };

    if (parentOfficeId) {
      payload.parent_id = parentOfficeId;
    }

    const { data, error } = await supabase
      .from("offices")
      .insert(payload)
      .select()
      .single();

    if (error) {
      setErrorMessage("❌ حدث خطأ أثناء حفظ المكتب.");
    } else {
      setInsertedOffice(data.name);
      setOfficeName("");
      setParentOfficeId(null);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4" dir="rtl">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg w-full max-w-md">
  
        {/* Title */}
        <h2 className="text-xl font-bold text-center text-blue-800 mb-6">
          إضافة مكتب جديد
        </h2>
  
        {/* Office Name */}
        <label htmlFor="office" className="block mb-2 text-sm font-medium text-gray-700">
          اسم المكتب:
        </label>
        <Input
          id="office"
          placeholder="مثال: مؤسسة الأمل التعليمية"
          value={officeName}
          onChange={(e) => setOfficeName(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 w-full mb-4 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
  
        {/* Parent Office Dropdown */}
        <label htmlFor="parentOffice" className="block mb-2 text-sm font-medium text-gray-700">
          المكتب الأم (اختياري):
        </label>
        <select
          id="parentOffice"
          value={parentOfficeId || ""}
          onChange={(e) => setParentOfficeId(e.target.value || null)}
          className="border border-gray-300 rounded px-3 py-2 w-full mb-6 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">بدون مكتب أم</option>
          {officeOptions.map((office) => (
            <option key={office.id} value={office.id}>
              {office.name}
            </option>
          ))}
        </select>
  
        {/* Save Button */}
        <Button
          onClick={handleInsert}
          disabled={!officeName}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          حفظ المكتب
        </Button>
  
        {/* Success Message */}
        {insertedOffice && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg text-sm space-y-1 text-center">
            <p>✅ تمت إضافة المكتب بنجاح</p>
            {userEmail && <p>📧 المستخدم: {userEmail}</p>}
            <p>🏢 المكتب: {insertedOffice}</p>
          </div>
        )}
  
        {/* Error Message */}
        {errorMessage && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm text-center">
            {errorMessage}
          </div>
        )}
  
        {/* Back to Home */}
        <div className="mt-4">
          <Link
            href="/home"
            className="block text-center bg-gray-100 hover:bg-gray-200 text-blue-600 font-medium px-4 py-2 rounded shadow-sm transition duration-200"
          >
            الرجوع إلى الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}  