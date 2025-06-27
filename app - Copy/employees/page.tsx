'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Dialog } from '@headlessui/react';

const supabase = createClient();

export default function EmployeeReport() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [officeName, setOfficeName] = useState('');
  const [officeId, setOfficeId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [allOffices, setAllOffices] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user.email || '');

      const { data: office } = await supabase
        .from('offices')
        .select('id, name')
        .eq('auth_user_id', user.id)
        .single();

      if (!office) return;

      setOfficeName(office.name);
      setOfficeId(office.id);

      const { data: employeesData } = await supabase
        .from('employees')
        .select('*')
        .eq('office_id', office.id)
        .order('first_name');

      setEmployees(employeesData || []);
      setFiltered(employeesData || []);
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchOffices = async () => {
      const { data } = await supabase.from('offices').select('id, name');
      setAllOffices(data || []);
    };
    fetchOffices();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(employees);
      return;
    }

    const lowerSearch = search.toLowerCase();
    const result = employees.filter(e => {
      const fullName = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase();
      return fullName.includes(lowerSearch);
    });

    setFiltered(result);
  }, [search, employees]);

  const handleSave = async (formData: any) => {
    if (selectedEmployee?.id) {
      await supabase
        .from('employees')
        .update(formData)
        .eq('id', selectedEmployee.id);
      setEmployees(prev =>
        prev.map(emp => emp.id === selectedEmployee.id ? { ...emp, ...formData } : emp)
      );
    } else {
      const { data } = await supabase
        .from('employees')
        .insert([{ ...formData, office_id: officeId }])
        .select()
        .single();
      if (data) {
        setEmployees(prev => [...prev, data]);
      }
    }
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rtl" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-l from-indigo-100 via-white to-blue-100 rounded-xl shadow-lg border border-blue-200 p-4 mb-6 print:hidden font-[Cairo]">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-between gap-4 text-right text-sm sm:text-base font-medium text-gray-800 mb-4">
            <div><span className="font-semibold">المستخدم:</span> {userEmail || 'غير متوفر'}</div>
            <div><span className="font-semibold">الدائرة:</span> {officeName || 'لا يوجد دائرة'}</div>
            <div className="flex items-center gap-2">
              <label htmlFor="search">البحث:</label>
              <input
                type="text"
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="اسم الموظف"
                className="border border-gray-300 bg-white px-3 py-1 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Link href="/home" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-1.5 rounded shadow-sm transition">الرئيسية</Link>
            <button onClick={() => { setSelectedEmployee(null); setIsModalOpen(true); }} className="bg-blue-600 text-white hover:bg-blue-700 px-5 py-1.5 rounded shadow-sm transition">إضافة موظف</button>
            <button onClick={() => window.print()} className="bg-green-600 text-white hover:bg-green-700 px-5 py-1.5 rounded shadow-sm transition">طباعة التقرير</button>
          </div>
        </div>

        {/* Report Table */}
        {filtered.length > 0 ? (
          <div className="bg-white rounded-xl shadow p-4 font-[cairo] print:shadow-none overflow-x-auto">
            <table className="min-w-[900px] w-full border-collapse border text-center text-l" dir="rtl">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="border p-2">الاسم</th>
                  <th className="border p-2">الشهادة</th>
                  <th className="border p-2">العنوان الوظيفي</th>
                  <th className="border p-2">تاريخ التعيين</th>
                  <th className="border p-2">الحساب المصرفي</th>
                  <th className="border p-2">المصرف</th>
                  <th className="border p-2">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="border p-2 whitespace-nowrap">
                      <button onClick={() => { setSelectedEmployee(e); setIsModalOpen(true); }} className="text-blue-600 hover:underline print:text-black">
                        {e.first_name} {e.last_name}
                      </button>
                    </td>
                    <td className="border p-2">{e.certificate}</td>
                    <td className="border p-2">{e.job_title}</td>
                    <td className="border p-2">{e.hire_date}</td>
                    <td className="border p-2">{e.bank_account}</td>
                    <td className="border p-2">{e.bank}</td>
                    <td className="border p-2">{e.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex justify-center bg-white rounded-xl shadow-md p-4 font-semibold text-lg">
              عدد الموظفين في التقرير: {filtered.length}
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-600">لا توجد بيانات لعرضها</p>
        )}

        {/* Modal */}
        <EmployeeFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          employee={selectedEmployee}
          onSave={handleSave}
          allOffices={allOffices}
          currentOfficeId={officeId}
        />
      </div>
    </div>
  );
}

// 🔧 Modal Component with Office Dropdown
function EmployeeFormModal({
  isOpen,
  onClose,
  employee,
  onSave,
  allOffices,
  currentOfficeId,
}: {
  isOpen: boolean;
  onClose: () => void;
  employee: any | null;
  onSave: (formData: any) => void;
  allOffices: any[];
  currentOfficeId: string;
}) {
  const [form, setForm] = useState<any>(employee || { office_id: currentOfficeId });

  useEffect(() => {
    setForm(employee || { office_id: currentOfficeId });
  }, [employee, currentOfficeId]);

  const handleChange = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto text-xs">
      <div className="flex items-center justify-center min-h-screen bg-black bg-opacity-40 p-2">
        <Dialog.Panel className="bg-white w-full max-w-2xl rounded p-4" dir="rtl">
        <Dialog.Title className="text-lg font-semibold mb-6 text-gray-900">
  {employee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
</Dialog.Title>

<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {[
    ['الاسم الأول', 'first_name'],
    ['اللقب', 'last_name'],
    ['الشهادة', 'certificate'],
    ['العنوان الوظيفي', 'job_title'],
    ['تاريخ التعيين', 'hire_date', 'date'],
    ['رقم الحساب المصرفي', 'bank_account'],
    ['اسم المصرف', 'bank'],
  ].map(([label, field, type]) => (
    <div key={field}>
      {/* <label className="block text-sm font-medium mb-2 text-gray-700">{label}</label> */}
      <input
        type={type || 'text'}
        className="w-full rounded-md border border-gray-300 px-3 py-0.5 text-base text-gray-800
                   placeholder-gray-400
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                   transition"
        value={form[field] || ''}
        onChange={(e) => handleChange(field, e.target.value)}
        placeholder={` ${label}`}
      />
    </div>
  ))}

  <div>
    {/* <label className="block text-sm font-medium mb-2 text-gray-700">الدائرة</label> */}
    <select
      className="w-full rounded-md border border-gray-300 px-3 py-0.5 text-base text-gray-800
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                 transition"
      value={form.office_id || ''}
      onChange={(e) => handleChange('office_id', e.target.value)}
    >
      <option value="">اختر دائرة</option>
      {allOffices.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  </div>

  <div className="md:col-span-2">
    <label className="block text-sm font-medium mb-2 text-gray-700">ملاحظات</label>
    <textarea
      rows={3}
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-800
                 placeholder-gray-400 resize-y
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                 transition"
      value={form.note || ''}
      onChange={(e) => handleChange('note', e.target.value)}
      placeholder=" الملاحظات "
    />
  </div>
</div>

<div className="mt-6 flex justify-end gap-3">
  <button
    onClick={onClose}
    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-l font-medium text-gray-700 transition"
  >
    إلغاء
  </button>
  <button
    onClick={() => onSave(form)}
    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-l font-medium text-white transition"
  >
    حفظ
  </button>
</div>

        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
