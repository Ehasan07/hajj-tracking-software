import { HOLY_PHOTOS, type HolyPhoto as Photo, type HolyPhotoKey } from "@/lib/holy-photos";

/**
 * A photograph of a holy place, served from our own server in two sizes, with
 * its place name and the credit its licence asks for (author, licence, source).
 */
export function HolyPhoto({
  photo,
  locale,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  className = "",
  imgClassName = "aspect-[4/3]",
  caption = true,
  captionAt = "bottom",
  priority = false,
}: {
  photo: HolyPhotoKey;
  locale: "bn" | "en";
  sizes?: string;
  className?: string;
  imgClassName?: string;
  /** Show the place name over the photo. The credit is always shown. */
  caption?: boolean;
  /** "top" when something sits over the photo's lower edge. */
  captionAt?: "top" | "bottom";
  priority?: boolean;
}) {
  const p: Photo = HOLY_PHOTOS[photo];
  const base = `/images/holy/${p.file}`;
  return (
    <figure className={`relative overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${base}-1600.webp`}
        srcSet={`${base}-800.webp 800w, ${base}-1600.webp 1600w`}
        sizes={sizes}
        width={p.width}
        height={p.height}
        alt={p.alt[locale]}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        style={p.focus ? { objectPosition: p.focus } : undefined}
        className={`block h-full w-full object-cover ${imgClassName}`}
      />
      <figcaption
        className={`pointer-events-none absolute inset-x-0 flex flex-wrap justify-between gap-x-3 gap-y-1 from-black/65 via-black/25 to-transparent px-4 text-white ${
          captionAt === "top" ? "top-0 items-start bg-gradient-to-b pt-3 pb-10" : "bottom-0 items-end bg-gradient-to-t pt-10 pb-3"
        }`}
      >
        {caption ? <span className="text-[14px] font-semibold drop-shadow">{p.place[locale]}</span> : <span />}
        <span className="pointer-events-auto text-[11px] text-white/80">
          {locale === "bn" ? "ছবি: " : "Photo: "}
          <a href={p.credit.page} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            {p.credit.author}
          </a>
          {", "}
          {p.credit.licenseUrl ? (
            <a href={p.credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap underline underline-offset-2">
              {p.credit.license}
            </a>
          ) : (
            p.credit.license
          )}
          {p.credit.edited ? (locale === "bn" ? ", ছাঁটা হয়েছে" : ", cropped") : null}
        </span>
      </figcaption>
    </figure>
  );
}
