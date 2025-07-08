// app/font-test/page.tsx
import { Cairo, Amiri } from 'next/font/google';

// Load fonts
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  display: 'swap',
});

const amiri = Amiri({
  subsets: ['arabic'],
  weight: ['400'],
  display: 'swap',
});

// Use Cairo by default
const activeFont = cairo;

export default function FontTestPage() {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${activeFont.className} bg-gray-100 min-h-screen`}>
        <div className="max-w-3xl mx-auto bg-white mt-12 p-8 rounded-lg shadow space-y-6 text-right">
          <h1 className="text-4xl font-bold text-blue-800">معاينة خط Cairo</h1>

          <p className="text-lg text-gray-700 leading-loose">
            هذا نص باللغة العربية لاختبار شكل الخط <span className="font-bold text-blue-600">Cairo</span> في واجهة المستخدم. 
            يمكنك استخدام هذا الخط لكتابة محتوى احترافي ومتناسق في تطبيقك.
          </p>

          <p className="text-sm text-gray-500">
            الخط يدعم الاتجاه من اليمين إلى اليسار (RTL) ويحتوي على أوزان مختلفة مثل عادي وعريض.
          </p>

          <div className="border-t pt-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">English Preview</h2>
            <p className="text-base text-gray-700">
              This is a test paragraph to preview the <span className="font-bold">Cairo</span> font with English content. It's readable and stylish in both Arabic and English layouts.
            </p>
          </div>

          <div className={`${amiri.className} border-t pt-6`}>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">معاينة خط Amiri</h2>
            <p className="text-base text-gray-700">
              هذا النص يستخدم خط Amiri لتجربة خط تقليدي وأنيق مناسب للنصوص الطويلة والكتب.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
