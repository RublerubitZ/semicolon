"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { FiChevronDown } from "react-icons/fi";
import { CgFileDocument } from "react-icons/cg";
import { getApiUrl } from "@/lib/api";
import { toast } from '@/stores/useToastStore';

type SubjectUI = "국어" | "영어" | "수학";
type SubjectType = "KOREAN" | "ENGLISH" | "MATH";

const SUBJECT_MAP: Record<SubjectUI, SubjectType> = {
    "국어": "KOREAN",
    "영어": "ENGLISH",
    "수학": "MATH",
};

const UI_SUBJECT_MAP: Record<SubjectType, SubjectUI> = {
    "KOREAN": "국어",
    "ENGLISH": "영어",
    "MATH": "수학",
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
    file?: File;
    name: string;
    url: string;
    size?: number;
}

export default function LibraryEditPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [name, setName] = useState("");
    const [subject, setSubject] = useState<SubjectUI>("국어");

    const [columnOpen, setColumnOpen] = useState(true);
    const [pdfOpen, setPdfOpen] = useState(true);

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const extractFileName = (url: string) => {
        try {
            const decoded = decodeURIComponent(url);
            const parts = decoded.split('/');
            const fileNameWithQuery = parts[parts.length - 1];
            const fileName = fileNameWithQuery.split('?')[0];
            const nameParts = fileName.split('_');
            if (nameParts.length >= 2) {
                const extension = fileName.split('.').pop();
                let cleanName = "";
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

    const nameCount = useMemo(() => name.length, [name]);
    const titleCount = useMemo(() => title.length, [title]);
    const contentCount = useMemo(() => content.length, [content]);

    useEffect(() => {
        if (!id) return;

        const fetchWorksheet = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${getApiUrl()}/api/mentor/worksheets`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('학습지를 불러오는데 실패했습니다.');
                const data = await res.json();
                const worksheet = data.find((w: any) => w.id === id);
                
                if (!worksheet) {
                    toast.error('학습지를 찾을 수 없습니다.');
                    router.push('/mentor/worksheets');
                    return;
                }

                setName(worksheet.title);
                setSubject(UI_SUBJECT_MAP[worksheet.subject as SubjectType]);
                
                if (worksheet.type === 'COLUMN' && worksheet.content) {
                    try {
                        const parsed = JSON.parse(worksheet.content);
                        if (parsed.topics && parsed.topics.length > 0) {
                            setTitle(parsed.topics[0].title || "");
                            setContent(parsed.topics[0].description || "");
                        }
                    } catch (e) {
                        console.error('Failed to parse content:', e);
                    }
                }

                if (worksheet.pdfUrl) {
                    const urls = worksheet.pdfUrl.split(',');
                    const names = worksheet.pdfFileName ? worksheet.pdfFileName.split(',') : [];
                    setUploadedFiles(urls.map((url: string, i: number) => ({
                        name: names[i] || extractFileName(url),
                        url: url
                    })));
                }
            } catch (err) {
                console.error('Fetch error:', err);
                toast.error('학습지 정보를 불러오는데 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchWorksheet();
    }, [id, router]);

    const handlePdfUpload = async (files: FileList) => {
        const fileList = Array.from(files);
        const pdfFiles = fileList.filter(f => f.type === 'application/pdf');

        if (pdfFiles.length === 0) {
            toast.warning('PDF 파일만 업로드 가능합니다.');
            return;
        }

        setIsUploading(true);
        try {
            const token = localStorage.getItem('token');
            const newUploadedFiles: UploadedFile[] = [...uploadedFiles];

            for (const file of pdfFiles) {
                const formData = new FormData();
                formData.append('pdf', file);

                const res = await fetch(`${getApiUrl()}/api/upload/pdf`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                });

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.error || `${file.name} 업로드에 실패했습니다.`);
                }

                const data = await res.json();
                newUploadedFiles.push({ file, name: data.originalName || file.name, url: data.url, size: file.size });
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

        let type: "COLUMN" | "PDF" = "COLUMN";
        const pdfUrlsStr = uploadedFiles.map(f => f.url).join(',');
        const pdfFileNamesStr = uploadedFiles.map(f => f.name).join(',');

        if (pdfUrlsStr && !title && !content) {
            type = "PDF";
        } else if (title || content) {
            type = "COLUMN";
        } else if (pdfUrlsStr) {
            type = "PDF";
        } else {
            toast.warning("칼럼 내용이나 PDF 파일을 등록해주세요.");
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${getApiUrl()}/api/mentor/worksheets/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: name,
                    subject: SUBJECT_MAP[subject],
                    type,
                    content: type === 'COLUMN' ? JSON.stringify({ topics: [{ title, description: content }] }) : null,
                    pdfUrl: pdfUrlsStr || null,
                    pdfFileName: pdfFileNamesStr || null,
                }),
            });

            if (!res.ok) throw new Error('학습지 수정에 실패했습니다.');

            toast.success('학습지가 수정되었습니다.');
            router.push('/mentor/worksheets');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : '오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="p-10 text-center">불러오는 중...</div>;
    }

    return (
        <div className="max-w-[760px] mx-auto">
            {/* 학습지명 */}
            <div className="text-[12px] font-bold text-gray-800">학습지명</div>
            <div className="mt-2 relative">
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 50))}
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
                {(["국어", "영어", "수학"] as SubjectUI[]).map((s) => (
                    <SubjectBtn key={s} active={subject === s} label={s} onClick={() => setSubject(s)} />
                ))}
            </div>

            {/* 학습지 수정 */}
            <div className="mt-10 text-[12px] font-bold text-gray-800">학습지 수정</div>

            {/* 칼럼 작성 */}
            <div className="mt-3">
                <Accordion title="칼럼 작성" open={columnOpen} onToggle={() => setColumnOpen((v) => !v)}>
                    <div className="rounded-md bg-white p-3">
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value.slice(0, 50))}
                            placeholder="제목 작성"
                            className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-[12px] text-gray-700 outline-none focus:ring-2 focus:ring-blue-200"
                        />
                        <div className="mt-1 text-right text-[10px] text-gray-400">{titleCount}/50</div>

                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value.slice(0, 1000))}
                            placeholder="내용 입력"
                            className="mt-3 h-[260px] w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-3 text-[12px] text-gray-700 outline-none focus:ring-2 focus:ring-blue-200"
                        />
                        <div className="mt-1 text-right text-[10px] text-gray-400">{contentCount}/1000</div>
                    </div>
                </Accordion>
            </div>

            {/* PDF 업로드 */}
            <div className="mt-4">
                <Accordion title="PDF 파일" open={pdfOpen} onToggle={() => setPdfOpen((v) => !v)}>
                    <div className="rounded-md bg-white p-4">
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
                                                {uf.name}
                                            </div>
                                        </div>
                                        {uf.size && (
                                            <div className="text-[11px] font-semibold text-gray-600">
                                                {formatBytes(uf.size)}
                                            </div>
                                        )}
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
                    {isSubmitting ? "수정 중..." : "수정 완료"}
                </button>
            </div>
        </div>
    );
}
