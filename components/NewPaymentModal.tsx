'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';

interface PaymentEntry {
  id?: string;
  title: string;
  amount: number;
  type: 'credit' | 'debit';
}

interface Payment {
  id?: string;
  employee: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  month: string | null;
  salary: number | null;
  certificate_percentage: number | null;
  risk_percentage: number | null;
  retire_percentage: number | null;
  trans_pay: number | null;
  note: string | null;
  degree: number | null;
  level: number | null;
  payments_entries?: PaymentEntry[];
}

interface Props {
  onClose: () => void;
  onSaved: () => void;
  payment?: Payment | null;
}

export default function NewPaymentModal({ onClose, onSaved, payment }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const isEdit = !!payment;

  const [salary, setSalary] = useState(0);
  const [certificatePercentage, setCertificatePercentage] = useState(0);
  const [riskPercentage, setRiskPercentage] = useState(0);
  const [retirePercentage, setRetirePercentage] = useState(0);
  const [transPay, setTransPay] = useState(0);
  const [note, setNote] = useState('');
  const [degree, setDegree] = useState(1);
  const [level, setLevel] = useState(1);
  const [entries, setEntries] = useState<PaymentEntry[]>([]);

  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<{ id: string; name: string }[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');

  useEffect(() => {
    if (payment) {
      setSalary(payment.salary ?? 0);
      setCertificatePercentage(payment.certificate_percentage ?? 0);
      setRiskPercentage(payment.risk_percentage ?? 0);
      setRetirePercentage(payment.retire_percentage ?? 0);
      setTransPay(payment.trans_pay ?? 0);
      setNote(payment.note ?? '');
      setDegree(payment.degree ?? 1);
      setLevel(payment.level ?? 1);
      setEntries(payment.payments_entries ?? []);
    } else {
      setSalary(0);
      setCertificatePercentage(0);
      setRiskPercentage(0);
      setRetirePercentage(0);
      setTransPay(0);
      setNote('');
      setDegree(1);
      setLevel(1);
      setEntries([]);
      setSelectedEmployee(null);
      setSearchText('');
      setSelectedMonth('');
    }
  }, [payment]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchText.length < 2) {
        setSuggestions([]);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: office } = await supabase
        .from('offices')
        .select('id, name')
        .eq('auth_user_id', user.id)
        .single();

      if (!office) return;

      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .eq('office_id', office.id)
        .ilike('first_name', `%${searchText}%`);

      if (data) {
        setSuggestions(
          data.map((e) => ({
            id: e.id,
            name: `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim(),
          }))
        );
      }
    };
    fetchSuggestions();
  }, [searchText]);

  const handleEntryChange = (index: number, field: keyof PaymentEntry, value: any) => {
    const updated = [...entries];
    updated[index][field] = value;
    setEntries(updated);
  };

  const handleDelete = async () => {
    if (!payment?.id) return;
  
    const confirmDelete = window.confirm('هل أنت متأكد أنك تريد حذف هذا الراتب؟');
    if (!confirmDelete) return;
  
    try {
      await supabase.from('payments_entries').delete().eq('payment_id', payment.id);
      const { error } = await supabase.from('payments').delete().eq('id', payment.id);
  
      if (error) throw error;
  
      alert('تم حذف الراتب بنجاح');
      onClose();      // close modal
      onSaved();      // refresh list
    } catch (err: any) {
      console.error('Delete error:', err.message);
      alert('حدث خطأ أثناء الحذف');
    }
  };
  




  const handleAddEntry = () => {
    setEntries([...entries, { title: '', amount: 0, type: 'credit' }]);
  };

  const handleRemoveEntry = (index: number) => {
    const updated = [...entries];
    updated.splice(index, 1);
    setEntries(updated);
  };

  const handleSubmit = async () => {
    const employeeId = payment?.employee?.id ?? selectedEmployee?.id;
    const month = payment?.month ?? (selectedMonth ? `${selectedMonth}-01` : '');

    if (!employeeId || !month) {
      alert('يرجى اختيار الموظف والشهر!');
      return;
    }

    const newPaymentId = payment?.id ?? uuidv4();
    const basePayment = {
      id: newPaymentId,
      employee_id: employeeId,
      month,
      salary,
      certificate_percentage: certificatePercentage,
      risk_percentage: riskPercentage,
      retire_percentage: retirePercentage,
      trans_pay: transPay,
      note,
      degree,
      level,
    };

    try {
      if (isEdit) {
        await supabase.from('payments').update(basePayment).eq('id', payment.id);
        await supabase.from('payments_entries').delete().eq('payment_id', payment.id);
      } else {
        await supabase.from('payments').insert(basePayment);
      }

      if (entries.length > 0) {
        const formattedEntries = entries.map((e) => ({
          id: uuidv4(),
          payment_id: newPaymentId,
          title: e.title,
          amount: e.amount,
          type: e.type,
        }));
        await supabase.from('payments_entries').insert(formattedEntries);
      }

      alert('تم الحفظ بنجاح ✅');

      if (!isEdit) {
        setSalary(0);
        setCertificatePercentage(0);
        setRiskPercentage(0);
        setRetirePercentage(0);
        setTransPay(0);
        setNote('');
        setEntries([]);
        setSelectedEmployee(null);
        setSearchText('');
        setSelectedMonth('');
        setDegree(1);
        setLevel(1);
      }

      onSaved();
      router.push('/payments/report');
    } catch (error: any) {
      console.error(error);
      alert('حدث خطأ أثناء الحفظ');
    }
  };


return (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div
      className="bg-white rounded-lg shadow-lg p-4 sm:p-6 max-w-xl w-[95%] sm:w-full relative max-h-[90vh] overflow-y-auto"
      dir="rtl"
    >
      <h2 className="text-lg font-bold mb-4 text-center">
        {isEdit ? 'تعديل راتب' : 'إضافة راتب جديد'}
      </h2>

      {/* Employee & Month Selectors */}
      {!isEdit && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={selectedEmployee?.name || searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setSelectedEmployee(null);
              }}
              placeholder="ابحث بالاسم..."
              className="w-full border px-2 py-1 rounded"
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-10 w-full border bg-white rounded mt-1 max-h-40 overflow-y-auto text-sm shadow-md">
                {suggestions.map((emp) => (
                  <li
                    key={emp.id}
                    className="px-3 py-1 hover:bg-blue-100 cursor-pointer"
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setSearchText('');
                      setSuggestions([]);
                    }}
                  >
                    {emp.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex-1">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full border px-2 py-1 rounded"
            />
          </div>
        </div>
      )}

      {/* Degree & Level Selectors */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4 text-sm">
        <div className="flex-1">
          <select
            value={degree ?? ''}
            onChange={(e) => setDegree(e.target.value ? Number(e.target.value) : null)}
            className="w-full border px-2 py-1 rounded"
          >
            <option value="">اختر الدرجة</option>
            {[...Array(10)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                الدرجة - {i + 1}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <select
            value={level ?? ''}
            onChange={(e) => setLevel(e.target.value ? Number(e.target.value) : null)}
            className="w-full border px-2 py-1 rounded"
          >
            <option value="">اختر المرحلة</option>
            {[...Array(11)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                المرحلة - {i + 1}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Numeric Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-4">
        {[
          { label: 'الراتب', value: salary, setValue: setSalary },
          { label: 'بدل الشهادة (%)', value: certificatePercentage, setValue: setCertificatePercentage },
          { label: 'بدل الخطورة (%)', value: riskPercentage, setValue: setRiskPercentage },
          { label: 'استقطاع التقاعد (%)', value: retirePercentage, setValue: setRetirePercentage },
          { label: 'بدل النقل', value: transPay, setValue: setTransPay },
        ].map(({ label, value, setValue }, i) => (
          <label key={i} className="flex flex-col">
            {label}:
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-full border px-2 py-1 rounded"
            />
          </label>
        ))}
        <label className="flex flex-col col-span-1 sm:col-span-2">
          الملاحظات:
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border px-2 py-1 rounded"
          />
        </label>
      </div>

      {/* Entries */}
      <div className="mt-4">
        <div className="flex items-center mb-2">
          <button onClick={handleAddEntry} className="bg-blue-500 text-white px-3 py-1 rounded">
            إضافة
          </button>
        </div>

        {entries.map((entry, index) => (
          <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center mb-2 text-sm">
            <select
              value={entry.type}
              onChange={(e) => handleEntryChange(index, 'type', e.target.value as 'credit' | 'debit')}
              className="border px-2 py-1 rounded"
            >
              <option value="credit">دائن</option>
              <option value="debit">مدين</option>
            </select>

            <select
              value={entry.title}
              onChange={(e) => handleEntryChange(index, 'title', e.target.value)}
              className="border px-2 py-1 rounded"
            >
              <option value="">اختر العنوان</option>
              <option value="م منصب">م منصب</option>
              <option value="م زوجية">م زوجية</option>
              <option value="م اطفال">م اطفال</option>
              <option value="سلقة موظف">سلقة موظف</option>
              <option value="سلقة زواج">سلقة زواج</option>
              <option value="قرض مصرفي">قرض مصرفي</option>
              <option value="ضريبة">ضريبة</option>
              <option value="رسم طابع">رسم طابع</option>
            </select>

            <input
              type="number"
              value={entry.amount}
              onChange={(e) => handleEntryChange(index, 'amount', Number(e.target.value))}
              className="border px-2 py-1 rounded"
              placeholder="المبلغ"
            />

            <button onClick={() => handleRemoveEntry(index)} className="text-red-600 hover:text-red-800">
              حذف
            </button>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-wrap justify-between items-center gap-3">
      <div className="flex gap-2 ml-auto">
          <button
            onClick={onClose}
            className="bg-gray-300 px-4 py-1 rounded hover:bg-gray-400"
          >
            إلغاء
          </button>
        </div>
      
      <button
            onClick={handleSubmit}
            className="bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600"
          >
            حفظ
          </button>

        {isEdit && (
          <button
            onClick={handleDelete}
            className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
          >
            حذف
          </button>
        )}

      </div>
    </div>
  </div>
);
