'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import dayjs from 'dayjs';
import { useRouter, useSearchParams } from 'next/navigation';

interface Entry {
  id?: string;
  type: string;
  title: string;
  amount: number;
}

export default function EditPaymentPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const employeeIdFromQuery = searchParams.get('employeeId') || '';
  const monthFromQuery = searchParams.get('month') || '';

  const [employeeId, setEmployeeId] = useState(employeeIdFromQuery);
  const [month, setMonth] = useState(monthFromQuery);

  const [payment, setPayment] = useState<any>(null);

  const [salary, setSalary] = useState('');
  const [certificatePercentage, setCertificatePercentage] = useState('');
  const [riskPercentage, setRiskPercentage] = useState('');
  const [retirePercentage, setRetirePercentage] = useState('');
  const [transPay, setTransPay] = useState('');
  const [note, setNote] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!employeeId || !month) return;

    const fetchPayment = async () => {
      setError('');
      setMessage('');
      setPayment(null);

      const formattedMonth = dayjs(`${month}-01`).format('YYYY-MM-DD');
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          employee:employee_id (
            first_name,
            last_name
          )
        `)
        .eq('employee_id', employeeId)
        .eq('month', formattedMonth)
        .single();

      if (error || !data) {
        setError('لم يتم العثور على بيانات الراتب.');
        return;
      }

      setPayment(data);
      setSalary(data.salary || '');
      setCertificatePercentage(data.certificate_percentage || '');
      setRiskPercentage(data.risk_percentage || '');
      setTransPay(data.trans_pay || '');
      setRetirePercentage(data.retire_percentage || '');
      setNote(data.note || '');

      const { data: entryData } = await supabase
        .from('payments_entries')
        .select('*')
        .eq('payment_id', data.id);

      setEntries(entryData || []);
    };

    fetchPayment();
  }, [employeeId, month, supabase]);

  const validatePercent = (value: number) => value >= 0 && value <= 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (
      !validatePercent(+certificatePercentage) ||
      !validatePercent(+riskPercentage) ||
      !validatePercent(+retirePercentage)
    ) {
      setError('يرجى التأكد من أن النسب بين 0 و 100');
      return;
    }

    if (!payment) {
      setError('لا يوجد بيانات للمعالجة.');
      return;
    }

    const { error } = await supabase
      .from('payments')
      .update({
        salary,
        certificate_percentage: certificatePercentage,
        risk_percentage: riskPercentage,
        trans_pay: transPay,
        retire_percentage: retirePercentage,
        note,
      })
      .eq('id', payment.id);

    if (error) {
      setError('حدث خطأ أثناء تحديث الراتب');
      return;
    }

    await supabase.from('payments_entries').delete().eq('payment_id', payment.id);

    const newEntries = entries.map((entry) => ({
      ...entry,
      payment_id: payment.id,
    }));
    await supabase.from('payments_entries').insert(newEntries);

    alert('✅ تم تحديث بيانات الراتب بنجاح.');
    router.back();
  };

  const handleEntryChange = (idx: number, field: keyof Entry, value: any) => {
    const updated = [...entries];
    updated[idx] = { ...updated[idx], [field]: field === 'amount' ? +value : value };
    setEntries(updated);
  };

  const addEntry = () => {
    setEntries([...entries, { type: 'credit', title: '', amount: 0 }]);
  };

  const removeEntry = (idx: number) => {
    const updated = [...entries];
    updated.splice(idx, 1);
    setEntries(updated);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rtl" dir="rtl">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">
          تعديل بيانات راتب{' '}
          <span className="text-indigo-700">
            {payment?.employee?.first_name} {payment?.employee?.last_name}
          </span>{' '}
          — {dayjs(month + '-01').format('MMMM YYYY')}
        </h1>

        {error && (
          <p className="text-red-600 text-sm mb-4 border border-red-300 bg-red-100 p-2 rounded">
            {error}
          </p>
        )}
        {message && (
          <p className="text-green-700 text-sm mb-4 border border-green-300 bg-green-100 p-2 rounded">
            {message}
          </p>
        )}

        {payment ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-4 text-center">
              {/* Salary */}
              <div>
                <label className="block mb-1 text-sm font-semibold">الراتب الأساسي</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  min={0}
                />
              </div>
              {/* Certificate Percentage */}
              <div>
                <label className="block mb-1 text-sm font-semibold">نسبة الشهادة (%)</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={certificatePercentage}
                  onChange={(e) => setCertificatePercentage(e.target.value)}
                  min={0}
                  max={100}
                />
              </div>
              {/* Risk Percentage */}
              <div>
                <label className="block mb-1 text-sm font-semibold">نسبة الخطورة (%)</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={riskPercentage}
                  onChange={(e) => setRiskPercentage(e.target.value)}
                  min={0}
                  max={100}
                />
              </div>
              {/* Transportation Pay */}
              <div>
                <label className="block mb-1 text-sm font-semibold">بدل النقل</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={transPay}
                  onChange={(e) => setTransPay(e.target.value)}
                  min={0}
                />
              </div>
              {/* Retire Percentage */}
              <div>
                <label className="block mb-1 text-sm font-semibold">نسبة التقاعد (%)</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={retirePercentage}
                  onChange={(e) => setRetirePercentage(e.target.value)}
                  min={0}
                  max={100}
                />
              </div>
              {/* Notes */}
              <div>
                <label className="block mb-1 text-sm font-semibold">ملاحظات</label>
                <textarea
                  className="w-full border border-gray-300 p-2 rounded text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            {/* Entries Section */}
            <div className="border-t pt-4">
              <h2 className="font-semibold text-lg mb-4 text-center">تفاصيل دائن / مدين</h2>
              {entries.map((entry, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-8 gap-3 mb-3 items-center"
                >
                  <select
                    className="border border-gray-300 p-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={entry.type}
                    onChange={(e) => handleEntryChange(idx, 'type', e.target.value)}
                  >
                    <option value="credit">دائن</option>
                    <option value="debit">مدين</option>
                  </select>
                  <select
                    className="border border-gray-300 p-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={entry.title}
                    onChange={(e) => handleEntryChange(idx, 'title', e.target.value)}
                  >
                    <option value="">اختر العنوان</option>
                    <option value="م منصب">م منصب</option>
                    <option value="م زوجية">م زوجية</option>
                    <option value="م اطفال">م اطفال</option>
                    <option value="سلقة موظف">سلقة موظف</option>
                    <option value="سلقة زواج">سلقة زواج</option>
                    <option value="قرض مصرفي">قرض مصرفي</option>
                    <option value="ضريبة">ضريبة</option>
                  </select>
                  <input
                    type="number"
                    className="border border-gray-300 p-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={entry.amount}
                    onChange={(e) => handleEntryChange(idx, 'amount', e.target.value)}
                    min={0}
                  />
                  <button
                    type="button"
                    onClick={() => removeEntry(idx)}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded transition"
                    aria-label="حذف الإدخال"
                  >
                    حذف
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2 rounded transition"
                onClick={addEntry}
              >
                + إضافة إدخال
              </button>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-semibold transition"
              >
                تحديث
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded font-semibold transition"
              >
                رجوع
              </button>
            </div>
          </form>
        ) : (
          <p className="text-center text-gray-500 text-lg py-12">جارِ تحميل بيانات الراتب...</p>
        )}
      </div>
    </div>
  );
}
