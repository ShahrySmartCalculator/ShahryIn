'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
};

type Entry = {
  type: 'credit' | 'debit';
  title: string;
  amount: number;
};

export default function PaymentsNewPage() {
  const supabase = createClient();
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    employee_name: '',
    month: '',
    degree: '',
    level: '',
    salary: 0,
    certificate_percentage: 0,
    risk_percentage: 0,
    trans_pay: 0,
    retire_percentage: 0,
    note: '',
  });
  const [entryList, setEntryList] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [office, setOffice] = useState<{ name: string } | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setMessage({ type: 'error', text: 'تعذر الحصول على المستخدم الحالي.' });
        return;
      }

      setUserEmail(user.email ?? null);

      const { data: officeData, error: officeError } = await supabase
        .from('offices')
        .select('id, name')
        .eq('auth_user_id', user.id)
        .single();

      if (officeError || !officeData) {
        setOffice(null);
        setMessage({ type: 'error', text: 'لا يوجد دائرة مرتبطة' });
        return;
      }

      setOffice({ name: officeData.name });

      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .eq('office_id', officeData.id);

      if (employeesError) {
        setMessage({ type: 'error', text: 'فشل في جلب الموظفين: ' + employeesError.message });
      } else {
        setEmployees(employeesData || []);
      }
    };

    fetchUserData();
  }, [supabase]);

  const filteredEmployees = employees.filter((e) =>
    `${e.first_name} ${e.last_name}`.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const handleSelectEmployee = (employee: Employee) => {
    setFormData((prev) => ({
      ...prev,
      employee_id: employee.id,
      employee_name: `${employee.first_name} ${employee.last_name}`,
    }));
    setEmployeeSearch('');
    setDropdownOpen(false);
  };

  const addEntry = () => setEntryList([...entryList, { type: 'credit', title: '', amount: 0 }]);
  const removeEntry = (index: number) => setEntryList(entryList.filter((_, i) => i !== index));
  const handleEntryChange = (index: number, field: keyof Entry, value: any) => {
    const updated = [...entryList];
    updated[index][field] = field === 'amount' ? +value : value;
    setEntryList(updated);
  };

  const s = +formData.salary;
  const cp = +formData.certificate_percentage;
  const rp = +formData.risk_percentage;
  const tp = +formData.trans_pay;
  const rpct = +formData.retire_percentage;

  const certificatePay = (s * cp) / 100;
  const riskPay = (s * rp) / 100;
  const retireCut = (s * rpct) / 100;

  const totalCredits = entryList.filter(e => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0);
  const totalDebits = entryList.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);
  const netSalary = s + certificatePay + riskPay + tp + totalCredits - (retireCut + totalDebits);

  const validateForm = () => {
    if (!formData.employee_id) {
      setMessage({ type: 'error', text: 'الرجاء اختيار الموظف.' });
      return false;
    }
    if (!formData.month) {
      setMessage({ type: 'error', text: 'الرجاء اختيار الشهر.' });
      return false;
    }
    if (!s || s <= 0) {
      setMessage({ type: 'error', text: 'الرجاء إدخال الراتب الأساسي بشكل صحيح.' });
      return false;
    }
    if ([cp, rp, rpct].some((p) => p < 0 || p > 100)) {
      setMessage({ type: 'error', text: 'النسب المئوية يجب أن تكون بين 0 و 100.' });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    setMessage(null);
    if (!validateForm()) return;
    setLoading(true);

    const insertPayload = {
      month: `${formData.month}-01`,
      degree: +formData.degree || 0,
      level: +formData.level || 0,
      salary: s,
      employee_id: formData.employee_id,
      certificate_percentage: cp,
      risk_percentage: rp,
      trans_pay: tp,
      retire_percentage: rpct,
      created_at: new Date().toISOString(),
      net_credits: totalCredits,
      net_debits: totalDebits,
      net_salary: netSalary,
      certificate_pay: certificatePay,
      risk_pay: riskPay,
      retire_cut: retireCut,
      note: formData.note || '',
    };

    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .insert([insertPayload])
        .select()
        .single();

      if (error || !payment) throw new Error(error?.message || 'خطأ في حفظ الراتب');

      if (entryList.length) {
        const entriesToInsert = entryList.map((e) => ({ ...e, payment_id: payment.id }));
        const { error: entriesError } = await supabase.from('payments_entries').insert(entriesToInsert);
        if (entriesError) throw new Error(entriesError.message);
      }

      alert('تم حفظ البيانات بنجاح.');
      router.push('/payments/report'); // ✅ Navigate after saving
    } catch (error: any) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء الحفظ: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rtl" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="print:hidden bg-white rounded-xl shadow-lg border border-gray-200 p-4 flex flex-col sm:flex-row sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-right font-semibold text-base">
            <div>
              المستخدم:{' '}
              <span className="font-normal text-gray-700">{userEmail ?? 'غير متوفر'}</span>
            </div>
            <div>
              الدائرة:{' '}
              <span className="font-normal text-gray-700">{office?.name || 'لا يوجد دائرة مرتبطة'}</span>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-3 rounded ${
              message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Employee Search */}
        <div className="relative print:hidden">
          <input
            ref={inputRef}
            type="text"
            className="border border-gray-300 p-2 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ابحث عن موظف"
            value={employeeSearch}
            onChange={(e) => {
              setEmployeeSearch(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => employeeSearch && setDropdownOpen(true)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
          />
          {dropdownOpen && employeeSearch && filteredEmployees.length > 0 && (
            <div className="absolute top-full left-0 right-0 max-h-40 overflow-y-auto bg-white border border-gray-300 rounded shadow z-50 text-sm">
              {filteredEmployees.map((e) => (
                <div
                  key={e.id}
                  className="p-2 cursor-pointer hover:bg-gray-200"
                  onMouseDown={() => handleSelectEmployee(e)}
                >
                  {e.first_name} {e.last_name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Employee Info & Basic Fields */}
        <div className="print:hidden flex flex-col sm:flex-row flex-wrap gap-4 items-center bg-white rounded-xl shadow-lg border border-gray-200 p-4">
          {formData.employee_name && (
            <div className="font-semibold whitespace-nowrap text-lg">
              الموظف: <strong className="mr-1">{formData.employee_name}</strong>
            </div>
          )}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-semibold whitespace-nowrap">الشهر:</label>
            <input
              type="month"
              className="border border-gray-300 py-1 rounded text-sm w-full sm:w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.month}
              onChange={(e) => setFormData({ ...formData, month: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-semibold whitespace-nowrap">الدرجة:</label>
            <input
              type="number"
              min={0}
              className="border border-gray-300 py-1 rounded text-sm w-full sm:w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.degree}
              onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-semibold whitespace-nowrap">المرحلة:</label>
            <input
              type="number"
              min={0}
              className="border border-gray-300 py-1 rounded text-sm w-full sm:w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
            />
          </div>
        </div>

        {/* Salary & Percentages */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'الراتب الأساسي', key: 'salary' },
            { label: 'نسبة الشهادة (%)', key: 'certificate_percentage' },
            { label: 'نسبة الخطورة (%)', key: 'risk_percentage' },
            { label: 'بدل النقل', key: 'trans_pay' },
            { label: 'نسبة التقاعد (%)', key: 'retire_percentage' },
          ].map(({ label, key }) => (
            <div key={key} className="flex flex-col">
              <label className="text-xs font-semibold mb-1">{label}</label>
              <input
                type="number"
                min={0}
                max={key.includes('percentage') ? 100 : undefined}
                className="border border-gray-300 p-2 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={(formData as any)[key]}
                onChange={(e) => setFormData({ ...formData, [key]: +e.target.value })}
              />
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
          <label className="block mb-1 text-xs font-semibold">ملاحظات</label>
          <textarea
            className="border border-gray-300 py-2 px-3 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            rows={3}
          />
        </div>

        {/* Entries */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 print:hidden">
          <h2 className="text-base font-semibold mb-4">تفاصيل دائن / مدين</h2>
          {entryList.map((entry, idx) => (
            <div
              key={idx}
              className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3 items-center"
            >
              <select
                className="border border-gray-300 p-2 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={entry.type}
                onChange={(e) => handleEntryChange(idx, 'type', e.target.value)}
              >
                <option value="credit">دائن</option>
                <option value="debit">مدين</option>
              </select>
              <select
                className="border border-gray-300 p-2 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                min={0}
                placeholder="القيمة"
                className="border border-gray-300 p-2 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={entry.amount}
                onChange={(e) => handleEntryChange(idx, 'amount', e.target.value)}
              />
              <button
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm w-full sm:w-auto transition"
                onClick={() => removeEntry(idx)}
                type="button"
              >
                حذف
              </button>
            </div>
          ))}
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded text-sm transition"
            onClick={addEntry}
            type="button"
          >
            + إضافة إدخال
          </button>
        </div>

        {/* Summary */}
        <div className="bg-blue-100 text-blue-900 font-semibold rounded-lg p-4 text-center text-sm sm:text-base print:hidden">
          <div className="flex flex-col sm:flex-row sm:justify-center sm:gap-8">
            <div>الإجمالي الدائن: {(totalCredits + s + certificatePay + riskPay + tp).toFixed(0)}</div>
            <div>الإجمالي المدين: {(totalDebits + retireCut).toFixed(0)}</div>
            <div><strong>صافي الراتب: {netSalary.toFixed(0)}</strong></div>
          </div>
        </div>

        {/* Save Button */}
        <button
          disabled={loading}
          className={`w-full sm:w-auto py-2 px-8 text-lg rounded text-white font-semibold transition ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
          onClick={handleSave}
          type="button"
        >
          {loading ? 'جاري الحفظ...' : 'حفظ البيانات'}
        </button>
      </div>
    </div>
  );
}
