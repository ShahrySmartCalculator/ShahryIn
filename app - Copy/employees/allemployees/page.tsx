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
  
// New state to hold grouped employees
const [groupedEmployees, setGroupedEmployees] = useState<Record<string, { officeName: string, employees: any[] }>>({});

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
        .select('*, office:offices(name)')
        .single();
      if (data) {
        setEmployees(prev => [...prev, data]);
      }
    }
    setIsModalOpen(false);
  };

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
              <label htmlFor="search" className="whitespace-nowrap">البحث:</label>
              <input
                type="text"
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="اسم الموظف"
                className="border border-gray-300 bg-white px-3 py-1 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm w-full sm:w-48"
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
                  <th className="border p-2">الاسم</th>
                  <th className="border p-2">الدائرة</th>
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
                    <td className="border p-2">{e.office?.name || '—'}</td>
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
          officeName={officeName}
        />
      </div>
    </div>
  );
}

// Employee form modal
function EmployeeFormModal({
  isOpen, onClose, employee, onSave, officeName
}: {
  isOpen: boolean;
  onClose: () => void;
  employee: any | null;
  onSave: (formData: any) => void;
  officeName: string;
}) {
  const [form, setForm] = useState<any>(employee || {});
  useEffect(() => {
    setForm(employee || {});
  }, [employee]);

  const handleChange = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto text-xs">
      <div className="flex items-center justify-center min-h-screen bg-black bg-opacity-40 p-2">
        <Dialog.Panel className="bg-white w-full max-w-2xl rounded p-4" dir="rtl">
          <Dialog.Title className="text-base font-bold mb-4">
            {employee ? 'تعديل بيانات الموظف' : `إضافة موظف جديد (للدائرة: ${officeName})`}
          </Dialog.Title>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[['الاسم الأول', 'first_name'],
              ['اللقب', 'last_name'],
              ['الشهادة', 'certificate'],
              ['العنوان الوظيفي', 'job_title'],
              ['تاريخ التعيين', 'hire_date', 'date'],
              ['رقم الحساب المصرفي', 'bank_account'],
              ['اسم المصرف', 'bank']].map(([label, field, type]) => (
              <div key={field}>
                <label className="block text-xs font-medium mb-1">{label}</label>
                <input
                  type={type || 'text'}
                  className="border p-1 rounded w-full text-xs"
                  value={form[field] || ''}
                  onChange={(e) => handleChange(field, e.target.value)}
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1">ملاحظات</label>
              <textarea
                className="border p-1 rounded w-full text-xs"
                rows={2}
                value={form.note || ''}
                onChange={(e) => handleChange('note', e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-1 bg-gray-300 rounded text-xs">إلغاء</button>
            <button onClick={() => onSave(form)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs">حفظ</button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
