import Image from "next/image";

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
    <Image
      src={src}
      width={0}
      height={0}
      sizes="auto"
      className={className}
      alt={alt}
      draggable={false}
    />
  );
}
