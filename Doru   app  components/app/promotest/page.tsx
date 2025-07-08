'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';

interface Promotion {
  id: string;
  employee_id: string;
  old_degree?: number;
  old_level?: number;
  old_salary?: number;
  new_degree?: number;
  new_level?: number;
  new_salary?: number;
  due_date?: string;
  note?: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  office_id: string;
}

interface Office {
  id: string;
  name: string;
  auth_user_id: string;
}

export default function PromotionsPage() {
  const supabase = createClient();
  const reportRef = useRef<HTMLDivElement>(null);

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [office, setOffice] = useState<Office | null>(null);
  const [searchName, setSearchName] = useState('');
  const [month, setMonth] = useState('');
  const [committeeMembers, setCommitteeMembers] = useState({
    member1: '',
    member2: '',
    member3: '',
    chair: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const { data: auth } = await supabase.auth.getUser();
        setUser(auth.user);
        if (!auth.user) return;

        const { data: officeData } = await supabase
          .from('offices')
          .select('*')
          .eq('auth_user_id', auth.user.id)
          .single();

        if (!officeData) return;
        setOffice(officeData);

        const { data: employeeData } = await supabase
          .from('employees')
          .select('*')
          .eq('office_id', officeData.id);

        setEmployees(employeeData || []);

        const empIds = employeeData?.map((e) => e.id) || [];
        const { data: promoData } = await supabase
          .from('promotions')
          .select('*')
          .in('employee_id', empIds);

        setPromotions(promoData || []);
      } catch (err) {
        console.error(err);
        setErrorMsg('حدث خطأ أثناء تحميل البيانات.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const handlePrint = () => {
    if (!reportRef.current) return;
    const printContent = reportRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html lang="ar" dir="rtl">
        <head>
          <title>تقرير الترقيات</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo&display=swap" rel="stylesheet">
          <style>
            @page { size: landscape; margin: 20mm; }
            body { font-family: 'Cairo', sans-serif; direction: rtl; unicode-bidi: embed; padding: 20px; text-align: center; color: #000; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
            thead { background-color: #f2f2f2; }
            th, td { border: 1px solid #999; padding: 6px 10px; text-align: center; }
            tr:nth-child(even) { background-color: #fafafa; }
            .committee-members { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-top: 30px; }
            .committee-members label { font-weight: bold; margin-bottom: 6px; }
            .committee-members input { width: 100%; text-align: center; padding: 0.25rem; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const getEmployee = (id: string) => employees.find((e) => e.id === id);

  const handleCommitteeNameChange = (index: number, value: string) => {
    const keys = ['member1', 'member2', 'member3', 'chair'];
    setCommitteeMembers((prev) => ({ ...prev, [keys[index]]: value }));
  };

  const formatArabicDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  };

  const filteredPromotions = promotions.filter((p) => {
    const emp = getEmployee(p.employee_id);
    if (!emp) return false;
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    return (!searchName || fullName.includes(searchName.toLowerCase())) &&
           (!month || p.due_date?.startsWith(month));
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rtl font-[Cairo]" dir="rtl">
      <div className="bg-white rounded-xl shadow p-6 space-y-6 max-w-5xl mx-auto print:shadow-none print:rounded-none">
        {/* Header */}
        <div className="text-center space-y-1 print:text-lg print:mb-4">
          <div className="font-bold text-lg print:text-2xl">تقرير الترفيعات</div>
          <div><strong>الدائرة:</strong> {office?.name || 'غير معروفة'}</div>
          <div className="print:hidden text-gray-600 text-sm">
            <strong>المستخدم:</strong> {user?.email || 'غير معروف'}</div>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4 items-center print:hidden">
          <div className="flex items-center gap-2">
            <label htmlFor="month-picker">الشهر:</label>
            <input
              id="month-picker"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="border border-blue-300 rounded px-3 py-1 text-center text-blue-900 font-semibold shadow-sm focus:ring-2 focus:ring-blue-400 max-w-[140px]"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              disabled={!filteredPromotions.length}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded px-5 py-2 font-semibold shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              طباعة التقرير
            </button>
            <Link
              href="/home"
              className="bg-blue-200 hover:bg-blue-300 text-blue-900 rounded px-5 py-2 font-semibold shadow-md transition"
            >
              الرئيسية
            </Link>
          </div>
        </div>

        {/* Table */}
        <div ref={reportRef} className="bg-white rounded-xl shadow p-6 mt-6 overflow-x-auto space-y-8">
          {loading && <p className="text-center text-blue-600 font-medium">...جاري التحميل</p>}
          {errorMsg && <p className="text-center text-red-600 font-semibold">{errorMsg}</p>}

          {filteredPromotions.length > 0 ? (
            <>
              <table className="w-full min-w-[600px] border-collapse border text-center text-sm">
                <thead className="bg-gray-100 font-bold">
                  <tr>
                    <th className="border p-2">الاسم</th>
                    <th className="border p-2">الدرجة الحالية</th>
                    <th className="border p-2">المرحلة الحالية</th>
                    <th className="border p-2">الراتب الحالي</th>
                    <th className="border p-2">تاريخ الاستحقاق</th>
                    <th className="border p-2">الدرجة الجديدة</th>
                    <th className="border p-2">المرحلة الجديدة</th>
                    <th className="border p-2">الراتب الجديد</th>
                    <th className="border p-2">ملاحظة</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPromotions.map((p, i) => {
                    const emp = getEmployee(p.employee_id);
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="border p-2">{emp?.first_name || ''} {emp?.last_name || ''}</td>
                        <td className="border p-2 font-mono text-blue-900">
                        {(p.old_salary ?? 0).toLocaleString('ar-IQ')}</td>
                        <td className="border p-2 font-mono text-blue-900">
                        {(p.old_level ?? 0).toLocaleString('ar-IQ')}</td>
                        <td className="border p-2 font-mono text-blue-900">
                        {(p.old_salary ?? 0).toLocaleString('ar-IQ')}</td>
                        <td className="border p-2">{formatArabicDate(p.due_date)}</td>
                        <td className="border p-2 font-mono text-blue-900">
                        {(p.new_degree ?? 0).toLocaleString('ar-IQ')}</td>
                        <td className="border p-2 font-mono text-blue-900">
                        {(p.new_level ?? 0).toLocaleString('ar-IQ')}</td>
                        <td className="border p-2 font-mono text-blue-900">
                        {(p.new_salary ?? 0).toLocaleString('ar-IQ')}</td>
                        <td className="border p-2">{p.note || ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Committee Signatures */}
              <div className="mt-8 bg-white rounded-lg p-4 border border-gray-300 print:border-black">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-center">
                  {['عضو لجنة', 'عضو لجنة', 'عضو لجنة', 'رئيس اللجنة'].map((label, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <label className="font-bold mb-3 text-gray-700 text-sm">{label}</label>
                      <input
                        type="text"
                        placeholder="اسم"
                        value={Object.values(committeeMembers)[idx]}
                        onChange={(e) => handleCommitteeNameChange(idx, e.target.value)}
                        className="border-t-1 border-black w-full max-w-[300px] text-center text-sm font-semibold focus:outline-none focus:border-blue-500 transition"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-gray-600">لا توجد بيانات لعرضها</p>
          )}
        </div>
      </div>
    </div>
  );
}
