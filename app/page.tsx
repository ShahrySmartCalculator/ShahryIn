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

// Fonts
const cairo = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "700"], display: "swap" });
const amiri = Amiri({ subsets: ["arabic"], weight: ["400"], display: "swap" });
const fonts = { cairo: cairo.className, amiri: amiri.className };

// Helper: Date range for stats
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

// SWR Fetcher
const fetcher = async (key: string) => {
  const supabase = createClient();
  const { previousMonthStart, previousMonthEnd, currentMonthStart } = getDateRanges();

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

    const fetchPayments = async (from: string, to?: string) => {
      let query = supabase
        .from("payments")
        .select(
          "salary, certificate_percentage, risk_percentage, retire_percentage, trans_pay, net_credits, net_debits, payments_entries (id, type, amount)"
        )
        .in("employee_id", employeeIds);

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
        const trans = p.trans_pay || 0;
    
        const totalNetCredits = (p.payments_entries || [])
          .filter((e: { id: number; type: string; amount: number }) => e.type === 'credit')
          .reduce((sum2: number, e: { id: number; type: string; amount: number }) => sum2 + (e.amount || 0), 0);
    
        const totalNetDebits = (p.payments_entries || [])
          .filter((e: { id: number; type: string; amount: number }) => e.type === 'debit')
          .reduce((sum2: number, e: { id: number; type: string; amount: number }) => sum2 + (e.amount || 0), 0);
    
        const credits = s + cert + risk + trans + totalNetCredits;
        const debits = retire + totalNetDebits;
    
        return sum + (credits - debits);
      }, 0);
    

    return {
      employeeCount: employeeIds.length,
      totalSalaryPrev: calcNet(prevPayments),
      totalSalaryCurrent: calcNet(currPayments),
    };
  }
}
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
  
        // 👇 Load office for this user
        const { data: office } = await supabase
          .from("offices")
          .select("name, created_at, is_active")
          .eq("auth_user_id", u.id)
          .single();
  
        if (office) {
          setOfficeName(office.name);
  
          // ✅ Check expiry here
          if (!office.is_active || isOfficeExpired(office.created_at)) {
            alert("⚠️ Please, contact 0787-0323-700 to re-activate your accessable office.");

              // ✅ Sign out the user after they click OK
  await supabase.auth.signOut();

  // Optional: reload or redirect to login
  location.reload();
  return;

          }
        }
      }
  
      // Load office list for form modal
      const { data: offices } = await supabase.from("offices").select("id, name").order("name");
      setOfficeOptions(offices || []);
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
    const supabase = createClient();
  
    try {
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
  
      // Insert new office
      const { error: insertError } = await supabase.from("offices").insert([
        { ...newOffice, auth_user_id: user.id },
      ]);
  
      if (insertError) {
        console.error("Insert failed:", insertError.message);
        alert("فشل في إضافة الدائرة: " + insertError.message);
        return;
      }
  
      setShowOfficeModal(false);
  
      // ✅ Try fetching the inserted office again
      const { data: insertedOffice, error: fetchError } = await supabase
        .from("offices")
        .select("name")
        .eq("auth_user_id", user.id)
        .single();
  
      if (fetchError || !insertedOffice) {
        console.warn("Office not found after insert");
        return;
      }
  
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
            {/* Sidebar */}
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="md:w-1/2 w-full p-6 md:p-10 bg-white dark:bg-gray-800 space-y-6 shadow-xl"
            >
              {/* Header */}
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex gap-2">
                  {Object.keys(fonts).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFont(f as "cairo" | "amiri")}
                      className={`px-3 py-1 rounded border text-sm hover:scale-105 transition ${
                        font === f
                          ? "bg-blue-600 text-white"
                          : "border-gray-300 text-gray-600 dark:text-white"
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
                  <div className="flex gap-2 items-center">
                    {user ? (
                      <button
                        onClick={async () => {
                          const supabase = createClient();
                          await supabase.auth.signOut();
                          window.location.href = "/";
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                      >
                        تسجيل الخروج
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          window.location.href = "/auth/login";
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                      >
                        تسجيل الدخول
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <h1 className="text-3xl font-bold text-blue-800 dark:text-blue-400">  مرحباً بك في نظام الرواتب والترقيات </h1>
              {/* <h1 className="text-3xl font-bold text-blue-800 dark:text-blue-400"> في نظام الرواتب </h1> */}
              {/* <h1 className="text-3xl font-bold text-blue-800 dark:text-blue-400">و الترقيات  </h1> */}
              <p className="text-base text-gray-700 dark:text-gray-300">
                تطبيقنا يسهل عليك إدارة الرواتب و الترقيات بسلاسة وأمان. كل ما تحتاجه في مكان واحد.
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">

                <li>✔️ حسابات دقيقة وسريعة للرواتب</li>
                <li>✔️ جمع بيانات الدوائر التابعة لدائرتك -ان وجدت - في مكان واحد</li>
                <li>✔️ عملك من خلال الحاسوب او الهاتف بسهولة</li>
              </ul>

              {user && <div className="text-sm text-gray-500 dark:text-gray-400">مرحباً، {user.email}</div>}

              <div className="text-sm text-right">
                <button className="text-blue-600 underline" onClick={() => setShowOfficeModal(true)}>
                  {officeName || "اسم الدائرة "}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-3">
                <DashboardCard title="عدد الموظفين" value={dashboardData?.employeeCount} color="blue" />
                <DashboardCard title="رواتب الشهر السابق" value={dashboardData?.totalSalaryPrev} color="green" />
                <DashboardCard title="رواتب الشهر الحالي" value={dashboardData?.totalSalaryCurrent} color="green" />
              </div>


              <div className="flex flex-wrap gap-3 mt-6">
                <NavButton href="/employees" label="الموظفين" color="blue" />
                <NavButton href="/payments/report" label="الرواتب" color="green" />
                <NavButton href="/promotions" label="الترقيات" color="red" />
                {/* <NavButton href="/contact_us" label="اتصل ينا" color="blue" /> */}
              </div>
              
              {/*<div className="text-me dark:text-gray-400 mt-4 flex flex-row items-center justify-start gap-x-6">
                <p>Address: Iraq - Najaf</p>
                <p>Email: huseinaltae@gmail.com</p>
                <p>Phone: 0787-0323-700</p>
              </div> */}

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
                    priority={currentImage === 0} // only first slide priority for better perf
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
        officeOptions={officeOptions} // passed from fetch
        onOfficeAdded={handleNewOffice} // your add handler
        initialName={officeName || ""}
        initialParentId={null} // or pass existing parent office id if any
      />
    </div>
  );
}

// Utility Components with static Tailwind classes for dark mode

type Color = "blue" | "green" | "red";

const bgColors: Record<Color, string> = {
  blue: "bg-blue-100 dark:bg-blue-900",
  green: "bg-green-100 dark:bg-green-900",
  red: "bg-red-100 dark:bg-red-900",
};

const textColors: Record<Color, string> = {
  blue: "text-blue-800 dark:text-white",
  green: "text-green-800 dark:text-white",
  red: "text-red-800 dark:text-white",
};

const DashboardCard = ({ title, value, color }: { title: string; value: number | undefined; color: Color }) => (
  <motion.div whileHover={{ scale: 1.05 }} className={`${bgColors[color]} p-1 rounded shadow`}>
    <p className={`text-sm ${textColors[color]}`}>{title}</p>
    <p className={`text-xl font-bold ${textColors[color]}`}>
      {value !== undefined ? value.toLocaleString() : "..."}
    </p>
  </motion.div>
);

const navButtonBgColors: Record<Color, string> = {
  blue: "bg-blue-600 hover:bg-blue-700",
  green: "bg-green-600 hover:bg-green-700",
  red: "bg-red-600 hover:bg-red-700",
};

const NavButton = ({ href, label, color }: { href: string; label: string; color: Color }) => (
  <Link
    href={href}
    className={`${navButtonBgColors[color]} text-white px-4 py-1 rounded transition text-center inline-block`}
  >
    {label}
  </Link>
);

