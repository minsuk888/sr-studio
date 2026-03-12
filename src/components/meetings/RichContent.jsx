/**
 * Safe HTML content renderer for agenda items.
 * Renders TipTap HTML output with proper styling.
 */
export default function RichContent({ html, className = '' }) {
  if (!html || html === '<p></p>') return null;

  return (
    <div
      className={`prose prose-invert prose-sm max-w-none
        [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-gray-100 [&_h1]:my-1
        [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-gray-100 [&_h2]:my-1
        [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-gray-200 [&_h3]:my-0.5
        [&_p]:text-sm [&_p]:text-gray-300 [&_p]:my-0.5 [&_p]:leading-relaxed
        [&_ul]:my-0.5 [&_ul]:pl-4 [&_ol]:my-0.5 [&_ol]:pl-4
        [&_li]:text-sm [&_li]:text-gray-300
        [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded [&_img]:my-1 [&_img]:max-h-48
        [&_strong]:text-gray-100
        [&_em]:text-gray-200
        [&_u]:text-gray-200
        ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
