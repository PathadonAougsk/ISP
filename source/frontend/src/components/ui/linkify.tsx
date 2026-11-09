import type { ReactNode } from "react";

// bare domain (no http or www) only linked when its tld is in this list
const BARE_TLDS = [
  "com",
  "net",
  "org",
  "edu",
  "gov",
  "io",
  "co",
  "dev",
  "app",
  "ai",
  "info",
  "me",
  "th",
];

// one capture group only, because renderWithLinks use split
// http(s):// or www. = any tld. bare domain = tld in the list above
const urlRegex = new RegExp(
  String.raw`(?<![\w.@-])((?:(?:https?:\/\/|www\.)[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+|[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.(?:${BARE_TLDS.join("|")})(?![a-zA-Z0-9-]|\.[a-zA-Z0-9]))(?::\d+)?(?:\/(?:[^\s]*[^\s.,!?;:])?)?)`,
  "g",
);

// make plain text into text with clickable links
export function renderWithLinks(text: string): ReactNode {
  const parts = text.split(urlRegex);

  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <a
        key={index}
        href={/^https?:\/\//.test(part) ? part : `https://${part}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-800 italic underline"
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}
