import Link from "next/link";
import { getAdminMessMembers } from "@/lib/admin";
import { manageAdminMember } from "@/app/admin/actions";

export default async function AdminMessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return <main className="p-8">মেস পাওয়া যায়নি।</main>;
  const members = await getAdminMessMembers(id);
  const messName = members[0]?.mess_name ?? "মেস পাওয়া যায়নি";
  return (
    <main className="min-h-dvh bg-[#F7F5FB] px-4 py-6 text-[#1B1730] sm:px-7 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="text-sm font-semibold text-[#6C4DFF]">← সব মেস</Link>
        <header className="mt-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold text-[#6C4DFF]">MESS DETAILS</p><h1 className="mt-1 text-3xl font-bold">{messName}</h1><p className="mt-1 font-mono text-xs text-[#8F899E]">{id}</p></div><p className="rounded-xl bg-white px-4 py-2 text-sm shadow-sm ring-1 ring-[#E8E2F1]">{members.filter((member) => !member.left_on).length} সক্রিয় সদস্য</p></header>
        <section className="mt-7 overflow-hidden rounded-[26px] bg-white shadow-sm ring-1 ring-[#E8E2F1]">
          <div className="border-b border-[#EEE9F5] p-5"><h2 className="font-bold">সদস্য ও ম্যানেজার</h2><p className="mt-1 text-sm text-[#746F87]">সাসপেন্ড করলে শুধু এই মেসের সদস্যতা বন্ধ হবে। অ্যাকাউন্ট ও অন্য মেসের সদস্যতা থাকবে।</p></div>
          <div className="divide-y divide-[#F1EDF6]">
            {members.map((member) => <MemberRow key={member.user_id} member={member} />)}
          </div>
          {!members.length && <p className="p-6 text-sm text-[#746F87]">এই মেসের কোনো সদস্য নেই।</p>}
        </section>
      </div>
    </main>
  );
}

function MemberRow({ member }: { member: Awaited<ReturnType<typeof getAdminMessMembers>>[number] }) {
  const inactive = Boolean(member.left_on);
  return <div className="flex flex-wrap items-center justify-between gap-4 p-5"><div><div className="flex items-center gap-2"><p className="font-semibold">{member.full_name}</p><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${member.role === "manager" && !inactive ? "bg-[#EEE8FF] text-[#5938D9]" : inactive ? "bg-[#F1EEF4] text-[#746F87]" : "bg-[#E9F8EC] text-[#128A4A]"}`}>{inactive ? "সাসপেন্ড" : member.role === "manager" ? "ম্যানেজার" : "সদস্য"}</span></div><p className="mt-1 text-sm text-[#746F87]">{member.email ?? "ইমেইল নেই"}</p><p className="mt-1 text-xs text-[#8F899E]">যোগ দিয়েছেন {member.joined_on}</p></div><div className="flex flex-wrap gap-2"><form action={manageAdminMember}><input type="hidden" name="messId" value={member.mess_id} /><input type="hidden" name="userId" value={member.user_id} /><input type="hidden" name="action" value={inactive ? "restore" : "suspend"} /><button className="rounded-lg border border-[#DED6ED] px-3 py-2 text-xs font-bold">{inactive ? "ফিরিয়ে আনুন" : "সাসপেন্ড করুন"}</button></form>{!inactive && member.role !== "manager" && <form action={manageAdminMember}><input type="hidden" name="messId" value={member.mess_id} /><input type="hidden" name="userId" value={member.user_id} /><input type="hidden" name="action" value="transfer_manager" /><button className="rounded-lg bg-[#6C4DFF] px-3 py-2 text-xs font-bold text-white">ম্যানেজার করুন</button></form>}</div></div>;
}
