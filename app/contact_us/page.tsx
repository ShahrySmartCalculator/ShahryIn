"use client";

import { useState, useEffect } from "react";
import { Cairo, Amiri } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import OfficeFormModal from "@/components/OfficeFormModal";
import { isOfficeExpired } from '@/components/activation';

const cairo = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "700"], display: "swap" });
const amiri = Amiri({ subsets: ["arabic"], weight: ["400"], display: "swap" });
const fonts = { cairo: cairo.className, amiri: amiri.className };

function getDateRanges() {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(currentMonthStart.getTime() - 1);
  const format = (d: Date) => d.toISOString().split("T")[0];
  return {
    previousMonthStart: format(previousMonthStart),
    previousMonthEnd: format(previousMonthEnd),
    currentMonthStart: format(currentMonthStart),
  };
}

const fetcher = async (key: string) => {
  const supabase = createClient();
  const { previousMonthStart, previousMonthEnd } = getDateRanges();

  if (key === "dashboard") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: mainOffice } = await supabase
      .from("offices")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();
    if (!mainOffice) return null;

    const { data: subOffices } = await supabase
      .from("offices")
      .select("id")
      .eq("parent_id", mainOffice.id);

    const officeIds = [mainOffice.id, ...(subOffices?.map((o) => o.id) ?? [])];

    const { data: employees } = await supabase
      .from("employees")
      .select("id")
      .in("office_id", officeIds);
    const employeeIds = employees?.map((e) => e.id) ?? [];

    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .in("employee_id", employeeIds)
      .gte("month", previousMonthStart)
      .lte("month", previousMonthEnd);

    return payments ?? [];
  }
  return null;
};

export default function HomePage() {
  const [font, setFont] = useState<"cairo" | "amiri">("cairo");
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [officeName, setOfficeName] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState(0);
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [officeOptions, setOfficeOptions] = useState<any[]>([]);

  const images = ["/images/slide-1.PNG", "/images/slide-2.PNG", "/images/slide-3.PNG"];
  const { data: dashboardData } = useSWR("dashboard", fetcher, { refreshInterval: 10000 });

  useEffect(() => {
    const fetchInitialData = async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const u = userData?.user;
      if (u) {
        setUser(u);
        const { data: office } = await supabase
          .from("offices")
          .select("name, created_at, is_active")
          .eq("auth_user_id", u.id)
          .single();

        if (office) {
          setOfficeName(office.name);
          if (!office.is_active || isOfficeExpired(office.created_at)) {
            alert("⚠️ Please, contact 0787-0323-700 to re-activate your accessable office.");
            await supabase.auth.signOut();
            location.reload();
            return;
          }
        }
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    location.reload();
  };

  const handleNewOffice = async (newOffice: any) => {
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) throw new Error("User not found");

      const { data: existing } = await supabase
        .from("offices")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (existing) {
        alert("لا يمكنك إضافة أكثر من دائرة واحدة.");
        return;
      }

      const { error: insertError } = await supabase.from("offices").insert([
        { ...newOffice, auth_user_id: user.id },
      ]);

      if (insertError) {
        console.error("Insert failed:", insertError.message);
        alert("فشل في إضافة الدائرة: " + insertError.message);
        return;
      }

      setShowOfficeModal(false);

      const { data: insertedOffice, error: fetchError } = await supabase
        .from("offices")
        .select("name")
        .eq("auth_user_id", user.id)
        .single();

      if (fetchError || !insertedOffice) return;

      setOfficeName(insertedOffice.name);
    } catch (err) {
      console.error("Error in handleNewOffice:", err);
    }
  };

  return (
    <div className={`${fonts[font]} ${darkMode ? "dark" : ""}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={darkMode ? "dark" : "light"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rtl"
        >
          <div className="flex flex-col md:flex-row min-h-screen">
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="md:w-1/2 w-full p-6 md:p-10 bg-white dark:bg-gray-800 space-y-6 shadow-xl"
            >
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex gap-2">
                  {Object.keys(fonts).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFont(f as "cairo" | "amiri")}
                      className={`px-3 py-1 rounded border text-sm hover:scale-105 transition ${
                        font === f ? "bg-blue-600 text-white" : "border-gray-300 text-gray-600 dark:text-white"
                      }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="px-3 py-1 border rounded text-sm hover:scale-105"
                  >
                    {darkMode ? "☀️ Light" : "🌙 Dark"}
                  </button>
                  {user && (
                    <button
                      onClick={handleLogout}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                    >
                      تسجيل الخروج
                    </button>
                  )}
                </div>
              </div>

              <h1 className="text-3xl font-bold text-blue-800 dark:text-blue-400">📞 تواصل معنا</h1>

              <div className="space-y-2 mt-6">
                <div className="flex items-start gap-2">
                  <span className="text-xl">📍</span>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white">العنوان</h4>
                    <p className="text-gray-600 dark:text-gray-300">العراق - النجف الأشرف</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-xl">✉️</span>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white">البريد الإلكتروني</h4>
                    <p className="text-gray-600 dark:text-gray-300">huseinaltae@gmail.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-xl">📞</span>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white">رقم الهاتف</h4>
                    <p className="text-gray-600 dark:text-gray-300">0787-0323-700</p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/home"
                  className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow transition"
                >
                  ⬅️ العودة إلى الصفحة الرئيسية
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="relative w-full md:w-1/2 h-64 md:h-auto min-h-[256px] overflow-hidden bg-gray-200 dark:bg-gray-700"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={images[currentImage]}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={images[currentImage]}
                    alt={`Slide ${currentImage + 1}`}
                    fill
                    className="object-cover"
                    sizes="100vw"
                    priority={currentImage === 0}
                  />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      <OfficeFormModal
        open={showOfficeModal}
        onClose={() => setShowOfficeModal(false)}
        officeOptions={officeOptions}
        onOfficeAdded={handleNewOffice}
        initialName={officeName || ""}
        initialParentId={null}
      />
    </div>
  );
}