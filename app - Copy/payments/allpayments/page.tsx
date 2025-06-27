'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import NewPaymentModal from '@/components/NewPaymentModal';

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  office?: { name: string } | null;
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

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [office, setOffice] = useState<{ id: string; name: string } | null>(null);
  const [monthFilter, setMonthFilter] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingCopy, setLoadingCopy] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  function normalizeMonth(month: string) {
    return `${month}-01`;
  }

  function getNextMonth(month: string) {
    const [year, m] = month.split('-').map(Number);
    const next = new Date(year, m); // m is zero-based index for months in Date()
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  }

  // This function recursively collects all descendant office IDs including the root office
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

  // Fetch payments for the current office and all its sub offices
  const fetchPayments = async () => {
    if (!office) {
      setPayments([]);
      return;
    }

    setLoadingPayments(true);

    try {
      // Get all office IDs including sub offices
      const officeIds = await getOfficeAndDescendantsIds(office.id);

      // Get all employees for those offices
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id')
        .in('office_id', officeIds);

      if (employeesError) throw employeesError;

      const employeeIds = employeesData?.map((e) => e.id) || [];

      if (employeeIds.length === 0) {
        setPayments([]);
        setLoadingPayments(false);
        return;
      }

      // Query payments for these employees
      let query = supabase
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
        query = query.eq('month', normalizeMonth(monthFilter));
      }

      const { data, error } = await query;

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

  // Your handleCopyToNextMonth function unchanged (or update similarly if needed)
  // Your printReport function unchanged

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

  // Fetch payments whenever office or month filter changes
  useEffect(() => {
    fetchPayments();
  }, [office, monthFilter]);

  const shouldShowData = payments.length > 0;

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
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center gap-3">
            {[ 
              { type: 'link', label: 'الرئيسية', href: '/home' },
              { type: 'button', label: 'إضافة راتب جديد', onClick: () => setShowModal(true) },
              { type: 'link', label: 'تقرير التقاعد', href: '/retirement' },
              { type: 'link', label: 'تقرير الضرائب', href: '/tax-report' },
              // add more buttons here as needed
              { type: 'button', label: loadingCopy ? 'جاري الإنشاء...' : 'إنشاء رواتب الشهر القادم', onClick: async () => {/* your copy logic here */}, disabled: loadingCopy },
              { type: 'button', label: 'طباعة التقرير', onClick: () => window.print() },
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
                    btn.disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 active:scale-95'
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
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    {[
                      'الاسم', 'الدرجة', 'المرحلة', 'الراتب',  'بدل الشهادة',
                      'بدل الخطورة', 'بدل النقل',  'استقطاع التقاعد',
                      'الاستحقاق', 'الاستقطاع', 'الصافي'
                    ].map((head, idx) => (
                      <th key={idx} className="border p-2 whitespace-nowrap font-bold">{head}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {payments.map((p) => {
                    const salary = p.salary || 0;
                    const cert = (salary * (p.certificate_percentage || 0)) / 100;
                    const risk = (salary * (p.risk_percentage || 0)) / 100;
                    const trans = p.trans_pay || 0;
                    const retire = (salary * (p.retire_percentage || 0)) / 100;

                    const totalNetCredits = (p.payments_entries || [])
                      .filter(e => e.type === 'credit')
                      .reduce((sum, e) => sum + (e.amount || 0), 0);

                    const totalNetDebits = (p.payments_entries || [])
                      .filter(e => e.type === 'debit')
                      .reduce((sum, e) => sum + (e.amount || 0), 0);

                    const credits = salary + cert + risk + trans + totalNetCredits;
                    const debits = retire + totalNetDebits;
                    const net = credits - debits;

                    return (
                      <React.Fragment key={p.id}>
                        <tr className="hover:bg-gray-50 cursor-pointer">
                          <td className="border p-2 whitespace-nowrap">
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
                          <td className="border p-2 whitespace-nowrap">{p.degree?.toLocaleString('ar-IQ') ?? ''}</td>
                          <td className="border p-2 whitespace-nowrap">{p.level?.toLocaleString('ar-IQ') ?? ''}</td>
                          <td className="border p-2 font-mono text-blue-900 font-extrabold whitespace-nowrap">
                            {salary.toLocaleString('ar-IQ')}
                          </td>
                          <td className="border p-2 font-mono text-blue-900 font-extrabold whitespace-nowrap">
                            {Number(cert.toFixed(0)).toLocaleString('ar-IQ')}
                          </td>
                          <td className="border p-2 font-mono text-blue-900 font-extrabold whitespace-nowrap">
                            {Number(risk.toFixed(0)).toLocaleString('ar-IQ')}
                          </td>
                          <td className="border p-2 font-mono text-blue-900 font-extrabold whitespace-nowrap">
                            {trans.toLocaleString('ar-IQ')}
                          </td>
                          <td className="border p-2 font-mono text-blue-900 font-extrabold whitespace-nowrap">
                            {Number(retire.toFixed(0)).toLocaleString('ar-IQ')}
                          </td>
                          <td className="border p-2 font-mono text-blue-900 font-extrabold whitespace-nowrap">
                            {Number(credits.toFixed(0)).toLocaleString('ar-IQ')}
                          </td>
                          <td className="border p-2 font-mono text-blue-900 font-extrabold whitespace-nowrap">
                            {Number(debits.toFixed(0)).toLocaleString('ar-IQ')}
                          </td>
                          <td className="border p-2 font-bold font-mono text-blue-900 whitespace-nowrap">
                            {Number(net.toFixed(0)).toLocaleString('ar-IQ')}
                          </td>
                        </tr>

                        {(p.note || (p.payments_entries?.length ?? 0) > 0) && (
                          <tr>
                            <td colSpan={14} className="border p-2 text-xs text-right bg-gray-50">
                              {p.payments_entries?.length > 0 && (
                                <div className="mb-1">
                                  {p.payments_entries.map((entry) =>
                                    `• ${entry.title} / ${entry.amount.toLocaleString('ar-IQ')}`
                                  ).join(' ؛ ')}
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
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    {
                    label: 'إجمالي الراتب',
                    value: payments.reduce((s, p) => s + (p.salary || 0), 0),
                    bg: 'bg-blue-100',
                    border: 'border-blue-300',
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
                    },
                ].map(({ label, value, bg, border }, idx) => (
                    <div
                    key={idx}
                    className={`rounded-xl p-5 shadow font-[Cairo] text-center ${bg} ${border} border`}
                    >
                    <div className="text-gray-700 font-semibold text-base mb-2">{label}</div>
                    <div className="text-blue-900 font-extrabold text-2xl font-mono">
                        {value.toLocaleString('ar-IQ')} د.ع
                    </div>
                    </div>
                ))}
                </div>

                {/* Employee Count */}
                <div className="mt-6 rounded-xl p-5 shadow font-[Cairo] bg-indigo-50 border border-indigo-200 flex justify-center items-center gap-4">
                <span className="text-gray-700 font-semibold text-base">عدد الموظفين في التقرير:</span>
                <span className="text-blue-900 font-extrabold text-2xl font-mono">{payments.length}</span>
                </div>

                {/* Committee Signature */}
                <div className="mt-6 w-full bg-white rounded-xl shadow-md p-6 text-sm font-[Cairo]">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 text-center">
                    {['عضو', 'عضو', 'عضو', 'رئيس اللجنة'].map((role, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                        <label className="font-bold mb-4 text-gray-700">{role}</label>
                        <input
                        type="text"
                        placeholder="الاسم"
                        className="border-t-2 border-black w-full max-w-[280px] text-center text-lg font-semibold focus:outline-none focus:border-blue-500 transition"
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
