"use client";
import React, { useState, useEffect } from "react";

type OfficeOption = {
  id: string;
  name: string;
};

type OfficeFormModalProps = {
  open: boolean;
  onClose: () => void;
  officeOptions: OfficeOption[]; // For parent office dropdown
  onOfficeAdded: (office: { name: string; parent_id?: string }) => void;
  initialName?: string;
  initialParentId?: string | null;
};

export default function OfficeFormModal({
  open,
  onClose,
  officeOptions,
  onOfficeAdded,
  initialName = "",
  initialParentId = null,
}: OfficeFormModalProps) {
  const [officeName, setOfficeName] = useState(initialName);
  const [parentId, setParentId] = useState<string | null>(initialParentId);

  useEffect(() => {
    setOfficeName(initialName);
    setParentId(initialParentId);
  }, [initialName, initialParentId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (officeName.trim() === "") return;

    onOfficeAdded({
      name: officeName.trim(),
      parent_id: parentId || undefined,
    });
    setOfficeName("");
    setParentId(null);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">أضف اسم الدائرة</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Office Name Input */}
          <input
            type="text"
            placeholder="اسم الدائرة"
            value={officeName}
            onChange={(e) => setOfficeName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required
          />

          {/* Parent Office Dropdown */}
          <select
            value={parentId || ""}
            onChange={(e) => setParentId(e.target.value || null)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">اختر الدائرة الأم (اختياري)</option>
            {officeOptions.map((office) => (
              <option key={office.id} value={office.id}>
                {office.name}
              </option>
            ))}
          </select>

          {/* Buttons */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={onClose}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              حفظ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
