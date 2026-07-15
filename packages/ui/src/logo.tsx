export interface LogoProps {
  size?: number;
  className?: string;
}

/** Brand mark — drop the real file at `apps/web/public/logo.jpg`. */
export function Logo({ size = 28, className }: LogoProps) {
  return (
    <img
      src="/logo.jpg"
      alt=""
      width={size}
      height={size}
      className={className}
      decoding="async"
    />
  );
}
