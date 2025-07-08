'use client';

import { useEffect, useState, useMemo } from 'react';
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

  const fetchUserAndOffice = async () => {
    setLoading(true);
    setErrorMsg('');

    const { data: authData, error: userError } = await supabase.auth.getUser();
    if (userError || !authData.user) {
      setErrorMsg('فشل في جلب المستخدم.');
      setLoading(false);
      return;
    }
    setUser(authData.user);

    const { data: officeData, error: officeError } = await supabase
      .from('offices')
      .select('id, name')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (officeError || !officeData) {
      setErrorMsg('فشل في جلب بيانات الدائرة.');
    } else {
      setOffice(officeData);
    }

    setLoading(false);
  };

  const fetchReportData = async () => {
    if (!month || !office?.id) {
      setData([]);
      setTaxValues({});
      return;
    }
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
      setTaxValues({});
    } else {
      setData(data || []);

      // Build map of employee_id => tax amount (where tax entry exists)
      const taxMap: { [key: string]: number } = {};
      data?.forEach((p) => {
        const taxEntry = p.payments_entries?.find((entry) => entry.title === 'ضريبة');
        if (taxEntry) taxMap[p.employee_id] = taxEntry.amount;
      });
      setTaxValues(taxMap);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchUserAndOffice();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [month, office]);

  const handleCommitteeNameChange = (index: number, value: string) => {
    setCommitteeNames((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handlePrint = () => window.print();

  // Filter payments to only those employees with tax > 0
  const filteredPayments = useMemo(() => {
    return data.filter((p) => (taxValues[p.employee_id] || 0) > 0);
  }, [data, taxValues]);

  const totalSalary = useMemo(() => filteredPayments.reduce((sum, p) => sum + (p.salary || 0), 0), [filteredPayments]);
  const totalTax = useMemo(() => filteredPayments.reduce((sum, p) => sum + (taxValues[p.employee_id] || 0), 0), [filteredPayments, taxValues]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rtl font-[Cairo]" dir="rtl">
      <div className="bg-white rounded-xl shadow p-6 space-y-6 print:shadow-none print:rounded-none max-w-5xl mx-auto">
        {/* Report Header */}
        <div className="text-center space-y-1 print:text-lg print:mb-4">
          <div className="font-bold text-lg print:text-2xl">تقرير الضريبة</div>
          <div><strong>الدائرة:</strong> {office?.name || 'غير معروفة'}</div>
          <div className="print:hidden text-gray-600 text-sm">
            <strong>المستخدم:</strong> {user?.email || 'غير معروف'}
          </div>
        </div>

        {/* Filters */}
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
              disabled={filteredPayments.length === 0 || loading}
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

        {/* Table and Committee Section */}
        <div id="report-content" className="bg-white rounded-xl shadow p-6 mt-6 overflow-x-auto space-y-8">
          {loading && <p className="text-center text-blue-600 font-medium">...جاري التحميل</p>}
          {errorMsg && <p className="text-center text-red-600 font-semibold">{errorMsg}</p>}

          {filteredPayments.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse border text-center text-sm">
                  <thead className="bg-gray-100 font-bold">
                    <tr>
                      <th className="border p-2">الاسم</th>
                      <th className="border p-2">الراتب</th>
                      <th className="border p-2">الضريبة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="border p-2">{`${p.employees?.first_name || ''} ${p.employees?.last_name || ''}`}</td>
                        <td className="border p-2 font-mono text-sm text-blue-900">
                          {(p.salary ?? 0).toLocaleString('ar-IQ')}
                        </td>
                        <td className="border p-2 font-mono text-sm text-blue-900">
                          {(taxValues[p.employee_id] || 0).toLocaleString('ar-IQ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="font-semibold bg-gray-100">
                    <tr>
                      <td className="border p-2">المجموع</td>
                      <td className="border p-2 font-mono text-sm text-blue-900">{totalSalary.toLocaleString('ar-IQ')}</td>
                      <td className="border p-2 font-mono text-sm text-blue-900">{totalTax.toLocaleString('ar-IQ')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Committee Signatures */}
              <div className="mt-1 bg-white rounded-lg p-4 border border-gray-300 print:border-black print:border-0.5">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-center">
                  {['عضو لجنة', 'عضو لجنة', 'عضو لجنة', 'رئيس اللجنة'].map((label, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <label className="font-bold mb-3 text-gray-700 text-sm">{label}</label>
                      <input
                        type="text"
                        placeholder="اسم"
                        value={committeeNames[idx]}
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
