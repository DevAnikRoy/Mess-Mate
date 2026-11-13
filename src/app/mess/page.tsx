import { Suspense } from "react";
import { MessSettings } from "@/components/mess-settings";
import Link from "next/link";

export default function Page() {
  return (
    <Suspense>
      <Link href="/whatsapp" className="mb-4 block rounded-2xl bg-[#F7F4FF] px-4 py-3 font-semibold text-[#6C4DFF]">হোয়াটসঅ্যাপ বার্তা ও সংযোগ</Link>
      <MessSettings />
    </Suspense>
  );
}
