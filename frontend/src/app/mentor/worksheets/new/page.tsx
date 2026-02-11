"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiChevronDown } from "react-icons/fi";
import { CgFileDocument } from "react-icons/cg";
import { apiPost, apiUpload } from "@/lib/api";
import { toast } from '@/stores/useToastStore';
import { CONTENT_LIMITS } from '@/constants/contentLimits';
import RichTextEditor from '@/components/RichTextEditor';

type SubjectUI = "국어" | "영어" | "수학" | "기타";
type SubjectType = "KOREAN" | "ENGLISH" | "MATH" | "ETC";

const SUBJECT_MAP: Record<SubjectUI, SubjectType> = {
    "국어": "KOREAN",
    "영어": "ENGLISH",
    "수학": "MATH",
    "기타": "ETC",
};

function SubjectBtn({
    active,
    label,
    onClick,
}: {
    active: boolean;
    label: SubjectUI;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "h-10 w-[110px] rounded-md border text-[12px] font-semibold transition",
                active
                    ? "bg-[#0B2B5B] text-white border-[#0B2B5B]"
                    : "bg-white text-gray-500 border-gray-300 hover:bg-gray-50",
            ].join(" ")}
        >
            {label}
        </button>
    );
}

function Accordion({
    title,
    open,
    onToggle,
    children,
}: {
    title: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-md bg-[#EEF2F7] p-3">
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between rounded-md bg-[#6B7280] px-4 py-3 text-left"
            >
                <span className="text-[12px] font-bold text-white">{title}</span>
                <FiChevronDown
                    className={[
                        "text-white transition",
                        open ? "rotate-180" : "rotate-0",
                    ].join(" ")}
                />
            </button>

            {open && <div className="mt-3">{children}</div>}
        </div>
    );
}

function formatBytes(bytes: number) {
    if (bytes === 0) return "0B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const v = bytes / Math.pow(k, i);
    return `${v.toFixed(i >= 2 ? 2 : 0)}${sizes[i]}`;
}

interface UploadedFile {
    file: File;
    url: string;
    originalName: string; // 서버에서 반환된 원본 파일명
}

export default function LibraryNewPage() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [subject, setSubject] = useState<SubjectUI>("국어");

    const [columnOpen, setColumnOpen] = useState(true);
    const [pdfOpen, setPdfOpen] = useState(true);

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const nameCount = useMemo(() => name.length, [name]);
    const titleCount = useMemo(() => title.length, [title]);

    // PDF와 칼럼 동시 입력 방지
    const hasPdf = uploadedFiles.length > 0;
    const hasColumn = title.trim() || content.trim();

    const handlePdfUpload = async (files: FileList) => {
        const fileList = Array.from(files);
        const pdfFiles = fileList.filter(f => f.type === 'application/pdf');

        if (pdfFiles.length === 0) {
            toast.warning('PDF 파일만 업로드 가능합니다.');
            return;
        }

        setIsUploading(true);
        try {
            const newUploadedFiles: UploadedFile[] = [...uploadedFiles];

            for (const file of pdfFiles) {
                const formData = new FormData();
                formData.append('pdf', file);

                const res = await apiUpload('/api/upload/pdf', formData);

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.error || `${file.name} 업로드에 실패했습니다.`);
                }

                const data = await res.json();
                newUploadedFiles.push({ file, url: data.url, originalName: data.originalName || file.name });
            }

            setUploadedFiles(newUploadedFiles);
        } catch (err) {
            console.error('Upload error:', err);
            toast.error(err instanceof Error ? err.message : 'PDF 업로드 중 오류가 발생했습니다.');
        } finally {
            setIsUploading(false);
        }
    };

    const removeFile = (index: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (isSubmitting || isUploading) return;

        if (!name) {
            toast.warning("학습지명을 입력해주세요.");
            return;
        }

        const pdfUrlsStr = uploadedFiles.map(f => f.url).join(',');
        const pdfFileNamesStr = uploadedFiles.map(f => f.originalName).join(',');

        // 검증 1: PDF와 칼럼 동시 등록 방지
        if (hasPdf && hasColumn) {
            toast.warning('PDF와 칼럼을 동시에 등록할 수 없습니다.');
            return;
        }

        // 검증 2: 둘 다 없는 경우 방지
        if (!hasPdf && !hasColumn) {
            toast.warning('학습지 내용(PDF 또는 칼럼)을 등록해주세요.');
            return;
        }

        // type 자동 결정
        const type: "COLUMN" | "PDF" = hasColumn ? "COLUMN" : "PDF";

        setIsSubmitting(true);
        try {
            const res = await apiPost('/api/mentor/worksheets', {
                title: name,
                subject: SUBJECT_MAP[subject],
                type,
                content: type === 'COLUMN' ? JSON.stringify({ topics: [{ title, description: content }] }) : null,
                pdfUrl: pdfUrlsStr || null,
                pdfFileName: pdfFileNamesStr || null,
            });

            if (!res.ok) throw new Error('학습지 생성에 실패했습니다.');

            toast.success('학습지가 등록되었습니다.');
            router.push('/mentor/worksheets');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : '오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-[760px] mx-auto">
            {/* 학습지명 */}
            <div className="text-[12px] font-bold text-gray-800">학습지명</div>
            <div className="mt-2 relative">
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, CONTENT_LIMITS.WORKSHEET_NAME))}
                    placeholder="학습지명을 작성해 주세요."
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 pr-14 text-[12px] text-gray-700 outline-none focus:ring-2 focus:ring-blue-200"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">
                    {nameCount}/50
                </div>
            </div>

            {/* 학습 과목 */}
            <div className="mt-8 text-[12px] font-bold text-gray-800">학습 과목</div>
            <div className="mt-3 flex gap-3">
                {(["국어", "영어", "수학", "기타"] as SubjectUI[]).map((s) => (
                    <SubjectBtn key={s} active={subject === s} label={s} onClick={() => setSubject(s)} />
                ))}
            </div>

            {/* 학습지 등록 */}
            <div className="mt-10 text-[12px] font-bold text-gray-800">학습지 등록</div>

            {/* 칼럼 작성 */}
            <div className="mt-3">
                <Accordion
                    title={`칼럼 작성${hasPdf ? ' (PDF 등록 시 사용 불가)' : ''}`}
                    open={columnOpen}
                    onToggle={() => setColumnOpen((v) => !v)}
                >
                    <div className={`rounded-md bg-white p-3 ${hasPdf ? 'opacity-50 pointer-events-none' : ''}`}>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value.slice(0, CONTENT_LIMITS.WORKSHEET_NAME))}
                            placeholder="제목 작성"
                            className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-[12px] text-gray-700 outline-none focus:ring-2 focus:ring-blue-200"
                        />
                        <div className="mt-1 text-right text-[10px] text-gray-400">{titleCount}/50</div>

                        <div className="mt-3">
                            <RichTextEditor
                                value={content}
                                onChange={setContent}
                                placeholder="내용 입력"
                                minHeight="260px"
                                maxLength={CONTENT_LIMITS.COLUMN_CONTENT}
                            />
                        </div>
                    </div>
                </Accordion>
            </div>

            {/* PDF 업로드 */}
            <div className="mt-4">
                <Accordion
                    title={`PDF 파일${hasColumn ? ' (칼럼 작성 시 사용 불가)' : ''}`}
                    open={pdfOpen}
                    onToggle={() => setPdfOpen((v) => !v)}
                >
                    <div className={`rounded-md bg-white p-4 ${hasColumn ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="rounded-md border border-dashed border-gray-300 bg-white p-4">
                            {/* 업로드된 파일 목록 */}
                            <div className="space-y-2 mb-4">
                                {uploadedFiles.map((uf, index) => (
                                    <div key={index} className="flex items-center gap-3 rounded-md bg-gray-200 px-3 py-2">
                                        <div className="grid h-9 w-9 place-items-center rounded-md bg-gray-700 text-white flex-shrink-0">
                                            <CgFileDocument className="text-[18px]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="truncate text-[12px] font-semibold text-gray-800">
                                                {uf.file.name}
                                            </div>
                                        </div>
                                        <div className="text-[11px] font-semibold text-gray-600">
                                            {formatBytes(uf.file.size)}
                                        </div>
                                        <button
                                            type="button"
                                            aria-label="삭제"
                                            onClick={() => removeFile(index)}
                                            className="ml-1 text-[16px] text-gray-500 hover:text-gray-800"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* 업로드 영역 */}
                            <label className="flex h-[120px] cursor-pointer flex-col items-center justify-center rounded-md bg-gray-50 text-center hover:bg-gray-100 transition">
                                <div className="text-[26px] text-gray-500">⤴</div>
                                <div className="mt-2 text-[11px] font-semibold text-gray-700">
                                    {isUploading ? "업로드 중..." : "업로드 할 파일을 선택해주세요. (PDF 여러개 가능)"}
                                </div>

                                <input
                                    type="file"
                                    accept="application/pdf"
                                    className="hidden"
                                    multiple
                                    disabled={isUploading}
                                    onChange={(e) => {
                                        const files = e.target.files;
                                        if (files) handlePdfUpload(files);
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                </Accordion>
            </div>


            {/* 버튼 */}
            <div className="mt-8 flex gap-3 pb-10">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="h-12 flex-1 rounded-md bg-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-300 transition"
                >
                    취소
                </button>

                <button
                    type="button"
                    disabled={isSubmitting || isUploading}
                    onClick={handleSubmit}
                    className="h-12 flex-[2] rounded-md bg-[#BBD9FF] text-[12px] font-semibold text-[#0B2B5B] hover:bg-[#AFCFFF] transition disabled:bg-gray-300 disabled:text-gray-500"
                >
                    {isSubmitting ? "등록 중..." : "등록"}
                </button>
            </div>
        </div>
    );
}
