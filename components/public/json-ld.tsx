/** Renders a schema.org object as a JSON-LD <script> tag. Server component — no client JS. */
export function JsonLd({ data }: { data: object }) {
  // Escaping "<" prevents a "</script>" sequence inside any string value
  // (e.g. a title) from breaking out of the script tag.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- JSON.stringify of trusted server-built objects, not user HTML
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
