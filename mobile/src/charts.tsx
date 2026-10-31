import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { mealText } from "./lib/format";
import { colors } from "./theme";

export function Spark({ values, color }: { values: number[]; color: string }) {
  const width = 78;
  const height = 28;
  if (values.length < 2) return null;
  const max = Math.max(...values, 0.5);
  const step = width / (values.length - 1);
  const d = values
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * (height - 4) - 2;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <Svg width={width} height={height}>
      <Path d={d} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function MealChart({ data }: { data: { day: number; meals: number; closed: boolean }[] }) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const height = 220;
  const padL = 28;
  const padB = 22;
  const padT = 12;
  const max = Math.max(...data.map((row) => row.meals), 1);
  const innerW = Math.max(width - padL - 8, 1);
  const innerH = height - padT - padB;
  const step = data.length > 1 ? innerW / (data.length - 1) : innerW;

  const points = data.map((row, index) => {
    const x = padL + index * step;
    const y = padT + innerH - (row.meals / max) * innerH;
    return { x, y, row };
  });
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const fill =
    points.length > 0
      ? `${line} L${points[points.length - 1].x.toFixed(1)} ${(padT + innerH).toFixed(1)} L${points[0].x.toFixed(1)} ${(padT + innerH).toFixed(1)} Z`
      : "";
  const ticks = [0, 0.5, 1].map((part) => ({ y: padT + innerH - part * innerH, label: mealText(max * part) }));
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <View style={{ height, marginTop: 8 }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {ticks.map((tick) => (
            <Path key={tick.label} d={`M${padL} ${tick.y} H${width - 4}`} stroke="#F3EEF9" strokeWidth={1} />
          ))}
          {fill ? <Path d={fill} fill="#6C4DFF" fillOpacity={0.16} /> : null}
          {line ? <Path d={line} fill="none" stroke="#6C4DFF" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" /> : null}
          {active != null && points[active] ? <Circle cx={points[active].x} cy={points[active].y} r={4} fill="#6C4DFF" /> : null}
        </Svg>
      )}
      <View style={{ position: "absolute", left: 0, top: 0, bottom: padB, width: padL, justifyContent: "space-between" }}>
        {[...ticks].reverse().map((tick) => (
          <Text key={tick.label} style={{ color: colors.muted, fontSize: 10 }}>
            {tick.label}
          </Text>
        ))}
      </View>
      <View style={{ position: "absolute", left: padL, right: 8, bottom: 0, height: padB, flexDirection: "row", justifyContent: "space-between" }}>
        {data.map((row, index) =>
          index % labelEvery === 0 ? (
            <Text key={row.day} style={{ color: colors.muted, fontSize: 10 }}>
              {row.day}
            </Text>
          ) : (
            <Text key={row.day} style={{ fontSize: 10 }}>
              {""}
            </Text>
          ),
        )}
      </View>
      {width > 0 &&
        points.map((point, index) => (
          <Pressable
            key={point.row.day}
            onPress={() => setActive(index === active ? null : index)}
            style={{ position: "absolute", left: point.x - step / 2, top: 0, width: Math.max(step, 16), height: innerH + padT }}
          />
        ))}
      {active != null && points[active] && (
        <View
          style={{
            position: "absolute",
            top: 8,
            left: Math.min(Math.max(points[active].x - 48, 8), Math.max(width - 112, 8)),
            backgroundColor: colors.purple,
            borderRadius: 16,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>{points[active].row.day} তারিখ</Text>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
            {points[active].row.closed ? "রান্না বন্ধ" : `${mealText(points[active].row.meals)} মিল`}
          </Text>
        </View>
      )}
    </View>
  );
}

export function SlotDonut({ b, l, d }: { b: number; l: number; d: number }) {
  const parts = [
    { key: "সকাল", value: b, color: "#7DDEBE" },
    { key: "দুপুর", value: l, color: "#6C4DFF" },
    { key: "রাত", value: d, color: "#F0C14A" },
  ];
  const sum = parts.reduce((total, part) => total + part.value, 0);
  const total = sum || 1;
  const radius = 46;
  const circ = 2 * Math.PI * radius;
  let cursor = 0;
  const shown = Number.isInteger(sum) ? String(sum) : sum.toFixed(1);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
      <View style={{ width: 120, height: 120 }}>
        <Svg width={120} height={120} viewBox="0 0 120 120">
          <Circle cx={60} cy={60} r={radius} fill="none" stroke="#F4F0FF" strokeWidth={14} />
          {parts.map((part) => {
            const length = (part.value / total) * circ;
            const node = (
              <Circle
                key={part.key}
                cx={60}
                cy={60}
                r={radius}
                fill="none"
                stroke={part.color}
                strokeWidth={14}
                strokeDasharray={`${length} ${circ - length}`}
                strokeDashoffset={-cursor}
                transform="rotate(-90 60 60)"
              />
            );
            cursor += length;
            return node;
          })}
        </Svg>
        <View style={{ position: "absolute", left: 0, right: 0, top: 42, alignItems: "center" }}>
          <Text style={{ color: colors.muted, fontSize: 11 }}>মিল</Text>
          <Text style={{ color: colors.ink, fontSize: 16, fontWeight: "700" }}>{shown}</Text>
        </View>
      </View>
      <View style={{ gap: 8 }}>
        {parts.map((part) => (
          <View key={part.key} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: part.color }} />
            <Text style={{ color: colors.muted, fontSize: 14 }}>{part.key}</Text>
            <Text style={{ fontWeight: "700", fontSize: 14 }}>{Number.isInteger(part.value) ? part.value : part.value.toFixed(1)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
