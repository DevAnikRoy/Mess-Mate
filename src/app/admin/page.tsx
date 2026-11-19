import Link from "next/link";
import { getAdminMesses, getAdminOverview } from "@/lib/admin";

function count(value: number | undefined) {
  return (value ?? 0).toLocaleString("en-IN");
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const [overview, messes] = await Promise.all([getAdminOverview(), getAdminMesses(q)]);
  return (
    <main className="min-h-dvh bg-[#F7F5FB] px-4 py-6 text-[#1B1730] sm:px-7 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#6C4DFF]">MESS MATE · OWNER CONSOLE</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">প্ল্যাটফর্ম ড্যাশবোর্ড</h1>
            <p className="mt-1 text-sm text-[#746F87]">মেস, ম্যানেজার ও সদস্যদের অবস্থা দেখুন এবং নির্দিষ্ট মেস পরিচালনা করুন।</p>
          </div>
          <Link className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm ring-1 ring-[#E8E2F1]" href="/">মেসমেটে ফিরুন</Link>
        </header>

        <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="মোট মেস" value={count(overview?.total_messes)} />
          <Stat label="সক্রিয় মেস" value={count(overview?.active_messes)} />
          <Stat label="সক্রিয় সদস্য" value={count(overview?.active_members)} />
          <Stat label="ম্যানেজার" value={count(overview?.managers)} />
          <Stat label="গত ৩০ দিনে মেস" value={count(overview?.new_messes_30d)} accent />
        </section>

        <section className="mt-7 rounded-[26px] bg-white p-4 shadow-sm ring-1 ring-[#E8E2F1] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">সব মেস</h2>
              <p className="text-sm text-[#746F87]">নাম বা সম্পূর্ণ মেস আইডি দিয়ে খুঁজুন।</p>
            </div>
            <form className="flex gap-2" action="/admin">
              <input className="h-10 w-52 rounded-xl border border-[#DED6ED] px-3 text-sm outline-none focus:border-[#6C4DFF]" name="q" defaultValue={q} placeholder="মেস খুঁজুন" />
              <button className="rounded-xl bg-[#6C4DFF] px-4 text-sm font-semibold text-white" type="submit">খুঁজুন</button>
            </form>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-[#EEE9F5] text-xs font-semibold text-[#746F87]">
                <tr><th className="pb-3">মেস</th><th className="pb-3">ম্যানেজার</th><th className="pb-3">সদস্য</th><th className="pb-3">তৈরি</th><th className="pb-3" /></tr>
              </thead>
              <tbody>
                {messes.map((mess) => (
                  <tr key={mess.id} className="border-b border-[#F1EDF6] last:border-0">
                    <td className="py-4"><p className="font-semibold">{mess.name}</p><p className="mt-0.5 font-mono text-[11px] text-[#8F899E]">{mess.id}</p></td>
                    <td className="py-4">{mess.manager_name}</td>
                    <td className="py-4">{count(mess.active_members)} সক্রিয় <span className="text-[#8F899E]">/ {count(mess.total_members)} মোট</span></td>
                    <td className="py-4 text-[#746F87]">{new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium" }).format(new Date(mess.created_at))}</td>
                    <td className="py-4 text-right"><Link href={`/admin/messes/${mess.id}`} className="rounded-lg bg-[#F3EEFF] px-3 py-2 text-xs font-bold text-[#5938D9]">দেখুন</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!messes.length && <p className="py-8 text-center text-sm text-[#746F87]">কোনো মেস পাওয়া যায়নি।</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <article className={`rounded-2xl p-4 shadow-sm ring-1 ${accent ? "bg-[#6C4DFF] text-white ring-[#6C4DFF]" : "bg-white ring-[#E8E2F1]"}`}><p className={`text-xs font-medium ${accent ? "text-white/75" : "text-[#746F87]"}`}>{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></article>;
}
