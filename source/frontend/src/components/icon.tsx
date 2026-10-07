import Image from "next/image";

export default function Icon({
  src,
  width = 16,
  height = 16,
  className = "h-4 w-auto",
  alt = "",
}: {
  src: string;
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <Image
      src={src}
      width={width}
      height={height}
      className={className}
      alt={alt}
      draggable={false}
    />
  );
}
