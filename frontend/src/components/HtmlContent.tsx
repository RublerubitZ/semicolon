/**
 * HTML 콘텐츠를 안전하게 렌더링하는 컴포넌트
 * TipTap 에디터로 작성된 HTML을 표시할 때 사용
 */

interface HtmlContentProps {
  html: string;
  className?: string;
}

export default function HtmlContent({ html, className = '' }: HtmlContentProps) {
  // 빈 HTML 처리 (<p></p> 같은 경우)
  const isEmpty = !html || html.trim() === '' || html === '<p></p>';

  if (isEmpty) {
    return <p className={`text-gray-500 italic ${className}`}>내용이 없습니다.</p>;
  }

  return (
    <div
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
      }}
    />
  );
}
