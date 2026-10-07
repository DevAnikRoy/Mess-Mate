import Link from "next/link";
import { JoinBox } from "@/components/onboarding";

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#E9E1FF] px-4 py-10">
      <div className="w-full max-w-[420px] rounded-[32px] bg-white px-6 py-8 shadow-[0_20px_60px_rgba(60,30,120,0.08)]">
        <p className="text-[26px] font-bold tracking-tight">মেসমেট</p>
        <h1 className="mt-4 text-xl font-semibold">মেসে যোগ দিন</h1>
        <p className="mb-5 mt-1 text-sm text-[#8E8AA3]">মেসের নাম মিলিয়ে নিয়ে যোগ দিন।</p>
        <JoinBox initialCode={code} />
        <Link href="/onboarding" className="mt-5 block text-center text-sm text-[#6C4DFF]">
          নিজের নতুন মেস খুলতে চাই
        </Link>
      </div>
    </main>
  );
}
