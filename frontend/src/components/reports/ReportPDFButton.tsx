'use client';

import { useState, RefObject } from 'react';
import { HiOutlineDocumentArrowDown } from 'react-icons/hi2';

interface ReportPDFButtonProps {
  targetRef: RefObject<HTMLDivElement | null>;
  fileName?: string;
}

export default function ReportPDFButton({ targetRef, fileName = '설스터디_리포트' }: ReportPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    if (!targetRef.current || isGenerating) return;
    setIsGenerating(true);

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ]);

      const element = targetRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let yOffset = 0;
      const pageHeight = 297; // A4 height in mm

      // 여러 페이지 처리
      while (yOffset < imgHeight) {
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -yOffset, imgWidth, imgHeight);
        yOffset += pageHeight;
      }

      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error('PDF 생성 실패:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isGenerating ? (
        <>
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          PDF 생성 중...
        </>
      ) : (
        <>
          <HiOutlineDocumentArrowDown className="w-3.5 h-3.5" />
          PDF 다운로드
        </>
      )}
    </button>
  );
}
