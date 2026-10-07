// plain img so any ratio work. size come from className only
export default function Icon({
  src,
  className = "h-4 w-auto",
  alt = "",
}: {
  src: string;
  className?: string;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} draggable={false} />
  );
}
