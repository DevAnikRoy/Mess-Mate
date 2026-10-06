"use client";

import { useState } from "react";

export function Avatar({
  name,
  src,
  className = "",
}: {
  name: string;
  src: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const letter = [...name.trim()][0] || "?";

  if (!src || failed) {
    return (
      <span className={`grid place-items-center bg-[#6C4DFF] font-semibold text-white ${className}`}>
        {letter}
      </span>
    );
  }

  return (
    // External Google and Gravatar hosts vary; a plain image can fall back to the letter.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      className={`object-cover ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
