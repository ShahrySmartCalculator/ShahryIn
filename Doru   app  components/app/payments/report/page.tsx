'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import NewPaymentModal from '@/components/NewPaymentModal';

interface Office {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  office?: Office | null;
}

interface PaymentEntry {
  id: string;
  title: string;
  amount: number;
  type: 'credit' | 'debit' | string;
}

interface Payment {
  id: string;
  employee: Employee | null;
  payments_entries: PaymentEntry[];
  month: string | null;
  degree: number | null;
  level: number | null;
  salary: number | null;
  certificate_percentage: number | null;
  risk_percentage: number | null;
  trans_pay: number | null;
  retire_percentage: number | null;
  net_credits: number | null;
  net_debits: number | null;
  note: string | null;
}

export default function PaymentsReport() {
  const supabase = createClient();

  // State
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [office, setOffice] = useState<Office | null>(null);
  const [monthFilter, setMonthFilter] = useState('');
  const [bankFilter, setBankFilter] = useState('');
  const [banks, setBanks] = useState<string[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingCopy, setLoadingCopy] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);

  // Helpers
  function normalizeMonth(month: string) {
    return `${month}-01`;
  }

  function getNextMonth(month: string) {
    const [year, m] = month.split('-').map(Number);
    const next = new Date(year, m); // m is zero-based for JS Date()
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  }

  // Recursively fetch office and all descendants IDs
  async function getOfficeAndDescendantsIds(rootId: string): Promise<string[]> {
    const { data: allOffices, error } = await supabase
      .from('offices')
      .select('id, parent_id');

    if (error) {
      console.error('Error fetching offices:', error.message);
      return [rootId];
    }

    const result = new Set<string>();
    const queue = [rootId];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      result.add(current);
      allOffices?.forEach((office) => {
        if (office.parent_id === current) queue.push(office.id);
      });
    }
    return Array.from(result);
  }

  // Fetch payments based on filters
  const fetchPayments = async () => {
    if (!office) {
      setPayments([]);
      return;
    }

    setLoadingPayments(true);

    try {
      // Get all relevant office IDs
      const officeIds = await getOfficeAndDescendantsIds(office.id);

      // Fetch employees in offices (apply bankFilter if set)
      let employeesQuery = supabase
        .from('employees')
        .select('id')
        .in('office_id', officeIds);

      if (bankFilter) {
        employeesQuery = employeesQuery.eq('bank', bankFilter);
      }

      const { data: employeesData, error: employeesError } = await employeesQuery;

      if (employeesError) throw employeesError;

      const employeeIds = employeesData?.map((e) => e.id) || [];

      if (employeeIds.length === 0) {
        setPayments([]);
        setLoadingPayments(false);
        return;
      }

      // Build payments query with relations and filters
      let paymentsQuery = supabase
        .from('payments')
        .select(
          `
          id,
          month,
          degree,
          level,
          salary,
          certificate_percentage,
          risk_percentage,
          trans_pay,
          retire_percentage,
          net_credits,
          net_debits,
          note,
          employee:employees (
            id,
            first_name,
            last_name,
            office:offices (
              name
            )
          ),
          payments_entries:payments_entries (
            id,
            title,
            amount,
            type
          )
        `
        )
        .in('employee_id', employeeIds);

      if (monthFilter) {
        paymentsQuery = paymentsQuery.eq('month', normalizeMonth(monthFilter));
      }

      const { data, error } = await paymentsQuery;

      if (error) {
        console.error('Payments fetch error:', error.message);
        setPayments([]);
      } else {
        setPayments(
          (data ?? []).map((item) => ({
            ...item,
            employee: {
              ...item.employee,
              office: item.employee?.office ?? null,
            },
            payments_entries: Array.isArray(item.payments_entries) ? item.payments_entries : [],
          }))
        );
      }
    } catch (error: any) {
      console.error('Error fetching payments:', error.message || error);
      setPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  // Fetch available banks for filter dropdown
  useEffect(() => {
    async function fetchBanks() {
      const { data, error } = await supabase
        .from('employees')
        .select('bank')
        .neq('bank', null);

      if (error) {
        console.error('Error fetching banks:', error.message);
        return;
      }

      const uniqueBanks = Array.from(new Set(data.map((e) => e.bank))).filter(Boolean);
      setBanks(uniqueBanks as string[]);
    }

    fetchBanks();
  }, [supabase]);

  // Handle copying payments to next month
  const handleCopyToNextMonth = async () => {
    if (!monthFilter) return alert('يرجى اختيار الشهر الحالي أولاً');

    const currentMonthDate = normalizeMonth(monthFilter);
    const nextMonthStr = getNextMonth(monthFilter);
    const nextMonthDate = normalizeMonth(nextMonthStr);

    const confirmCopy = window.confirm(`هل تريد إنشاء رواتب لشهر ${nextMonthStr}?`);
    if (!confirmCopy) return;

    setLoadingCopy(true);

    try {
      // Check if next month payments already exist
      const { data: existingPayments, error: existingError } = await supabase
        .from('payments')
        .select('id')
        .eq('month', nextMonthDate)
        .limit(1);

      if (existingError) throw existingError;
      if (existingPayments && existingPayments.length > 0) {
        alert('تم إنشاء رواتب هذا الشهر مسبقًا!');
        setLoadingCopy(false);
        return;
      }

      // Get office IDs & employees again (to include bank filter)
      if (!office) {
        alert('الدائرة غير محددة.');
        setLoadingCopy(false);
        return;
      }
      const officeIds = await getOfficeAndDescendantsIds(office.id);

      let employeesQuery = supabase
        .from('employees')
        .select('id')
        .in('office_id', officeIds);

      if (bankFilter) {
        employeesQuery = employeesQuery.eq('bank', bankFilter);
      }

      const { data: employeesData, error: employeesError } = await employeesQuery;

      if (employeesError || !employeesData) {
        throw employeesError || new Error('No employees found');
      }

      const employeeIds = employeesData.map((e) => e.id);

      if (employeeIds.length === 0) {
        alert('لا يوجد موظفون في هذه الدائرة.');
        setLoadingCopy(false);
        return;
      }

      // Fetch current month payments to copy
      const { data: currentPayments, error: fetchError } = await supabase
        .from('payments')
        .select(
          `*,
           payments_entries (
             id, type, title, amount
           )`
        )
        .eq('month', currentMonthDate)
        .in('employee_id', employeeIds);

      if (fetchError) throw fetchError;

      if (!currentPayments || currentPayments.length === 0) {
        alert('لا توجد رواتب لهذا الشهر.');
        setLoadingCopy(false);
        return;
      }

      // Prepare new payments and entries with new IDs and next month
      const newPayments: any[] = [];
      const newEntries: any[] = [];

      for (const payment of currentPayments) {
        const { id: oldId, created_at, payments_entries, ...rest } = payment;
        const newPaymentId = uuidv4();

        newPayments.push({
          ...rest,
          id: newPaymentId,
          month: nextMonthDate,
          created_at: new Date().toISOString(),
        });

        for (const entry of payments_entries || []) {
          newEntries.push({
            id: uuidv4(),
            payment_id: newPaymentId,
            type: entry.type,
            title: entry.title,
            amount: entry.amount,
          });
        }
      }

      // Insert new payments
      const { error: insertPaymentsError } = await supabase.from('payments').insert(newPayments);
      if (insertPaymentsError) throw insertPaymentsError;

      // Insert new entries
      if (newEntries.length > 0) {
        const { error: insertEntriesError } = await supabase.from('payments_entries').insert(newEntries);
        if (insertEntriesError) throw insertEntriesError;
      }

      alert('تم إنشاء رواتب الشهر القادم بنجاح!');
      fetchPayments();
    } catch (error: any) {
      alert(`حدث خطأ: ${error.message || error}`);
    } finally {
      setLoadingCopy(false);
    }
  };

  // Print report
  const printReport = () => window.print();

  // Fetch user & office on mount
  useEffect(() => {
    async function fetchUserAndOffice() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (user) {
        setUserEmail(user.email ?? null);

        const { data: officeData, error: officeError } = await supabase
          .from('offices')
          .select('id, name')
          .eq('auth_user_id', user.id)
          .single();

        if (officeData) {
          setOffice(officeData);
        } else if (officeError) {
          console.error('Office fetch error:', officeError.message);
        }
      } else if (userError) {
        console.error('User fetch error:', userError.message);
      }
    }

    fetchUserAndOffice();
  }, [supabase]);

  // Fetch payments on filters change
  useEffect(() => {
    fetchPayments();
  }, [office, monthFilter, bankFilter]);

  const shouldShowData = payments.length > 0 && office !== null && monthFilter !== '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rtl" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-4">

        {/* Filters & Actions */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4 print:hidden space-y-4">
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-blue-50 p-3 rounded-xl shadow font-[Cairo] text-sm font-medium text-gray-800 border border-blue-200 gap-4 text-center sm:text-right">
            <div className="flex justify-center sm:justify-start gap-2">
              <span className="text-gray-600">المستخدم:</span>
              <span className="font-semibold text-blue-900 truncate max-w-[140px]">{userEmail ?? 'غير متوفر'}</span>
            </div>
            <div className="flex justify-center sm:justify-start gap-2">
              <span className="text-gray-600">الدائرة:</span>
              <span className="font-semibold text-blue-900 truncate max-w-[140px]">{office?.name ?? 'لا يوجد دائرة مرتبطة'}</span>
            </div>
            <div className="flex justify-center sm:justify-start gap-2">
              <label htmlFor="month" className="text-gray-600">الشهر:</label>
              <input
                id="month"
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="bg-blue-100 hover:bg-blue-200 focus:bg-blue-300 transition px-3 py-1 rounded-lg border border-blue-300 text-blue-900 font-semibold shadow-sm focus:outline-none text-center w-full max-w-[140px]"
              />
            </div>
            <div className="flex justify-center sm:justify-start gap-2">
  <label htmlFor="bank" className="text-gray-600">البنك:</label>
  <select
    id="bank"
    value={bankFilter}
    onChange={(e) => setBankFilter(e.target.value)}
    className="bg-blue-100 hover:bg-blue-200 focus:bg-blue-300 transition px-3 py-1 rounded-lg border border-blue-300 text-blue-900 font-semibold shadow-sm focus:outline-none w-full max-w-[140px]"
  >
    <option value="">الكل</option>
    {banks.map((bank, idx) => (
      <option key={idx} value={bank}>{bank}</option>
    ))}
  </select>
</div>

          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center gap-3">
            {[
              { type: 'link', label: 'الرئيسية', href: '/home' },
              { type: 'button', label: 'إضافة راتب جديد', onClick: () => setShowModal(true) },
              { type: 'link', label: 'تقرير التقاعد', href: '/retirement' },
              { type: 'link', label: 'تقرير الضرائب', href: '/tax-report' },
              { type: 'link', label: ' اضافة استفطاع', href: '/stamp' },
              {
                type: 'button',
                label: loadingCopy ? 'جاري الإنشاء...' : 'إنشاء رواتب الشهر القادم',
                onClick: handleCopyToNextMonth,
                disabled: loadingCopy,
              },
              { type: 'button', label: 'طباعة التقرير', onClick: printReport },
            ].map((btn, idx) =>
              btn.type === 'link' ? (
                <Link
                  key={idx}
                  href={btn.href}
                  className="w-full sm:w-auto text-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition rounded-lg shadow-md"
                >
                  {btn.label}
                </Link>
              ) : (
                <button
                  key={idx}
                  onClick={btn.onClick}
                  disabled={btn.disabled}
                  className={`w-full sm:w-auto text-center px-4 py-2 text-sm font-semibold text-white ${
                    btn.disabled
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 active:scale-95'
                  } transition rounded-lg shadow-md`}
                >
                  {btn.label}
                </button>
              )
            )}
          </div>
        </div>

        {/* Report Content */}
        {office && monthFilter && shouldShowData ? (
          <div id="report-content" className="bg-white rounded-xl shadow p-4 print:shadow-none overflow-auto">

            {/* Report Header (Office + Month) */}
            <div className="text-center mb-6 print:mb-4 font-[Cairo]">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                تقرير الرواتب - {office?.name ?? 'غير محدد'}
              </h2>
              <p className="text-gray-600 mt-1 text-sm">
                الشهر: {new Date(`${monthFilter}-01`).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long' })}
              </p>
            </div>

            {/* Table Wrapper */}
<div className="w-full overflow-x-auto">
  <table className="min-w-[900px] w-full border-collapse border text-center text-sm">
    <thead className="bg-gray-100 sticky top-0 border-b-2">
      <tr>
        {[
          'الاسم',
          'الدرجة',
          'المرحلة',
          'الراتب',
          '% شهادة',
          'م. شهادة',
          '% خطورة',
          'م. خطورة',
          'م. النقل',
          '% تقاعد',
          'استقطاع التقاعد',
          'الاستحقاق',
          'الاستقطاع',
          'الصافي',
        ].map((header, index) => (
          <th
            key={index}
            className="border p-2 whitespace-nowrap font-bold text-center"
          >
            {header}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {payments.map((p) => {
        const salary = p.salary || 0;
        const certPercent = p.certificate_percentage || 0;
        const riskPercent = p.risk_percentage || 0;
        const retirePercent = p.retire_percentage || 0;

        const certPay = (salary * certPercent) / 100;
        const riskPay = (salary * riskPercent) / 100;
        const transPay = p.trans_pay || 0;
        const retireCut = (salary * retirePercent) / 100;

        const totalNetCredits = (p.payments_entries || [])
          .filter((e) => e.type === 'credit')
          .reduce((sum, e) => sum + (e.amount || 0), 0);

        const totalNetDebits = (p.payments_entries || [])
          .filter((e) => e.type === 'debit')
          .reduce((sum, e) => sum + (e.amount || 0), 0);

        const credits = salary + certPay + riskPay + transPay + totalNetCredits;
        const debits = retireCut + totalNetDebits;
        const net = credits - debits;

        return (
          <React.Fragment key={p.id}>
            <tr className="hover:bg-gray-50 cursor-pointer">
              <td className="border p-1 whitespace-nowrap">
                <button
                  onClick={() => {
                    setEditingPayment(p);
                    setShowModal(true);
                  }}
                  className="text-blue-600 hover:underline bg-transparent border-0 p-0"
                >
                  {p.employee?.first_name} {p.employee?.last_name}
                </button>
              </td>
              <td className="border p-1 whitespace-nowrap">{p.degree?.toLocaleString('ar-IQ') ?? ''}</td>
              <td className="border p-1 whitespace-nowrap">{p.level?.toLocaleString('ar-IQ') ?? ''}</td>
              <td className="border p-1 font-mono text-blue-900 font-extrabold whitespace-nowrap">
                {salary.toLocaleString('ar-IQ')}
              </td>
              <td className="border p-1 whitespace-nowrap">
                {Math.round(certPercent).toLocaleString('ar-IQ')} %
              </td>
              <td className="border p-1 font-mono text-blue-900 font-extrabold whitespace-nowrap">
                {Math.round(certPay).toLocaleString('ar-IQ')}
              </td>
              <td className="border p-1 whitespace-nowrap">
              {Math.round(riskPercent).toLocaleString('ar-IQ')}%
              </td>
              <td className="border p-1 font-mono text-blue-900 font-extrabold whitespace-nowrap">
                {Math.round(riskPay).toLocaleString('ar-IQ')}
              </td>
              <td className="border p-1 font-mono text-blue-900 font-extrabold whitespace-nowrap">
                {transPay.toLocaleString('ar-IQ')}
              </td>
              <td className="border p-1 whitespace-nowrap">
                {Math.round(retirePercent).toLocaleString('ar-IQ')}%
              </td>
              <td className="border p-1 font-mono text-blue-900 font-extrabold whitespace-nowrap">
                {Math.round(retireCut).toLocaleString('ar-IQ')}
              </td>
              <td className="border p-1 font-mono text-blue-900 font-extrabold whitespace-nowrap">
                {Math.round(credits).toLocaleString('ar-IQ')}
              </td>
              <td className="border p-1 font-mono text-blue-900 font-extrabold whitespace-nowrap">
                {Math.round(debits).toLocaleString('ar-IQ')}
              </td>
              <td className="border p-1 font-bold font-mono text-blue-900 whitespace-nowrap">
                {Math.round(net).toLocaleString('ar-IQ')}
              </td>
            </tr>

            {(p.note || (p.payments_entries?.length ?? 0) > 0) && (
              <tr>
                <td colSpan={14} className="border p-1 text-xs text-right bg-gray-50">
                  {p.payments_entries?.length > 0 && (
                    <div className="mb-1">
                      {p.payments_entries
                        .map((entry) => `• ${entry.title} / ${entry.amount.toLocaleString('ar-IQ')}`)
                        .join(' ؛ ')}
                    </div>
                  )}
                  {p.note && <div>ملاحظة: {p.note}</div>}
                </td>
              </tr>
            )}
          </React.Fragment>
        );
      })}
    </tbody>
  </table>
</div>

          

                {/* Totals Summary */}
                <div className="mt-6  grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 py-1">
                {[
                    {
                    label: 'إجمالي الراتب',
                    value: payments.reduce((s, p) => s + (p.salary || 0), 0),
                    bg: 'bg-blue-100',
                    border: 'border-blue-300',
                    padding: 'py-0 px-1',
                    },
                    {
                    label: 'إجمالي الاستحقاق',
                    value: payments.reduce((sum, p) => {
                        const s = p.salary || 0;
                        const cert = (s * (p.certificate_percentage || 0)) / 100;
                        const risk = (s * (p.risk_percentage || 0)) / 100;
                        const trans = p.trans_pay || 0;
                        const totalNetCredits = (p.payments_entries || [])
                        .filter(e => e.type === 'credit')
                        .reduce((sum2, e) => sum2 + (e.amount || 0), 0);
                        return sum + s + cert + risk + trans + totalNetCredits;
                    }, 0),
                    bg: 'bg-green-100',
                    border: 'border-green-300',
                    padding: 'py-0 px-1',
                    },
                    {
                    label: 'إجمالي الاستقطاع',
                    value: payments.reduce((sum, p) => {
                        const s = p.salary || 0;
                        const retire = (s * (p.retire_percentage || 0)) / 100;
                        const totalNetDebits = (p.payments_entries || [])
                        .filter(e => e.type === 'debit')
                        .reduce((sum2, e) => sum2 + (e.amount || 0), 0);
                        return sum + retire + totalNetDebits;
                    }, 0),
                    bg: 'bg-red-100',
                    border: 'border-red-300',
                    padding: 'py-0 px-1',
                    },
                    {
                    label: 'الصافي الكلي',
                    value: payments.reduce((sum, p) => {
                        const s = p.salary || 0;
                        const cert = (s * (p.certificate_percentage || 0)) / 100;
                        const risk = (s * (p.risk_percentage || 0)) / 100;
                        const trans = p.trans_pay || 0;
                        const retire = (s * (p.retire_percentage || 0)) / 100;
                        const totalNetCredits = (p.payments_entries || [])
                        .filter(e => e.type === 'credit')
                        .reduce((sum2, e) => sum2 + (e.amount || 0), 0);
                        const totalNetDebits = (p.payments_entries || [])
                        .filter(e => e.type === 'debit')
                        .reduce((sum2, e) => sum2 + (e.amount || 0), 0);
                        const credits = s + cert + risk + trans + totalNetCredits;
                        const debits = retire + totalNetDebits;
                        return sum + (credits - debits);
                    }, 0),
                    bg: 'bg-yellow-100',
                    border: 'border-yellow-300',
                    padding: 'py-0 px-1',
                    },
                  ].map(({ label, value, bg, border }, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl px-4 py-1 shadow font-[Cairo] text-center ${bg} ${border} border`}
                    >
                      <div className="text-gray-700 font-semibold text-sm mb-1">
                        {label}
                      </div>
                      <div className="text-blue-900 font-extrabold text-xl font-mono">
                        {value.toLocaleString('ar-IQ')} د.ع
                      </div>
                    </div>
                  ))}
                </div>

                {/* Employee Count */}
                <div className="mt-6 rounded-xl p-1 shadow font-[Cairo] bg-indigo-50 border border-indigo-200 flex justify-center items-center gap-4">
                <span className="text-gray-700 font-semibold text-base">عدد الموظفين في التقرير:</span>
                <span className="text-blue-900 font-extrabold text-2xl font-mono">{payments.length}</span>
                </div>

                {/* Committee Signature */}
                <div className="mt-10 w-full bg-white rounded-xl shadow-md p-6 text-sm font-[Cairo]">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 text-center">
                    {['عضو', 'عضو', 'عضو', 'رئيس اللجنة'].map((role, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                        <label className="font-bold mb-4 text-gray-700">{role}</label>
                        <input
                        type="text"
                        placeholder="الاسم"
                        className="border-t-1 border-black w-full max-w-[300px] text-center text-sm font-semibold focus:outline-none focus:border-blue-500 transition"
                        />
                    </div>
                    ))}
                    </div>
                </div>
          </div>
        ) : (
          <p className="text-center text-gray-600">لا توجد بيانات للعرض</p>
        )}

        {/* Modal */}
        {showModal && (
          <NewPaymentModal
            payment={editingPayment}
            onClose={() => { setShowModal(false); setEditingPayment(null); }}
            onSaved={() => { setShowModal(false); setEditingPayment(null); fetchPayments(); }}
          />
        )}
      </div>
    </div>
  );
}
