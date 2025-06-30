'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import dayjs from 'dayjs';

interface Office {
  id: string;
  name: string;
  office_phone: string | null;
  created_at: string | null;
  is_active: boolean;
}

export default function OfficesPage() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const supabase = createClient();

  const fetchOffices = async () => {
    const { data, error } = await supabase
      .from('offices')
      .select('id, name, office_phone,created_at, is_active')
      .order('created_at', { ascending: false });

    if (data) setOffices(data);
    if (error) console.error('Failed to load offices', error);
  };

  useEffect(() => {
    fetchOffices();
  }, []);

  const isExpired = (created_at: string | null) => {
    if (!created_at) return true;
    const days = (new Date().getTime() - new Date(created_at).getTime()) / (1000 * 60 * 60 * 24);
    return days > 30;
  };

  const handleActivate = async (officeId: string) => {
    setLoading(true);
    const { error } = await supabase
      .from('offices')
      .update({ is_active: true, created_at: new Date().toISOString() })
      .eq('id', officeId);

    if (error) {
      alert('حدث خطأ أثناء التفعيل');
      console.error(error);
    } else {
      alert('تم تفعيل المكتب بنجاح');
      fetchOffices(); // reload the list
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 rtl">
      <h1 className="text-3xl font-bold text-blue-800 mb-6">إدارة الدوائر</h1>
      <div className="flex justify-end mb-4">
  <input
    type="text"
    placeholder="ابحث بالاسم أو الموبايل..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
</div>


      <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
        <table className="min-w-full text-sm md:text-base text-right">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 border-b border-gray-300">الاسم</th>
              <th className="p-3 border-b border-gray-300">موبايل</th>
              <th className="p-3 border-b border-gray-300">تاريخ الإنشاء</th>
              <th className="p-3 border-b border-gray-300">الحالة</th>
              <th className="p-3 border-b border-gray-300">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {offices.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  لا توجد دوائر للعرض
                </td>
              </tr>
            )}
      {offices
  .filter((office) =>
    office.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (office.office_phone?.includes(searchTerm) ?? false)
  )
  .map((office) => {
    const expired = isExpired(office.created_at);
    const status = !office.is_active
      ? '❌ غير مفعّل'
      : expired
      ? '⏳ منتهي'
      : '✅ فعّال';

    return (
      <tr
        key={office.id}
        className="hover:bg-gray-50 border-b border-gray-200 transition-colors"
      >
        <td className="p-3">{office.name}</td>
        <td className="p-3">{office.office_phone || '—'}</td>
        <td className="p-3">
          {office.created_at ? dayjs(office.created_at).format('YYYY-MM-DD') : '—'}
        </td>
        <td className="p-3">{status}</td>
        <td className="p-3">
          {(!office.is_active || expired) && (
            <button
              onClick={() => handleActivate(office.id)}
              disabled={loading}
              className="px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? '...جاري التفعيل' : 'تفعيل'}
            </button>
          )}
        </td>
      </tr>
    );
  })}

          </tbody>
        </table>
      </div>
    </div>
  );
}
