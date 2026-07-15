export interface LogoProps {
  size?: number;
  className?: string;
}

/** Brand mark — drop the real file at `apps/web/public/logo.jpeg`. */
export function Logo({ size = 28, className }: LogoProps) {
  return (
    <img
      src="/logo.jpeg"
      alt=""
      width={size}
      height={size}
      className={className}
      decoding="async"
    />
  );
}
