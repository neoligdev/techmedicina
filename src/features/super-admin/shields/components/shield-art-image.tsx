/** Render uploaded artwork as an image document, never as application HTML. */
export function ShieldArtImage({
  svg,
  label,
  className,
}: {
  svg: string;
  label: string;
  className?: string;
}) {
  return (
    <img
      className={className}
      alt={label}
      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
    />
  );
}
