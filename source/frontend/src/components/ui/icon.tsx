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

// open / closed eye, tinted by bg colour through a mask
export function EyeIcon({ shown }: { shown: boolean }) {
  const mask = `url(${shown ? "/eye-on.svg" : "/eye-off.svg"})`;

  return (
    <span
      aria-hidden="true"
      className="size-5 bg-(--primary-color-deep)"
      style={{
        maskImage: mask,
        maskRepeat: "no-repeat",
        maskPosition: "center",
        maskSize: "contain",
        WebkitMaskImage: mask,
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        WebkitMaskSize: "contain",
      }}
    />
  );
}
