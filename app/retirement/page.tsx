'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';

interface Office {
  id: string;
  name: string;
  parent_id: string | null;
}

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  office_id: string;
}

interface Payment {
  employee_id: string;
  salary: number | null;
  employees: Employee | null;
}

const RetireReportPage = () => {
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [office, setOffice] = useState<Office | null>(null);
  const [data, setData] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [month, setMonth] = useState('');
  const [percentage, setPercentage] = useState<number>(10);
  const [committeeNames, setCommitteeNames] = useState<string[]>(['', '', '', '']);

  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setErrorMsg('فشل في جلب المستخدم.');
          return;
        }
        setUser(user);

        const { data: officeData, error: officeError } = await supabase
          .from('offices')
          .select('id, name, parent_id')
          .eq('auth_user_id', user.id)
          .single();

        if (officeError || !officeData) {
          setErrorMsg('فشل في جلب بيانات الدائرة.');
          return;
        }

        setOffice(officeData);
      } catch {
        setErrorMsg('حدث خطأ غير متوقع.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, []);

  useEffect(() => {
    if (month && office?.id) {
      fetchData();
    } else {
      setData([]);
    }
  }, [month, office]);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const startDate = `${month}-01`;
      const nextMonth = new Date(startDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const endDate = nextMonth.toISOString().split('T')[0];

      const { data: allOffices, error: officesError } = await supabase
        .from('offices')
        .select('id, parent_id');

      if (officesError || !allOffices) {
        setErrorMsg('فشل في جلب الدوائر الفرعية.');
        setData([]);
        return;
      }

      const getDescendantOfficeIds = (parentId: string): string[] => {
        const children = allOffices.filter(o => o.parent_id === parentId);
        const childIds = children.map(c => c.id);
        return childIds.flatMap(id => [id, ...getDescendantOfficeIds(id)]);
      };

      const officeIds = [office!.id, ...getDescendantOfficeIds(office!.id)];

      const { data, error } = await supabase
        .from('payments')
        .select(`
          salary,
          employee_id,
          employees (
            id,
            first_name,
            last_name,
            office_id
          )
        `)
        .in('employees.office_id', officeIds)
        .gte('month', startDate)
        .lt('month', endDate)
        .order('month', { ascending: false });

      if (error) {
        setErrorMsg('حدث خطأ أثناء جلب بيانات الرواتب.');
        setData([]);
      } else {
        setData(
          (data || []).map((item) => ({
            ...item,
            employees: Array.isArray(item.employees) ? item.employees[0] : item.employees,
          }))
        );
      }
    } catch {
      setErrorMsg('حدث خطأ غير متوقع أثناء جلب البيانات.');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const totalSalary = data.reduce((sum, p) => sum + (p.salary || 0), 0);
  const totalCut = data.reduce((sum, p) => sum + ((p.salary || 0) * percentage) / 100, 0);

  const handleCommitteeNameChange = (index: number, value: string) => {
    setCommitteeNames((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rtl font-[Cairo]" dir="rtl">
      <div className="bg-white rounded-xl shadow p-6 space-y-6 print:shadow-none print:rounded-none max-w-5xl mx-auto">
        {/* Report Header */}
        <div className="text-center space-y-1 print:text-lg print:mb-4">
          <div className="font-bold text-lg print:text-2xl">تقرير الاستقطاعات التقاعدية</div>
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

          <div className="flex items-center gap-2">
            <label htmlFor="percentage-input">نسبة التقاعد %:</label>
            <input
              id="percentage-input"
              type="number"
              value={percentage}
              min={0}
              max={100}
              onChange={(e) => setPercentage(+e.target.value)}
              className="border border-blue-300 rounded px-3 py-1 text-center text-blue-900 font-semibold shadow-sm focus:ring-2 focus:ring-blue-400 w-20"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              disabled={!data.length}
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

          {data.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse border text-center text-sm">
                  <thead className="bg-gray-100 font-bold">
                    <tr>
                      <th className="border p-2">الاسم</th>
                      <th className="border p-2">الراتب</th>
                      <th className="border p-2">قيمة الاستقطاع ({percentage}%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="border p-2">{p.employees?.first_name || ''}</td>
                        <td className="border p-2 font-mono text-blue-900">
                          {(p.salary ?? 0).toLocaleString('ar-IQ')}
                        </td>
                        <td className="border p-2 font-mono text-blue-900">
                          {((p.salary || 0) * percentage / 100).toLocaleString('ar-IQ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="font-semibold bg-gray-100">
                    <tr>
                      <td className="border p-2">المجموع</td>
                      <td className="border p-2 font-mono text-sm text-blue-900">{totalSalary.toLocaleString('ar-IQ')}</td>
                      <td className="border p-2 font-mono text-sm text-blue-900">{totalCut.toLocaleString('ar-IQ')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Committee Signatures */}
              <div className="mt-8 bg-white rounded-lg p-4 border-0.5 border-gray-300 print:border-black print:border-0.5">
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
};

export default RetireReportPage;
