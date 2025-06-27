"use client";

import { useState, useEffect } from "react";
import { Cairo, Amiri } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";

const cairo = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "700"], display: "swap" });
const amiri = Amiri({ subsets: ["arabic"], weight: ["400"], display: "swap" });
const fonts = { cairo: cairo.className, amiri: amiri.className };

function getDateRanges() {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(currentMonthStart.getTime() - 1);
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  return {
    previousMonthStart: formatDate(previousMonthStart),
    previousMonthEnd: formatDate(previousMonthEnd),
    currentMonthStart: formatDate(currentMonthStart),
  };
}

const fetcher = async (key: string) => {
  const supabase = createClient();
  const { previousMonthStart, previousMonthEnd, currentMonthStart } = getDateRanges();

  if (key === "dashboard") {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: offices } = await supabase
      .from("offices")
      .select("id")
      .eq("auth_user_id", user?.id);

    const officeIds = offices?.map((o) => o.id) ?? [];
    let employeeCount = 0;
    let totalSalaryPrev = 0;
    let totalSalaryCurrent = 0;

    if (officeIds.length > 0) {
      const { data: employees } = await supabase
        .from("employees")
        .select("id")
        .in("office_id", officeIds);

      employeeCount = employees?.length ?? 0;

      const fetchPayments = async (from: string, to?: string) => {
        let query = supabase
          .from("payments")
          .select("salary, certificate_percentage, risk_percentage, retire_percentage, trans_pay, net_credits, net_debits")
          .in("employee_id", employees.map((e) => e.id));

        if (to) query = query.gte("month", from).lte("month", to);
        else query = query.gte("month", from);

        const { data } = await query;
        return data ?? [];
      };

      const prevPayments = await fetchPayments(previousMonthStart, previousMonthEnd);
      const currPayments = await fetchPayments(currentMonthStart);

      const calcNet = (payments: any[]) =>
        payments.reduce((sum, p) => {
          const s = p.salary || 0;
          const cert = (s * (p.certificate_percentage || 0)) / 100;
          const risk = (s * (p.risk_percentage || 0)) / 100;
          const retire = (s * (p.retire_percentage || 0)) / 100;
          const credits = s + cert + risk + (p.trans_pay || 0) + (p.net_credits || 0);
          const debits = retire + (p.net_debits || 0);
          return sum + (credits - debits);
        }, 0);

      totalSalaryPrev = calcNet(prevPayments);
      totalSalaryCurrent = calcNet(currPayments);
    }

    return { employeeCount, totalSalaryPrev, totalSalaryCurrent };
  }

  if (key === "logins") {
    const { data } = await supabase
      .from("user_logs")
      .select("email, login_time")
      .order("login_time", { ascending: false })
      .limit(5);

    return data || [];
  }

  return null;
};

export default function HomePage() {
  const [font, setFont] = useState<"cairo" | "amiri">("cairo");
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [currentImage, setCurrentImage] = useState(0);

  const { data: dashboardData } = useSWR("dashboard", fetcher, { refreshInterval: 10000 });
  const { data: recentLogins } = useSWR("logins", fetcher, { refreshInterval: 15000 });

  const images = ["/images/slide-1.PNG", "/images/slide-2.PNG", "/images/slide-3.PNG"];

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data?.user) setUser(data.user);
    };
    fetchUser();
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
          <div className="flex flex-col md:flex-row w-full min-h-screen items-stretch">
            {/* Left side content */}
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="md:w-1/2 w-full flex flex-col justify-start p-4 md:p-8 space-y-4 md:space-y-6 bg-white dark:bg-gray-800 shadow-xl"
            >
              <div className="flex justify-between w-full flex-wrap gap-2">
                <div className="flex gap-3">
                  {Object.keys(fonts).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFont(f as "cairo" | "amiri")}
                      className={`px-3 py-1 rounded border hover:scale-105 transition-transform duration-200 ${
                        font === f
                          ? "bg-blue-600 text-white"
                          : "text-gray-600 border-gray-300 dark:text-gray-200"
                      }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="px-3 py-1 border rounded text-sm hover:scale-105 transition-transform"
                  >
                    {darkMode ? "☀️ Light" : "🌙 Dark"}
                  </button>
                  {user && (
                    <button
                      onClick={handleLogout}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      تسجيل الخروج
                    </button>
                  )}
                </div>
              </div>
  
              <motion.h1 className="text-3xl md:text-4xl font-bold text-blue-800 dark:text-blue-400">
                مرحبا بك في نظام الرواتب
              </motion.h1>
              <motion.p className="text-base md:text-lg text-gray-700 dark:text-gray-300">
                تطبيقنا يسهل عليك إدارة الرواتب والمدفوعات بسلاسة وأمان. كل ما تحتاجه في مكان واحد.
              </motion.p>
              <ul className="text-sm md:text-base text-gray-600 dark:text-gray-400 space-y-1">
                <li>✔️ إدارة الموظفين بسهولة</li>
                <li>✔️ حسابات دقيقة وسريعة للرواتب</li>
                <li>✔️ تجربة استخدام آمنة </li>
              </ul>
  
              {user && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  مرحباً، {user.email}
                </div>
              )}
  
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-white p-4 rounded shadow"
                >
                  <p className="text-sm md:text-base">عدد الموظفين</p>
                  <p className="text-xl md:text-2xl font-bold">
                    {dashboardData
                      ? dashboardData.employeeCount.toLocaleString()
                      : "..."}
                  </p>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-white p-4 rounded shadow"
                >
                  <p className="text-sm md:text-base">إجمالي الرواتب الشهر السابق</p>
                  <p className="text-xl md:text-2xl font-bold">
                    {dashboardData
                      ? dashboardData.totalSalaryPrev.toLocaleString()
                      : "..."}
                  </p>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-white p-4 rounded shadow"
                >
                  <p className="text-sm md:text-base">إجمالي الرواتب الشهر الحالي</p>
                  <p className="text-xl md:text-2xl font-bold">
                    {dashboardData
                      ? dashboardData.totalSalaryCurrent.toLocaleString()
                      : "..."}
                  </p>
                </motion.div>
              </div>
  
              <div className="flex flex-wrap gap-3 mt-4 w-full">
                <Link
                  href="/employees"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition w-full sm:w-auto text-center"
                >
                  الموظفين
                </Link>
                <Link
                  href="/payments/report"
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition w-full sm:w-auto text-center"
                >
                  الرواتب
                </Link>
                <Link
                  href="/promotions"
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition w-full sm:w-auto text-center"
                >
                  الترقيات
                </Link>
              </div>
            </motion.div>
  
            {/* Right side slideshow */}
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="relative w-full md:w-1/2 min-h-screen overflow-hidden bg-gray-200 dark:bg-gray-700"
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
                    alt={`Slide image ${currentImage + 1}`}
                    fill
                    className="object-cover"
                    sizes="100vw"
                    priority
                  />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
  