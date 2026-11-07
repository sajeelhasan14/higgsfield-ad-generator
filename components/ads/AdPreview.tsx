'use client';

// An ad thumbnail that opens the ad full size, with its carousel slides when it has them.
// Uses the browser's own <dialog>, which already handles the Esc key and keeps focus inside it.
import { useRef, useState } from 'react';

interface Props {
  /** Every image of the ad, in order: the post, then any carousel slides. */
  images: string[];
  /** Where each image goes, shown under it in the preview. */
  labels: string[];
  title: string;
  /** Which image the thumbnail shows and the preview opens on. */
  start?: number;
  className: string;
  buttonClassName?: string;
}

export function AdPreview({ images, labels, title, start = 0, className, buttonClassName = 'shrink-0 self-start' }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [shown, setShown] = useState(start);

  function open() {
    setShown(start);
    dialog.current?.showModal();
  }

  return (
    <>
      <button type="button" onClick={open} aria-label={`Preview the ad for ${title}`} className={`block cursor-zoom-in rounded-xl focus-visible:outline-2 focus-visible:outline-brand ${buttonClassName}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- our own JPEG, already sized */}
        <img src={images[start]} alt="" className={className} />
      </button>

      <dialog
        ref={dialog}
        aria-label={`Ad preview: ${title}`}
        // A click on the dark area lands on the dialog itself, not on anything inside it.
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
        className="m-auto max-w-[calc(100vw-2rem)] rounded-2xl bg-surface p-0 text-ink backdrop:bg-black/70"
      >
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-4">
            <p className="max-w-md font-display text-sm font-bold leading-snug">{title}</p>
            <button type="button" onClick={() => dialog.current?.close()} className="rounded-full border border-line bg-white px-3 py-1 text-sm font-semibold hover:bg-stone-50">
              Close
            </button>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element -- our own JPEG, already sized */}
          <img src={images[shown]} alt={`Ad for ${title}`} className="mx-auto max-h-[68vh] w-auto rounded-lg" />
          <p className="text-center text-sm font-medium">{labels[shown]}</p>

          {images.length > 1 && (
            <div className="flex justify-center gap-2 overflow-x-auto">
              {images.map((src, i) => (
                <button key={src} type="button" onClick={() => setShown(i)} aria-label={`Show image ${i + 1}`} aria-current={i === shown} className={`shrink-0 rounded-md border-2 ${i === shown ? 'border-brand' : 'border-transparent'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- our own JPEG, already sized */}
                  <img src={src} alt="" className="aspect-[4/5] w-12 rounded object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
