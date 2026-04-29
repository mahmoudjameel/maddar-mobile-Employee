import React from "react";
import { Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { theme } from "@/components/UI";
import { useIsRTL } from "@/lib/i18n-direction";

export type BarDatum = {
  label: string;
  value: number;
};

export function BarChart({
  data,
  height = 160,
  barColor,
  valueFormatter,
  goalValue,
}: {
  data: BarDatum[];
  height?: number;
  barColor?: string;
  valueFormatter?: (v: number) => string;
  goalValue?: number;
}) {
  const rtl = useIsRTL();
  const color = barColor || theme.primary;
  const max = Math.max(1, ...data.map((d) => d.value), goalValue || 0);
  const chartH = height;
  const barAreaH = chartH - 36;
  const items = rtl ? [...data].reverse() : data;

  return (
    <View style={{ alignSelf: "stretch" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          height: chartH,
          gap: 8,
        }}
      >
        {items.map((d, i) => {
          const h = Math.max(2, (d.value / max) * barAreaH);
          return (
            <View key={i} style={{ flex: 1, alignItems: "center", gap: 6 }}>
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: "Inter_500Medium",
                  color: theme.mutedForeground,
                }}
                numberOfLines={1}
              >
                {valueFormatter ? valueFormatter(d.value) : d.value}
              </Text>
              <Svg width={"100%"} height={h}>
                <Rect x={0} y={0} width={"100%"} height={h} rx={6} ry={6} fill={color} opacity={d.value > 0 ? 1 : 0.2} />
              </Svg>
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Inter_500Medium",
                  color: theme.mutedForeground,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {d.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
