"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";

export default function Announcement() {
    const description = "Please be informed that all classes today are canceled due to an unexpected situation. Students should not attend and may use this time for rest or personal activities.\n\ngoogle.com and www.google.com\n\nhttps://youtu.be/dQw4w9WgXcQ";
    const urlRegex = /((?:https?:\/\/|www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:\/[^\s.,!?;:]*)?)/g;
    const parts = description.split(urlRegex);

    return (
        <div className="h-90 w-full overflow-hidden rounded-[30px] bg-(--panel-bg)">
            <div className="flex h-full flex-col p-5 pb-0">
                <h1 className="text-3xl font-bold text-black line-clamp-2">
                    Test Topic Announcement 001 and show Line wrapping Test Topic Announcement 001 and show Line wrapping
                </h1>

                <div className="mt-2 flex items-center gap-12 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <Image src="/user.svg" alt="" width={14} height={16} />
                        <span>Pasin Mclaren</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Image src="/clock.svg" alt="" width={16} height={16} />
                        <span>Friday 28 August 2026, 09:47</span>
                    </div>
                </div>

                <div className="mt-2 text-base font-normal text-gray-700 line-clamp-7 whitespace-pre-line">
                    {parts.map((part, index) => (
                        <Fragment key={index}>
                            {index % 2 === 1 ? (
                                <a href={part.startsWith("http") ? part : `https://${part}`} target="_blank" rel="noopener noreferrer" className="italic underline hover:text-gray-500">
                                    {part}
                                </a>
                            ) : (
                                part
                            )}
                        </Fragment>
                    ))}
                </div>

                <div className="-mx-5 mt-auto">
                    <Link href="/announcement" className="group block rounded-b-[30px] bg-(--primary-color-3) px-5 py-3 text-center hover:bg-(--primary-color-3-hover)">
                        <span className="text-base font-semibold text-black underline group-hover:text-gray-800">Readmore</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
