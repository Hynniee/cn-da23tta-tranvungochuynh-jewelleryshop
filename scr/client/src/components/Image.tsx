import type { ImgHTMLAttributes } from "react";

export default function Image({
  src,
  alt = "",
  onError,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      {...props}
      alt={alt}
      src={src || "/placeholder.svg"}
      onError={(event) => {
        onError?.(event);
        const fallback = new URL("/placeholder.svg", window.location.origin)
          .href;
        if (event.currentTarget.src !== fallback)
          event.currentTarget.src = fallback;
      }}
    />
  );
}
