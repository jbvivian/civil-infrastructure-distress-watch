function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function HighlightedSourceText({
  text,
  terms,
}: {
  text: string;
  terms: string[];
}) {
  const highlightTerms = [...new Set(terms.map((term) => term.trim()).filter(Boolean))]
    .sort((a, b) => b.length - a.length)
    .slice(0, 60);

  if (highlightTerms.length === 0) {
    return <div className="whitespace-pre-wrap">{text}</div>;
  }

  const pattern = new RegExp(
    `(${highlightTerms.map(escapeRegExp).join("|")})`,
    "gi",
  );
  const exactTerms = new Set(highlightTerms.map((term) => term.toLowerCase()));

  return (
    <div className="whitespace-pre-wrap">
      {text.split(pattern).map((part, index) =>
        exactTerms.has(part.toLowerCase()) ? (
          <mark
            key={`${part}-${index}`}
            className="rounded-sm bg-amber-200 px-0.5 text-inherit"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </div>
  );
}
