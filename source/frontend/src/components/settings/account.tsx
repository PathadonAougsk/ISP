"use client";

import { type Account } from "@/lib/account";
import Row, { EditButton } from "./row";

export default function AccountPanel({
  account,
  loading,
}: {
  account: Account | null;
  loading: boolean;
}) {
  const placeholder = loading ? "Loading..." : "Not available";

  return (
    <>
      <section className="flex flex-col gap-7">
        <h2 className="text-[28px] leading-tight">Account Info</h2>
        <Row
          label="Username"
          value={account?.username ?? placeholder}
          action={<EditButton />}
        />
        <Row
          label="Email"
          value={account?.email ?? placeholder}
          reveal={Boolean(account)}
          action={<EditButton />}
        />
      </section>

      <hr className="my-12 border-[#d0d0d0]" />

      <section className="flex flex-col gap-7">
        <h2 className="text-[28px] leading-tight">Password & Security</h2>
        <Row label="Password" action={<EditButton />} />
      </section>
    </>
  );
}
