// shared look for settings. same tokens as dashboard

// text
export const TITLE = "text-[28px] leading-tight font-bold text-black";
export const MUTED = "text-gray-500";
export const ERROR = "font-semibold text-red-700";
export const MESSAGE = "py-4 text-center font-medium text-gray-400";

// inputs
export const FIELD =
  "h-10 rounded-full border-2 border-(--primary-color-3) bg-white px-4 outline-none placeholder:text-gray-400 focus:border-(--primary-color-2) disabled:opacity-50";
export const SELECT =
  "h-10 rounded-full border-2 border-(--primary-color-3) bg-white px-2 outline-none focus:border-(--primary-color-2) disabled:opacity-50";
export const LABEL =
  "flex flex-col gap-1.5 text-sm font-semibold text-gray-500";

// buttons, add the width at the place you use it
export const BTN =
  "h-10 rounded-full border-2 border-(--primary-color-3) bg-white text-base font-semibold text-black enabled:hover:bg-(--panel-bg) disabled:opacity-50";
export const BTN_THIN =
  "h-10 rounded-full border-2 border-(--primary-color-3) bg-white text-base font-normal text-black enabled:hover:bg-(--panel-bg) disabled:opacity-50";
export const SAVE =
  "h-10 min-w-25 rounded-full bg-(--primary-color-2) px-4 text-base font-bold text-white enabled:hover:bg-(--primary-color-2-hover) disabled:opacity-50";
export const DANGER =
  "h-10 rounded-full bg-(--primary-red) text-base font-bold text-white enabled:hover:bg-(--primary-red-hover) disabled:opacity-50";

// panels
export const CARD = "flex flex-col gap-5 rounded-[20px] bg-(--panel-bg) p-4";
export const LIST_PANEL =
  "flex flex-col gap-2 rounded-[30px] bg-(--panel-bg) p-3";
export const HEAD =
  "flex h-8 shrink-0 items-center gap-3 rounded-[20px] bg-(--primary-color-2) px-4 text-base font-bold text-white";
export const ROW = "flex items-center gap-3 rounded-[20px] bg-white px-4 py-2";
