import { getYoutubeEmbedSrc } from '../utils/youtubeEmbed.js';

function RichInline({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) return <strong key={i} className="font-semibold text-[var(--color-text)]">{m[1]}</strong>;
    return <span key={i}>{part}</span>;
  });
}

function RichParagraph({ children }) {
  const text = typeof children === 'string' ? children : '';
  return (
    <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
      <RichInline text={text} />
    </p>
  );
}

/**
 * Renders a help article body (title block + optional video + sections).
 * @param {{ title: string, description: string, category: string, sections: Array, videoUrl?: string }} topic
 * @param {{ hideHeader?: boolean }} props
 */
export default function HelpArticleView({ topic, hideHeader = false }) {
  if (!topic) return null;

  const embedSrc = topic.videoUrl ? getYoutubeEmbedSrc(topic.videoUrl) : null;

  return (
    <div>
      {!hideHeader && (
        <header className="mb-6 pb-6 border-b border-[var(--color-border)]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-primary)] mb-2">
            {topic.category}
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--color-text)] tracking-tight leading-tight">
            {topic.title}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-2 leading-relaxed">{topic.description}</p>
        </header>
      )}

      {embedSrc && (
        <div className="mb-6 mx-auto max-w-sm w-full rounded-xl overflow-hidden border border-[var(--color-border)] bg-black/5 shadow-sm">
          <div className="aspect-video w-full">
            <iframe
              title={`Video: ${topic.title}`}
              src={embedSrc}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      )}

      <div className="space-y-6">
        {(topic.sections || []).map((section, idx) => (
          <section key={idx}>
            <h2 className="text-sm font-bold text-[var(--color-text)] mb-2">{section.heading}</h2>
            <div className="space-y-2">
              {section.paragraphs?.map((p, i) => (
                <RichParagraph key={i}>{p}</RichParagraph>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="list-disc pl-5 space-y-1.5 text-sm text-[var(--color-text-muted)] leading-relaxed marker:text-[var(--color-primary)]">
                  {section.bullets.map((b, i) => (
                    <li key={i}>
                      <RichInline text={b} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
