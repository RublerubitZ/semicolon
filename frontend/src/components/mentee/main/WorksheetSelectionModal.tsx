"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LuDownload } from "react-icons/lu";
import { MdDescription, MdClose } from "react-icons/md";
import { getApiUrl } from "@/lib/api";

interface TaskMaterial {
  id: string;
  type: 'PDF' | 'COLUMN';
  order: number;
  pdfUrl?: string;
  columnTitle?: string;
  columnContent?: string;
}

interface Worksheet {
  id: string;
  title: string;
  pdfUrl?: string;
  type: "PDF" | "COLUMN";
  content?: string;
  materials?: TaskMaterial[]; // 새로운 필드
}

interface WorksheetSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  worksheet: Worksheet;
}

export function WorksheetSelectionModal({
  isOpen,
  onClose,
  worksheet,
}: WorksheetSelectionModalProps) {
  // materials가 있으면 materials 사용, 없으면 기존 pdfUrl 사용
  const items = useMemo(() => {
    if (!worksheet) return [];

    // materials가 있으면 materials로 처리
    if (worksheet.materials && worksheet.materials.length > 0) {
      return worksheet.materials.sort((a, b) => a.order - b.order);
    }

    // 기존 pdfUrl 방식 (하위 호환)
    if (worksheet.pdfUrl) {
      const urls = worksheet.pdfUrl.split(",");
      return urls.map((url, idx) => ({
        id: `pdf-${idx}`,
        type: 'PDF' as const,
        order: idx,
        pdfUrl: url,
      }));
    }

    // 칼럼 타입 (기존 worksheet)
    if (worksheet.type === 'COLUMN' && worksheet.content) {
      return [{
        id: worksheet.id,
        type: 'COLUMN' as const,
        order: 0,
        columnTitle: worksheet.title,
        columnContent: worksheet.content,
      }];
    }

    return [];
  }, [worksheet]);

  const extractFileName = (url: string) => {
    try {
      const decoded = decodeURIComponent(url);
      const parts = decoded.split('/');
      const fileNameWithQuery = parts[parts.length - 1];
      const fileName = fileNameWithQuery.split('?')[0];
      
      // Cloudinary raw public_id 형식: {safeName}_{timestamp}_{randomId}.pdf 또는 {safeName}_{timestamp}.pdf
      // 우리가 백엔드에서 safeName을 만들 때 원본 이름에서 추출함.
      const nameParts = fileName.split('_');
      if (nameParts.length >= 2) {
        // 뒤에서부터 timestamp(숫자)와 randomId(문자열)가 붙어있으므로 이를 제거 시도
        // .pdf 확장자를 유지하면서 앞부분만 추출
        const extension = fileName.split('.').pop();
        
        // 마지막 두 요소를 제거하고 다시 합침 (timestamp, randomId가 있다고 가정)
        // 만약 숫자가 아니거나 형식이 다를 수 있으므로 안전하게 처리
        let cleanName = "";
        
        // 보통 3개 이상의 파트로 구성됨 (name, timestamp, randomId)
        if (nameParts.length >= 3) {
          cleanName = nameParts.slice(0, nameParts.length - 2).join('_');
        } else {
          cleanName = nameParts.slice(0, nameParts.length - 1).join('_');
        }
        
        return cleanName ? `${cleanName}.${extension}` : fileName;
      }
      return fileName;
    } catch (e) {
      return "학습 파일.pdf";
    }
  };

  const handleViewPdf = (fileUrl: string) => {
    if (!fileUrl) return;
    let fullUrl = fileUrl;
    if (!fileUrl.startsWith("http")) {
      const baseUrl = getApiUrl().replace(/\/$/, "");
      const cleanPath = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
      fullUrl = `${baseUrl}${cleanPath}`;
    }
    
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center p-6 z-[9999]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-[340px] rounded-[32px] overflow-hidden shadow-2xl relative z-10 flex flex-col"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800">학습 파일 선택</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <MdClose size={24} />
                </button>
              </div>

              <div className="space-y-3">
                {items.length > 0 ? (
                  items.map((item, idx) => {
                    if (item.type === 'PDF' && item.pdfUrl) {
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleViewPdf(item.pdfUrl!)}
                          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50 rounded-2xl border border-gray-100 transition-all active:scale-[0.98] group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <MdDescription className="w-6 h-6 text-blue-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-slate-700 truncate">
                              {extractFileName(item.pdfUrl)}
                            </span>
                          </div>
                          <LuDownload className="text-blue-500 opacity-40 group-hover:opacity-100 transition-opacity" />
                        </button>
                      );
                    } else if (item.type === 'COLUMN') {
                      return (
                        <div
                          key={item.id}
                          className="w-full p-4 bg-amber-50 rounded-2xl border border-amber-100"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-lg">📝</span>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-bold text-slate-800 mb-1">
                                {item.columnTitle || '칼럼'}
                              </h3>
                              <p className="text-xs text-slate-600 whitespace-pre-wrap break-words">
                                {item.columnContent || '내용 없음'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })
                ) : (
                  <div className="py-10 text-center">
                    <p className="text-sm text-gray-400">등록된 학습 자료가 없습니다.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 pt-2">
              <button
                onClick={onClose}
                className="w-full py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl transition-colors hover:bg-gray-200"
              >
                닫기
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
