import { Suspense } from "react";
import { MessSettings } from "@/components/mess-settings";

export default function Page() {
  return (
    <Suspense>
      <MessSettings />
    </Suspense>
  );
}
