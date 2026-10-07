import Image from "next/image";

// Settings chrome icons live in /public as "<name>.svg" and are purely
// decorative, so they are hidden from assistive tech.
export default function Icon({
  name,
  size = 20,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={`/${name}.svg`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={className}
    />
  );
}
