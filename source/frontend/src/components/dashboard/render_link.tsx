import { Fragment, type ReactNode } from "react";

const urlRegex =
  /(?<![\w.-])((?:https?:\/\/|www\.)[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?::\d+)?(?:\/(?:[^\s]*[^\s.,!?;:])?)?)/g;

// make plain text into text with clickable links
export function renderWithLinks(text: string): ReactNode {
  const parts = text.split(urlRegex);

  return parts.map((part, index) => (
    <Fragment key={index}>
      {index % 2 === 1 ? (
        <a
          href={part.startsWith("http") ? part : `https://${part}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-800 italic underline"
        >
          {part}
        </a>
      ) : (
        part
      )}
    </Fragment>
  ));
}
