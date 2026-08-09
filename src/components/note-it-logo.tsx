import Image, { type ImageProps } from "next/image";

export function NoteItLogo({ className, ...props }: Omit<ImageProps, "src" | "alt" | "width" | "height">) {
  return <Image className={className} src="/brand/note-it-logo.png" alt="Note It" width={1000} height={319} sizes="(max-width: 760px) 132px, 204px" priority {...props} />;
}
