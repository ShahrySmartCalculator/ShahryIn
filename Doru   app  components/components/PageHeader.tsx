// components/PageHeader.tsx
import React from "react";

export default function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 px-4 md:px-8" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
      {children && <div className="flex flex-wrap gap-2 mt-4 md:mt-0">{children}</div>}
    </div>
  );
}
