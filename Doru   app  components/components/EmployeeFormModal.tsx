'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@headlessui/react';

export interface Office {
  id: string;
  name: string;
}

export interface Employee {
  id?: string;
  first_name: string;
  last_name: string;
  certificate?: string;
  job_title?: string;
  hire_date?: string; // ISO string or '' 
  bank_account?: string;
  bank?: string;
  note?: string;
  office_id: string;
}

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSave: (formData: Employee) => Promise<void>;
  allOffices: Office[];
  currentOfficeId: string;
  saving: boolean;
}

export default function EmployeeFormModal({
  isOpen,
  onClose,
  employee,
  onSave,
  allOffices,
  currentOfficeId,
  saving,
}: EmployeeFormModalProps) {
  const [form, setForm] = useState<Employee>(
    employee || { first_name: '', last_name: '', office_id: currentOfficeId }
  );

  useEffect(() => {
    setForm(employee || { first_name: '', last_name: '', office_id: currentOfficeId });
  }, [employee, currentOfficeId]);

  const handleChange = (field: keyof Employee, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Simple validation
  const isValid = form.first_name.trim() !== '' && form.last_name.trim() !== '' && form.office_id !== '';

  return (
    <Dialog open={isOpen} onClose={() => !saving && onClose()} className="fixed z-50 inset-0 overflow-y-auto text-xs">
      <div className="flex items-center justify-center min-h-screen bg-black bg-opacity-40 p-2">
        <Dialog.Panel className="bg-white w-full max-w-2xl rounded p-4" dir="rtl">
          <Dialog.Title className="text-lg font-semibold mb-6 text-gray-900">
            {employee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
          </Dialog.Title>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              ['الاسم الأول', 'first_name', 'text'],
              ['اللقب', 'last_name', 'text'],
              ['الشهادة', 'certificate', 'text'],
              ['العنوان الوظيفي', 'job_title', 'text'],
              ['تاريخ التعيين', 'hire_date', 'date'],
              ['رقم الحساب المصرفي', 'bank_account', 'text'],
              ['اسم المصرف', 'bank', 'text'],
            ].map(([label, field, type]) => (
              <div key={field}>
                <input
                  type={type as string}
                  className="w-full rounded-md border border-gray-300 px-3 py-0.5 text-base text-gray-800
                             placeholder-gray-400
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                             transition"
                  value={form[field as keyof Employee] || ''}
                  onChange={(e) => handleChange(field as keyof Employee, e.target.value)}
                  placeholder={` ${label}`}
                  disabled={saving}
                />
              </div>
            ))}

            <div>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-0.5 text-base text-gray-800
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           transition"
                value={form.office_id || ''}
                onChange={(e) => handleChange('office_id', e.target.value)}
                disabled={saving}
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
              <textarea
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-800
                           placeholder-gray-400 resize-y
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           transition"
                value={form.note || ''}
                onChange={(e) => handleChange('note', e.target.value)}
                placeholder=" الملاحظات "
                disabled={saving}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => !saving && onClose()}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-l font-medium text-gray-700 transition"
              disabled={saving}
            >
              إلغاء
            </button>
            <button
              onClick={() => isValid && onSave(form)}
              className={`px-4 py-2 rounded-md text-l font-medium text-white transition ${
                saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={!isValid || saving}
            >
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
