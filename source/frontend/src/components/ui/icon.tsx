// plain img so any ratio work. size come from className only
export default function Icon({
  src,
  className = "size-4 shrink-0",
  alt = "",
}: {
  src: string;
  className?: string;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={false}
      loading="lazy"
    />
  );
}
