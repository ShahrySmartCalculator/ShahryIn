'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Dialog } from '@headlessui/react';

const supabase = createClient();

export default function AllEmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [officeName, setOfficeName] = useState('');
  const [officeId, setOfficeId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

  const [offices, setOffices] = useState<{ id: string; name: string }[]>([]);

  const getAllSubOffices = async (rootId: string): Promise<string[]> => {
    const allOfficeIds = new Set<string>();
    const queue: string[] = [rootId];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId || allOfficeIds.has(currentId)) continue;

      allOfficeIds.add(currentId);

      const { data: children, error } = await supabase
        .from('offices')
        .select('id')
        .eq('parent_id', currentId);

      if (error) {
        console.error('Error fetching sub-offices:', error.message);
        continue;
      }

      if (children?.length) {
        for (const child of children) {
          queue.push(child.id);
        }
      }
    }

    return Array.from(allOfficeIds);
  };

  useEffect(() => {
    const fetchOffices = async () => {
      const { data, error } = await supabase
        .from('offices')
        .select('id, name')
        .order('name');
      if (error) {
        console.error('Error loading offices:', error.message);
        return;
      }
      setOffices(data || []);
    };

    fetchOffices();
  }, []);

  // Fetch user, office, employees on mount
  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

      const officeIds = await getAllSubOffices(office.id);

      const { data: employeesData } = await supabase
        .from('employees')
        .select('*, office:offices(name)')
        .in('office_id', officeIds)
        .order('first_name');

      setEmployees(employeesData || []);
      setFiltered(employeesData || []);
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(employees);
      return;
    }

    const lowerSearch = search.toLowerCase();
    const result = employees.filter((e) => {
      const fullName = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase();
      return fullName.includes(lowerSearch);
    });

    setFiltered(result);
  }, [search, employees]);

  const handleSave = async (formData: any) => {
    if (selectedEmployee?.id) {
      // Clean formData to only fields allowed for update
      const fieldsToUpdate = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        certificate: formData.certificate,
        job_title: formData.job_title,
        hire_date: formData.hire_date,
        bank_account: formData.bank_account,
        bank: formData.bank,
        note: formData.note,
        office_id: formData.office_id,
      };
  
      const { error } = await supabase
        .from('employees')
        .update(fieldsToUpdate)
        .eq('id', selectedEmployee.id);
  
      if (error) {
        alert('Error updating employee: ' + error.message);
        return;
      }
  
      // Refetch updated employee with office relation
      const { data: updatedEmp, error: fetchError } = await supabase
        .from('employees')
        .select('*, office:offices(name)')
        .eq('id', selectedEmployee.id)
        .single();
  
      if (fetchError) {
        alert('Error fetching updated employee data: ' + fetchError.message);
        return;
      }
  
      setEmployees(prev =>
        prev.map(emp => (emp.id === selectedEmployee.id ? updatedEmp : emp))
      );
  
      alert('تم تحديث البيامات بمجاح!');
    } else {
      // Insert case remains unchanged
      const { data, error } = await supabase
        .from('employees')
        .insert([{ ...formData, office_id: officeId }])
        .select('*, office:offices(name)')
        .single();
  
      if (error) {
        alert('Error adding employee: ' + error.message);
        return;
      }
  
      if (data) {
        setEmployees(prev => [...prev, data]);
        alert('تم اضافة الموظف بمجاح!');
      }
    }
  
    setIsModalOpen(false);
  };

  const bankOptions = [
    'مصرف الرافدين',
    'البنك المركزي',
    'بنك التنمية العراقية',
    'مصرف التسليف',
    'بنك الخليج',
  ];

  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rtl" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-4 font-[Cairo]">
        {/* Header & Filters */}
        <div className="bg-gradient-to-l from-indigo-100 via-white to-blue-100 rounded-xl shadow-lg border border-blue-200 p-4 mb-6 print:hidden">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-between gap-4 text-sm sm:text-base text-gray-800 mb-4">
            <div className="min-w-[180px]">
              <span className="font-semibold">المستخدم:</span> {userEmail ?? 'غير متوفر'}
            </div>
            <div className="min-w-[180px]">
              <span className="font-semibold">الدائرة:</span> {officeName ?? 'لا يوجد دائرة'}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="search" className="whitespace-nowrap">
                البحث:
              </label>
              <input
                type="text"
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="اسم الموظف"
                className="border border-gray-300 bg-white px- py-1 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm w-full sm:w-60"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center sm:justify-start gap-3">
            <Link
              href="/home"
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-1.5 rounded shadow-sm text-center transition"
            >
              الرئيسية
            </Link>
            <button
              onClick={() => {
                setSelectedEmployee(null);
                setIsModalOpen(true);
              }}
              className="bg-blue-600 text-white hover:bg-blue-700 px-5 py-1.5 rounded shadow-sm transition"
            >
              إضافة موظف
            </button>
            <button
              onClick={() => window.print()}
              className="bg-green-600 text-white hover:bg-green-700 px-5 py-1.5 rounded shadow-sm transition"
            >
              طباعة التقرير
            </button>
          </div>
        </div>

        {/* Table */}
        {filtered.length > 0 ? (
          <div className="bg-white rounded-xl shadow p-4 print:shadow-none overflow-x-auto">
            <div className="hidden print:flex justify-center items-center mb-4 text-xl gap-8">
              <div>{officeName}</div>
            </div>
            <table className="min-w-[1000px] w-full border-collapse border text-center text-sm" dir="rtl">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="border p-2 text-sm">الاسم</th>
                  {/* <th className="border p-2 text-sm">الدائرة</th> */}
                  <th className="border p-2 text-sm">الشهادة</th>
                  <th className="border p-2 text-sm">العنوان الوظيفي</th>
                  <th className="border p-2 text-sm">تاريخ التعيين</th>
                  <th className="border p-2 text-sm">رقم الحساب المصرفي</th>
                  <th className="border p-2 text-sm">المصرف</th>
                  <th className="border p-2 text-sm">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="border p-2 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedEmployee(e);
                          setIsModalOpen(true);
                        }}
                        className="text-blue-600 hover:underline print:text-black"
                      >
                        {e.first_name} {e.last_name}
                      </button>
                    </td>
                    {/* <td className="border p-2">{e.office?.name || '—'}</td> */}
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

            <div className="mt-4 flex justify-center bg-white rounded-xl shadow-md p-4 text-right font-semibold text-lg">
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
          offices={offices}
        />
      </div>
    </div>
  );
}

function EmployeeFormModal({
  isOpen,
  onClose,
  employee,
  onSave,
  offices,
}: {
  isOpen: boolean;
  onClose: () => void;
  employee: any | null;
  onSave: (formData: any) => void;
  offices: { id: string; name: string }[];
}) {
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (employee) {
      setForm(employee);
    } else {
      setForm({});
    }
  }, [employee]);

  const handleChange = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  // Add this inside the component to fix errors:
  const bankOptions: string[] = [
    'مصرف الرافدين',
    'مصرف الرشيد',
  ];

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto text-sm">
      <div className="flex items-center justify-center min-h-screen bg-black bg-opacity-50 p-4">
        <Dialog.Panel className="bg-white w-full max-w-2xl rounded-xl p-6 shadow-lg" dir="rtl">
          <Dialog.Title className="text-lg font-semibold mb-6 text-gray-800">
            {employee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
          </Dialog.Title>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['الاسم الأول', 'first_name', 'text'],
              ['اللقب', 'last_name', 'text'],
              ['الشهادة', 'certificate', 'text'],
              ['العنوان الوظيفي', 'job_title', 'text'],
              ['تاريخ التعيين', 'hire_date', 'date'],
              ['رقم الحساب المصرفي', 'bank_account', 'text'],
            ].map(([label, field, type]) => (
              <div key={field}>
                <label className="block mb-1 text-gray-700 font-medium">{label}</label>
                <input
                  type={type}
                  className="w-full border border-gray-300 rounded-md px-3 py-1 text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  value={form[field] || ''}
                  onChange={(e) => handleChange(field, e.target.value)}
                  placeholder={`أدخل ${label}`}
                />
              </div>
            ))}

            {/* Bank dropdown */}
            <div>
              <label className="block mb-1 text-gray-700 font-medium">اسم المصرف</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-0.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                value={form.bank || ''}
                onChange={(e) => handleChange('bank', e.target.value)}
              >
                <option value="" disabled>
                  اختر المصرف
                </option>
                {bankOptions.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
              </select>
            </div>

            {/* Office dropdown */}
            <div>
              <label htmlFor="office-select" className="block mb-1 text-gray-700 font-medium">
                الدائرة
              </label>
              <select
                id="office-select"
                value={form.office_id || ''}
                onChange={(e) => handleChange('office_id', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-1 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              >
                <option value="" disabled>
                  -- اختر الدائرة --
                </option>
                {offices.map((office) => (
                  <option key={office.id} value={office.id}>
                    {office.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes textarea */}
            <div className="md:col-span-2">
              <label className="block mb-1 text-gray-700 font-medium">ملاحظات</label>
              <textarea
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-1 text-base placeholder-gray-400 resize-y focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                value={form.note || ''}
                onChange={(e) => handleChange('note', e.target.value)}
                placeholder="أدخل ملاحظات إضافية (اختياري)"
              />
            </div>
          </div>
{/* Buttons */}
<div className="mt-6 flex justify-end gap-4">
  <button
    onClick={onClose}
    className="px-5 py-1 bg-gray-200 text-gray-800 text-lg rounded-md shadow-sm hover:bg-gray-300 transition-colors duration-300"
  >
    إلغاء
  </button>
  <button
    onClick={() => onSave(form)}
    className="px-5 py-1 bg-blue-600 text-white text-lg rounded-md shadow-sm hover:bg-blue-700 transition-colors duration-300"
  >
    حفظ
  </button>
</div>

        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
