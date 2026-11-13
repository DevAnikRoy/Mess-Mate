import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";
import ts from "typescript";

const source = fs.readFileSync(new URL("../shared/whatsapp.ts", import.meta.url), "utf8");
const exportsObject = {};
new Function(
  "exports",
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
)(exportsObject);
const { parseWhatsAppExport, publishWhatsAppImport } = exportsObject;

test("Android exports retain Bengali multiline content and use Dhaka timestamps", () => {
  const parsed = parseWhatsAppExport(
    "12/11/2026, 8:15 PM - রাফি: চাল লাগবে।\nডিমও লাগবে।\n12/11/2026, 8:16 PM - সাদিয়া: ঠিক আছে।",
    "dmy",
  );
  assert.equal(parsed.messages.length, 2);
  assert.equal(parsed.messages[0].sent_at, "2026-11-12T14:15:00.000Z");
  assert.equal(parsed.messages[0].body, "চাল লাগবে।\nডিমও লাগবে।");
});

test("bracketed exports, date order, Bengali digits and AM/PM parse explicitly", () => {
  const parsed = parseWhatsAppExport(
    "[১১/১২/২০২৬, ১২:০১:০২ AM] রাফি ২: চাল ৫ কেজি ৩৫০ টাকা",
    "mdy",
  );
  assert.equal(parsed.messages[0].sent_at, "2026-11-11T18:01:02.000Z");
  assert.equal(parsed.messages[0].sender, "রাফি ২");
  assert.equal(parsed.messages[0].body, "চাল ৫ কেজি ৩৫০ টাকা");
});

test("system messages, impossible dates and media are excluded from publishing", () => {
  const parsed = parseWhatsAppExport(
    "31/02/2026, 10:15 - Rafi: invalid\n12/11/2026, 10:16 - Messages are encrypted\n12/11/2026, 10:17 - Rafi: <Media omitted>\n12/11/2026, 10:18 - +8801700000000: visible",
    "dmy",
  );
  assert.equal(parsed.messages.length, 1);
  assert.equal(parsed.messages[0].sender, "WhatsApp সদস্য");
  assert.equal(parsed.skipped, 3);
});

test("imports are bounded and retries retain distinct identities for repeated messages", async () => {
  const raw = Array.from({ length: 501 }, (_, i) => `12/11/2026, 10:15 - QA: message ${i}`).join(
    "\n",
  );
  const parsed = parseWhatsAppExport(raw, "dmy");
  assert.equal(parsed.messages.length, 500);
  assert.equal(parsed.skipped, 1);
  assert.equal(parsed.messages[0].body, "message 1");
  const item = { sender: "QA", body: "same", sent_at: "2026-11-12T04:15:00.000Z" };
  const first = [],
    second = [];
  const hash = async (value) => createHash("sha256").update(value).digest("hex");
  await publishWhatsAppImport([item, item], hash, async (events) => {
    first.push(...events);
    return events.length;
  });
  await publishWhatsAppImport([item, item], hash, async (events) => {
    second.push(...events);
    return events.length;
  });
  assert.notEqual(first[0].event_key, first[1].event_key);
  assert.deepEqual(first, second);
});
