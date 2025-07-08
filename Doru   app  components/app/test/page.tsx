'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const monthNames = [
  'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
  'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول',
];

export default function TestPage() {
  const supabase = createClient();

  const [email, setEmail] = useState<string | null>(null);
  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [totalSalary, setTotalSalary] = useState<number>(0);
  const [salaryPerMonth, setSalaryPerMonth] = useState<{ name: string; salary: number }[]>([]);
  const [recentLogins, setRecentLogins] = useState<{ email: string; login_time: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Get user session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('User fetch error:', userError.message);
        return;
      }
      if (!user) return;
      setEmail(user.email ?? null);

      // Get employee count
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id');

      if (empError) console.error('Employee fetch error:', empError.message);
      setEmployeeCount(empData?.length || 0);

      // Get salaries by month
      const { data: payData, error: payError } = await supabase
        .from('payments')
        .select('salary, month');

      if (payError) {
        console.error('Payments fetch error:', payError.message);
      } else {
        const total = payData?.reduce((sum, row) => sum + (row.salary || 0), 0) || 0;
        setTotalSalary(total);

        const salaryMap: Record<number, number> = {};
        (payData || []).forEach(({ salary, month }) => {
          if (!month) return;
          salaryMap[month] = (salaryMap[month] || 0) + salary;
        });

        const salaryList = Object.entries(salaryMap).map(([month, total]) => ({
          name: monthNames[parseInt(month) - 1],
          salary: total,
        }));
        setSalaryPerMonth(salaryList);
      }

      // Get recent logins
      const { data: loginData, error: loginError } = await supabase
        .from('user_logs')
        .select('email, login_time')
        .order('login_time', { ascending: false })
        .limit(5);

      if (loginError) console.error('Login fetch error:', loginError.message);
      setRecentLogins(loginData || []);
    };

    fetchData();
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-screen-lg mx-auto text-base">
      <h1 className="text-2xl font-bold mb-6 text-center">📊 صفحة الاختبار - البيانات الحقيقية</h1>

      {email ? (
        <>
          {/* Basic Info */}
          <div className="mb-6 space-y-2">
            <p><span className="font-semibold">📧 البريد الإلكتروني:</span> {email}</p>
            <p><span className="font-semibold">👥 عدد الموظفين:</span> {employeeCount}</p>
            <p><span className="font-semibold">💰 إجمالي الرواتب:</span> {totalSalary.toLocaleString()} دينار</p>
          </div>

          {/* Salary Chart */}
          <div className="h-64 w-full bg-white border rounded p-4 shadow mb-6">
            <h2 className="text-lg font-semibold mb-2">💸 توزيع الرواتب حسب الشهر</h2>
            <p className="text-sm text-gray-600 mb-2">
  📅 الشهر الحالي: <span className="font-bold text-blue-700">{monthNames[new Date().getMonth()]}</span>
</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salaryPerMonth}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="salary" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Logins */}
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-3">🕒 أحدث تسجيلات الدخول:</h2>
            {recentLogins.length > 0 ? (
              <ul className="text-sm text-gray-700 space-y-1">
                {recentLogins.map((log, i) => (
                  <li key={i}>
                    👤 <strong>{log.email}</strong> —{' '}
                    {new Date(log.login_time).toLocaleString('ar-IQ')}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">لا توجد تسجيلات دخول حديثة.</p>
            )}
          </div>
        </>
      ) : (
        <p className="text-red-600 font-semibold">⚠️ لا يوجد مستخدم مسجل الدخول.</p>
      )}
    </div>
  );
}
