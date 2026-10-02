"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function Spark({ values, color }: { values: number[]; color: string }) {
  const width = 78;
  const height = 28;
  const max = Math.max(...values, 0.5);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const d = values
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * (height - 4) - 2;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MealChart({ data }: { data: { day: number; meals: number; closed: boolean }[] }) {
  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="mealFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6C4DFF" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#6C4DFF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" tick={{ fill: "#8E8AA3", fontSize: 11 }} axisLine={false} tickLine={false} interval={4} />
          <YAxis tick={{ fill: "#8E8AA3", fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
          <Tooltip
            cursor={{ stroke: "#C4B5FD", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as { day: number; meals: number; closed: boolean };
              return (
                <div className="rounded-2xl bg-[#6C4DFF] px-3 py-2 text-white shadow-none">
                  <p className="text-[11px] text-white/80">{row.day} তারিখ</p>
                  <p className="text-sm font-semibold">{row.closed ? "রান্না বন্ধ" : `${row.meals} মিল`}</p>
                </div>
              );
            }}
          />
          <Area type="monotone" dataKey="meals" stroke="#6C4DFF" strokeWidth={2.4} fill="url(#mealFill)" dot={false} activeDot={{ r: 4, fill: "#6C4DFF" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SlotDonut({ b, l, d }: { b: number; l: number; d: number }) {
  const parts = [
    { key: "সকাল", value: b, color: "#7DDEBE" },
    { key: "দুপুর", value: l, color: "#6C4DFF" },
    { key: "রাত", value: d, color: "#F0C14A" },
  ];
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1;
  const radius = 46;
  const circ = 2 * Math.PI * radius;
  let cursor = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#F4F0FF" strokeWidth="14" />
        {parts.map((part) => {
          const length = (part.value / total) * circ;
          const dash = `${length} ${circ - length}`;
          const node = (
            <circle
              key={part.key}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={part.color}
              strokeWidth="14"
              strokeDasharray={dash}
              strokeDashoffset={-cursor}
              strokeLinecap="butt"
              transform="rotate(-90 60 60)"
            />
          );
          cursor += length;
          return node;
        })}
        <text x="60" y="56" textAnchor="middle" fontSize="11" fill="#8E8AA3">
          মিল
        </text>
        <text x="60" y="74" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1B1730">
          {total % 1 === 0 ? total : total.toFixed(1)}
        </text>
      </svg>
      <div className="space-y-2 text-sm">
        {parts.map((part) => (
          <div key={part.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: part.color }} />
            <span className="text-[#8E8AA3]">{part.key}</span>
            <span className="font-semibold">{part.value % 1 === 0 ? part.value : part.value.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
