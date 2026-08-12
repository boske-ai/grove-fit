export interface LogoProps {
  size?: number;
  className?: string;
  /**
   * Where the brand mark lives.
   *
   * Defaults to a root-absolute path, which is correct when the app is served
   * from the domain root. Shells that mount elsewhere — `boske.dev/fit`, or
   * Tauri's custom protocol — must pass a base-resolved URL, since this package
   * cannot know the host's deploy path.
   */
  src?: string;
}

export function Logo({ size = 28, className, src = '/logo.jpeg' }: LogoProps) {
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={className}
      decoding="async"
    />
  );
}
