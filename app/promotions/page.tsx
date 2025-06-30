'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import React from 'react';

interface Promotion {
  id: string;
  employee_id: string;
  old_degree?: number;
  old_level?: number;
  old_salary?: number;
  new_degree?: number;
  new_level?: number;
  new_salary?: number;
  due_date?: string;
  note?: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  office_id: string;
}

interface Office {
  id: string;
  name: string;
  auth_user_id: string;
}

// Convert Western digits to Arabic-Indic digits
function toArabicIndic(value: number | string | undefined | null) {
  if (value === null || value === undefined) return '—';
  const str = String(value);
  return str.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
}


function formatArabicMonth(month: string) {
  const months = [
    'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
    'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'
  ];
  const [year, m] = month.split('-');
  const monthName = months[parseInt(m) - 1] || '';
  return `${monthName} ${toArabicIndic(year)}`;
} 
  

  const formatArabicDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }; 


export default function PromotionsPage() {
  const supabase = createClient();

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [office, setOffice] = useState<Office | null>(null);
  const [searchName, setSearchName] = useState('');
  const [month, setMonth] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newPromotion, setNewPromotion] = useState<any>({});
  const [committeeMembers, setCommitteeMembers] = useState({
    member1: '',
    member2: '',
    member3: '',
    chair: '',
  });
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);

      if (userData.user) {
        const { data: officeData } = await supabase
          .from('offices')
          .select('*')
          .eq('auth_user_id', userData.user.id)
          .single();

        if (!officeData) return;
        setOffice(officeData);

        const { data: employeeData } = await supabase
          .from('employees')
          .select('*')
          .eq('office_id', officeData.id);

        setEmployees(employeeData || []);

        const empIds = employeeData?.map(e => e.id) || [];
        const { data: promoData } = await supabase
          .from('promotions')
          .select('*')
          .in('employee_id', empIds);

        setPromotions(promoData || []);
      }
    };
    init();
  }, []);

  const getEmployee = (id: string) => employees.find(e => e.id === id);
  const printTable = () => {
    if (!reportRef.current) return;
    const printContent = reportRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
  
    printWindow.document.write(`
      <html lang="ar" dir="rtl">
        <head>
          <title>تقرير الترقيات</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo&display=swap" rel="stylesheet">
          <style>
            @page {
              size: landscape;
              margin: 20mm;
            }
  
            body {
              font-family: 'Cairo', sans-serif;
              direction: rtl;
              unicode-bidi: embed;
              padding: 20px;
              text-align: center;
              color: #000;
            }
  
            h1 {
              font-size: 20px;
              margin-bottom: 10px;
            }
  
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 14px;
            }
  
            thead {
              background-color: #f2f2f2;
            }
  
            th, td {
              border: 1px solid #999;
              padding: 4px 6px;
              text-align: center;
            }
  
            tr:nth-child(even) {
              background-color: #fafafa;
            }
  
            .committee-members {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 1rem;
              margin-top: 30px;
              text-align: center;
            }
  
            .committee-members label {
              font-weight: bold;
              display: block;
              margin-bottom: 6px;
            }
  
            .committee-members input {
              width: 100%;
              text-align: center;
              padding: 0.25rem 0;
              outline: none;
              font-size: 14px;
              border: 1px solid #ccc;
              border-radius: 4px;
            }
  
            .page-break {
              page-break-before: always;
            }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
  
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };
  

  const handleInsertOrUpdate = async () => {
    if (!newPromotion.employee_id) return;
    const payload = {
      employee_id: newPromotion.employee_id,
      old_degree: newPromotion.old_degree || null,
      old_level: newPromotion.old_level || null,
      old_salary: newPromotion.old_salary || null,
      new_degree: newPromotion.new_degree || null,
      new_level: newPromotion.new_level || null,
      new_salary: newPromotion.new_salary || null,
      due_date: newPromotion.due_date || null,
      note: newPromotion.note || null,
    };

    if (newPromotion.id) {
      await supabase.from('promotions').update(payload).eq('id', newPromotion.id);
    } else {
      await supabase.from('promotions').insert(payload);
    }

    const { data: refreshed } = await supabase.from('promotions').select('*');
    setPromotions(refreshed || []);
    setShowForm(false);
    setNewPromotion({});
    alert('تم حفظ الترقية بنجاح');
  };

  const filteredPromotions = (searchName || month)
  ? promotions.filter((p) => {
      const emp = getEmployee(p.employee_id);
      if (!emp) return false;

      const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
      const nameMatches = searchName ? fullName.includes(searchName.toLowerCase()) : true;
      const monthMatches = month ? p.due_date?.startsWith(month) : true;

      return nameMatches && monthMatches;
    })
  : [];

  const onCommitteeChange = (field: string, value: string) => {
    setCommitteeMembers((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rtl relative font-[Cairo]" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <section className="bg-white rounded-xl shadow p-4 space-y-2 print:shadow-none print:rounded-none">
          <div className="flex flex-col sm:flex-row sm:justify-start items-start gap-4 text-right" dir="rtl">
            <div><strong>البريد الإلكتروني:</strong> {user?.email || '—'}</div>
            <div><strong>الدائرة:</strong> {office?.name || '—'}</div>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-center">
            <input
              type="month"
              className="border px-2 py-1 rounded"
              value={month}
              onChange={e => setMonth(e.target.value)}
              aria-label="اختر الشهر"
            />
            
            <input
              type="text"
              placeholder="بحث عن موظف"
              className="border px-2 py-1 rounded"
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              aria-label="بحث عن موظف"
            />
            
            <button
              className="bg-blue-200 px-5 py-1 rounded text-lg hover:bg-blue-700 hover:text-white disabled:opacity-50 transition w-full sm:w-auto text-center"
              onClick={() => {
                setNewPromotion({});
                setShowForm(true);
              }}
            >
              إضافة ترقية
            </button>
            <button
              className="bg-blue-200 px-5 py-1 rounded text-lg hover:bg-blue-700 hover:text-white disabled:opacity-50 transition w-full sm:w-auto text-center"
              onClick={printTable}
            >
              طباعة التقرير
            </button>
            <Link
              href="/home"
              className="bg-blue-200 px-5 py-1 rounded text-lg hover:bg-blue-700 hover:text-white disabled:opacity-50 transition w-full sm:w-auto text-center"
            >
              الرئيسية
            </Link>
          </div>
        </section>

        {/* Report Table */}
        {filteredPromotions.length > 0 && (
          <section
            ref={reportRef}
            className="bg-white rounded-xl shadow p-4 print:shadow-none print:rounded-none"
            aria-label="تقرير الترقيات"
          >
            <div className="hidden print:block mb-6 text-center space-y-1 print:text-lg print:mt-0">
              <div>الدائرة: {office?.name || '—'}</div>
              <div>الشهر: {formatArabicMonth(month)}</div>
              <div className="font-bold text-lg">تقرير الترقيات</div>
            </div>

            <div className="overflow-x-auto rounded-lg shadow">
              <table
                className="min-w-[900px] w-full border-collapse border text-center text-sm"
                role="table"
              >
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2" scope="col">الاسم</th>
                    <th className="border p-2" scope="col">الدرجة الحالية</th>
                    <th className="border p-2" scope="col">المرحلة الحالية</th>
                    <th className="border p-2" scope="col">الراتب الحالي</th>
                    <th className="border p-2" scope="col">تاريخ الاستحقاق</th>
                    <th className="border p-2" scope="col">الدرجة الجديدة</th>
                    <th className="border p-2" scope="col">المرحلة الجديدة</th>
                    <th className="border p-2" scope="col">الراتب الجديد</th>
                    {/* <th className="border p-2" scope="col">ملاحظة</th> */}
                  </tr>
                </thead>
                <tbody>
                  {filteredPromotions.map((p) => {
                    const emp = getEmployee(p.employee_id);
                    return (
                      <React.Fragment key={p.id}>
                        <tr
                          onClick={() => {
                            setNewPromotion({ ...p });
                            setShowForm(true);
                          }}
                          className="hover:bg-gray-50 py-1 cursor-pointer"
                          tabIndex={0}
                          role="row"
                          aria-label={`ترقية الموظف ${emp?.first_name} ${emp?.last_name}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setNewPromotion({ ...p });
                              setShowForm(true);
                            }
                          }}
                        >
                          <td className="border p-1 text-right align-top">
                            {emp?.first_name} {emp?.last_name}
                          </td>
                          <td className="border p-1 text-lg font-mono text-blue-900">
                        {(p.old_degree ?? 0).toLocaleString('ar-IQ')}</td>
                        <td className="border p-1 text-lg font-mono text-blue-900">
                        {(p.old_level ?? 0).toLocaleString('ar-IQ')}</td>
                        <td className="border p-1 text-lg font-mono text-blue-900">
                        {(p.old_salary ?? 0).toLocaleString('ar-IQ')}</td>
                        <td className="border p-1">{formatArabicDate(p.due_date)}</td>
                        <td className="border p-1 text-lg font-mono text-blue-900">
                        {(p.new_degree ?? 0).toLocaleString('ar-IQ')}</td>
                        <td className="border p-1 text-lg font-mono text-blue-900">
                        {(p.new_level ?? 0).toLocaleString('ar-IQ')}</td>
                        <td className="border p-1 text-lg font-mono text-blue-900">
                        {(p.new_salary ?? 0).toLocaleString('ar-IQ')}</td>
                        {/* <td className="border text-lg p-1">{p.note || ''}</td> */}
                        </tr>
                        {p.note && (
                          <tr>
                            <td colSpan={8} className="border p-2 text-xs text-right bg-gray-50 whitespace-pre-wrap">
                              ملاحظة: {p.note}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

{/* Committee Members */}
<div className="committee-members bg-gray-100 rounded-lg shadow-lg grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center mt-8 p-4">
  {['member1', 'member2', 'member3', 'chair'].map((key) => {
    const label = key === 'chair' ? 'رئيس اللجنة' : 'عضو';
    return (
      <div key={key}>
        <label htmlFor={`committee-${key}`} className="text-sm block mb-2">{label}</label>
        <input
          id={`committee-${key}`}
          type="text"
          className="border py-1 px-2 rounded w-full text-center"
          placeholder="اسم"
          value={committeeMembers[key as keyof typeof committeeMembers]}
          onChange={(e) => onCommitteeChange(key, e.target.value)}
        />
      </div>
    );
  })}
</div>
          </section>
        )}

{showForm && (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2"
  >
    <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-4 sm:p-6 space-y-4 overflow-y-auto min-h-[450px] max-h-[90vh]">

      {/* Employee Search & Due Date */}
      <div className="space-y-2">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative w-full md:w-3/5">
            <input
              type="text"
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="اكتب اسم الموظف..."
              aria-label="بحث عن موظف للترقية"
              value={
                newPromotion.employee_id
                  ? `${getEmployee(newPromotion.employee_id)?.first_name || ''} ${getEmployee(newPromotion.employee_id)?.last_name || ''}`
                  : searchName
              }
              onChange={(e) => {
                setSearchName(e.target.value);
                setNewPromotion((prev: Partial<Promotion>) => ({ ...prev, employee_id: '' }));
              }}
            />
            {searchName && !newPromotion.employee_id && (
              <div className="absolute z-10 bg-white border w-full max-h-[240px] overflow-y-auto shadow-lg text-sm">
                {employees
                  .filter(emp =>
                    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchName.toLowerCase())
                  )
                  .map(emp => (
                    <div
                      key={emp.id}
                      className="px-4 py-1 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setNewPromotion((prev: Partial<Promotion>) => ({ ...prev, employee_id: emp.id }));
                        setSearchName('');
                      }}
                    >
                      {emp.first_name} {emp.last_name}
                    </div>
                  ))}
                {employees.filter(emp =>
                  `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchName.toLowerCase())
                ).length === 0 && (
                  <div className="px-4 py-1 text-gray-500">لا توجد نتائج</div>
                )}
              </div>
            )}
          </div>

          <input
            type="month"
            className="w-full md:w-2/5 border rounded px-2 py-1 text-sm"
            aria-label="تاريخ الاستحقاق"
            value={newPromotion.due_date?.slice(0, 7) || ''}
            onChange={(e) => {
              const selectedMonth = e.target.value;
              const correctedDate = `${selectedMonth}-01`;
              setNewPromotion((prev: Partial<Promotion>) => ({ ...prev, due_date: correctedDate }));
            }}
          />
        </div>
      </div>

      {/* Promotion Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Old Degree */}
        <select
          className="w-full border rounded px-2 py-1 text-sm h-9"
          value={newPromotion.old_degree || ''}
          onChange={e =>
            setNewPromotion((prev: Partial<Promotion>) => ({
              ...prev,
              old_degree: e.target.value ? +e.target.value : null
            }))
          }
        >
          <option value="">اختر الدرجة</option>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(deg => (
            <option key={deg} value={deg}>الدرجة {deg}</option>
          ))}
        </select>

        {/* Old Level */}
        <select
          className="w-full border rounded px-2 py-1 text-sm h-9"
          value={newPromotion.old_level || ''}
          onChange={e =>
            setNewPromotion((prev: Partial<Promotion>) => ({
              ...prev,
              old_level: e.target.value ? +e.target.value : null
            }))
          }
        >
          <option value="">اختر المرحلة</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(lvl => (
            <option key={lvl} value={lvl}>المرحلة {lvl}</option>
          ))}
        </select>

        {/* Old Salary */}
        <input
          type="number"
          className="w-full border rounded px-2 py-1 text-sm h-9"
          value={newPromotion.old_salary || ''}
          onChange={e =>
            setNewPromotion((prev: Partial<Promotion>) => ({
              ...prev,
              old_salary: e.target.value ? +e.target.value : null
            }))
          }
          placeholder="الراتب الحالي"
        />

        {/* New Degree */}
        <select
          className="w-full border rounded px-2 py-1 text-sm h-9"
          value={newPromotion.new_degree || ''}
          onChange={e =>
            setNewPromotion((prev: Partial<Promotion>) => ({
              ...prev,
              new_degree: e.target.value ? +e.target.value : null
            }))
          }
        >
          <option value="">اختر الدرجة</option>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(deg => (
            <option key={deg} value={deg}>الدرجة {deg}</option>
          ))}
        </select>

        {/* New Level */}
        <select
          className="w-full border rounded px-2 py-1 text-sm h-9"
          value={newPromotion.new_level || ''}
          onChange={e =>
            setNewPromotion((prev: Partial<Promotion>) => ({
              ...prev,
              new_level: e.target.value ? +e.target.value : null
            }))
          }
        >
          <option value="">اختر المرحلة</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(lvl => (
            <option key={lvl} value={lvl}>المرحلة {lvl}</option>
          ))}
        </select>

        {/* New Salary */}
        <input
          type="number"
          className="w-full border rounded px-2 py-1 text-sm h-9"
          value={newPromotion.new_salary || ''}
          onChange={e =>
            setNewPromotion((prev: Partial<Promotion>) => ({
              ...prev,
              new_salary: e.target.value ? +e.target.value : null
            }))
          }
          placeholder="الراتب الجديد"
        />

        {/* Note */}
        <textarea
          className="w-full border rounded px-2 py-1 text-sm min-h-[80px] sm:col-span-3"
          value={newPromotion.note || ''}
          onChange={e =>
            setNewPromotion((prev: Partial<Promotion>) => ({
              ...prev,
              note: e.target.value
            }))
          }
          placeholder="ملاحظة"
        />
      </div>

      {/* Modal Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-2 pt-2">
        <button
          className="bg-green-600 text-white px-4 py-1 rounded w-full sm:w-auto"
          onClick={handleInsertOrUpdate}
        >
          حفظ
        </button>
        <button
          className="bg-gray-500 text-white px-4 py-1 rounded w-full sm:w-auto"
          onClick={() => setShowForm(false)}
        >
          إلغاء
        </button>
      </div>
    </div>
  </div>
)}


      </div>
    </div>
  );
}
