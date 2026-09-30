import { Fragment, type ReactNode } from "react";

const urlRegex = /((?:https?:\/\/|www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:\/[^\s.,!?;:]*)?)/g;

// make plain text into text with clickable links
export function renderWithLinks(text: string): ReactNode {
    const parts = text.split(urlRegex);

    return parts.map((part, index) => (
        <Fragment key={index}>
            {index % 2 === 1 ? (
                <a href={part.startsWith("http") ? part : `https://${part}`} target="_blank" rel="noopener noreferrer" className="italic underline hover:text-gray-500">
                    {part}
                </a>
            ) : (
                part
            )}
        </Fragment>
    ));
}
