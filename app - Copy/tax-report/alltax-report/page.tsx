'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';

interface Office {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  office_id: string;
  offices?: { name: string };
}

interface PaymentEntry {
  amount: number;
  title: string;
  type: string;
}

interface Payment {
  employee_id: string;
  salary: number | null;
  employees: Employee | null;
  payments_entries?: PaymentEntry[];
}

const toArabicNumber = (num: number) => {
  return new Intl.NumberFormat('ar-EG', { useGrouping: true }).format(num);
};

export default function TaxReportPage() {
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [office, setOffice] = useState<Office | null>(null);
  const [data, setData] = useState<Payment[]>([]);
  const [month, setMonth] = useState('');
  const [taxValues, setTaxValues] = useState<{ [key: string]: number }>({});
  const [committeeNames, setCommitteeNames] = useState<string[]>(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchUserAndOffice = async () => {
      setLoading(true);
      setErrorMsg('');

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMsg('فشل في جلب المستخدم.');
        setLoading(false);
        return;
      }

      setUser(user);

      const { data: officeData, error: officeError } = await supabase
        .from('offices')
        .select('id, name')
        .eq('auth_user_id', user.id)
        .single();

      if (officeError || !officeData) {
        setErrorMsg('فشل في جلب بيانات الدائرة.');
        setLoading(false);
        return;
      }

      setOffice(officeData);
      setLoading(false);
    };

    fetchUserAndOffice();
  }, []);

  useEffect(() => {
    if (month && office?.id) fetchReportData();
  }, [month, office]);

  const fetchReportData = async () => {
    setLoading(true);
    setErrorMsg('');

    const startDate = `${month}-01`;
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    const endDateStr = endDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('payments')
      .select(`
        salary, employee_id,
        employees (
          id, first_name, last_name, office_id,
          offices ( name )
        ),
        payments_entries ( amount, title, type )
      `)
      .gte('month', startDate)
      .lt('month', endDateStr)
      .order('month', { ascending: false });

    if (error) {
      console.error('Fetch error:', error);
      setErrorMsg('حدث خطأ أثناء جلب بيانات الرواتب.');
      setData([]);
    } else {
      setData(data || []);

      const taxMap: { [key: string]: number } = {};
      data?.forEach((p) => {
        const taxEntry = p.payments_entries?.find((entry) => entry.title === 'ضريبة');
        if (taxEntry) {
          taxMap[p.employee_id] = taxEntry.amount;
        }
      });
      setTaxValues(taxMap);
    }

    setLoading(false);
  };

  const handleCommitteeNameChange = (index: number, value: string) => {
    setCommitteeNames((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredPayments = data.filter(p => (taxValues[p.employee_id] || 0) > 0);
  const totalSalary = filteredPayments.reduce((sum, p) => sum + (p.salary || 0), 0);
  const totalTax = filteredPayments.reduce((sum, p) => sum + (taxValues[p.employee_id] || 0), 0);

  return (
    <div className="min-h-screen bg-blue-50 p-4 rtl" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6 font-[Cairo]">

        {/* Header & Controls */}
        <section className="bg-gradient-to-l from-indigo-100 via-white to-blue-100 p-4 rounded-xl shadow border border-blue-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-right text-gray-800 print:hidden">
          <div>
            <p><strong>المستخدم:</strong> {user?.email || 'غير معروف'}</p>
            <p><strong>الدائرة:</strong> {office?.name || 'غير معروفة'}</p>
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="month" className="font-semibold">الشهر:</label>
            <input
              id="month"
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="border rounded px-2 py-1 shadow-sm"
              aria-label="اختر الشهر"
            />
            <button
              onClick={handlePrint}
              disabled={!month || filteredPayments.length === 0}
              className="bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50 transition"
            >
              طباعة التقرير
            </button>
            <Link
              href="/home"
              className="bg-gray-200 hover:bg-gray-300 px-4 py-1.5 rounded transition"
            >
              الرئيسية
            </Link>
          </div>
        </section>

        {/* Loading & Errors */}
        {loading && <p className="text-center text-blue-600 font-medium">...جاري التحميل</p>}
        {errorMsg && <p className="text-center text-red-600 font-semibold">{errorMsg}</p>}

        {/* Tax Report Section */}
        <section
          id="report-content"
          className="bg-white rounded-xl shadow p-6 print:shadow-none print:rounded-none"
        >
          {filteredPayments.length > 0 ? (
            <>
              {/* Title & Info */}
              <div className="text-center mb-6 print:mb-8">
                <h2 className="text-xl font-bold text-gray-800 print:text-black">تقرير الضريبة</h2>
                <p className="text-md text-gray-700 print:text-black mt-2">
                  <strong>الدائرة:</strong> {office?.name || '—'}
                </p>
                <p className="text-md text-gray-700 print:text-black">
                  <strong>الشهر:</strong> {month || '—'}
                </p>
              </div>

              {/* Table */}
              <table className="w-full border text-center text-sm print:text-sm">
                <thead className="bg-gray-100 print:bg-gray-100">
                  <tr>
                    <th className="border p-2">الاسم</th>
                    <th className="border p-2">الدائرة</th>
                    <th className="border p-2">الراتب</th>
                    <th className="border p-2">الضريبة</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p) => {
                    const tax = taxValues[p.employee_id] || 0;
                    const emp = p.employees;
                    return (
                      <tr key={p.employee_id} className="hover:bg-gray-50">
                        <td className="border p-1">{emp?.first_name || ''}</td>
                        <td className="border p-1">{emp?.offices?.name || 'غير معروف'}</td>
                        <td className="border p-1">{toArabicNumber(p.salary || 0)}</td>
                        <td className="border p-1">{toArabicNumber(tax)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="font-bold bg-gray-100 print:bg-gray-100">
                    <td className="border p-2">المجموع</td>
                    <td className="border p-2">—</td>
                    <td className="border p-2">{toArabicNumber(totalSalary)}</td>
                    <td className="border p-2">{toArabicNumber(totalTax)}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Committee */}
              <div
                id="committee-signatures"
                className="mt-10 bg-white rounded-xl border border-gray-300 p-6 print:border-black print:border-2 print:mt-12 print:break-inside-avoid"
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 text-center">
                  {['عضو اللجنة', 'عضو لجنة', 'عضو لجنة ', 'رئيس اللجنة'].map((label, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <span className="font-semibold text-gray-700 print:text-black">{label}</span>
                      <input
                        type="text"
                        placeholder="اسم"
                        value={committeeNames[idx]}
                        onChange={(e) => handleCommitteeNameChange(idx, e.target.value)}
                        className="border-t-2 border-black w-full max-w-[160px] text-center text-lg font-semibold focus:outline-none focus:border-blue-500 transition print:border-t-[2px] print:border-black print:shadow-none print:outline-none print:bg-transparent"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-gray-600 font-[Cairo]">لا توجد بيانات لعرضها</p>
          )}
        </section>
      </div>
    </div>
  );
}
