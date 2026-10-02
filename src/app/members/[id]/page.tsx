import { notFound } from "next/navigation";
import { MemberProfile } from "@/components/member";
import { type MemberId, members } from "@/lib/model";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!members.some((member) => member.id === id)) notFound();
  return <MemberProfile id={id as MemberId} />;
}
