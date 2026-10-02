"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { formatFullDateTime } from "@/lib/format";

type DateInput = Parameters<typeof formatFullDateTime>[0];

// close with a short delay so the closing animation can play
export function usePopupClose(onClose: () => void) {
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        if (isClosing) return;
        setIsClosing(true);
        setTimeout(onClose, 125);
    };

    return { isClosing, handleClose };
}

// dark overlay + white panel. className is for layout that differs per popup
export function PopupFrame({
    isClosing,
    onClose,
    className = "",
    children,
}: {
    isClosing: boolean;
    onClose: () => void;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-50">
            <div className={`popup-overlay absolute inset-0 bg-black ${isClosing ? "popup-overlay-closing" : ""}`} onClick={onClose} />

            <div className={`popup-panel absolute bottom-0 left-[10%] h-[90%] w-[80%] rounded-t-[30px] bg-white p-5 ${className} ${isClosing ? "popup-panel-closing" : ""}`}>
                {children}
            </div>
        </div>
    );
}

// category + due date row. children are extra items added at the end
export function PopupMeta({
    categoryName,
    dueDate,
    children,
}: {
    categoryName: string;
    dueDate: DateInput;
    children?: ReactNode;
}) {
    return (
        <div className="mt-2 flex flex-wrap items-center gap-x-12 gap-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
                <Image src="/header_donut_gray.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
                <span>{categoryName}</span>
            </div>
            <div className="flex items-center gap-2">
                <Image src="/clock.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
                <span>{formatFullDateTime(dueDate)}</span>
            </div>
            {children}
        </div>
    );
}

// shows nothing when the item was never edited
export function PopupEdited({ created, updated }: { created: unknown; updated: DateInput }) {
    if (updated === created) return null;

    return (
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
            <span className="font-semibold italic">Edited</span>
            <Image src="/clock.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
            <span>{formatFullDateTime(updated)}</span>
        </div>
    );
}
