import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { theme } from "@/components/UI";

export type DonutSegment = {
  value: number;
  color: string;
  label?: string;
};

export function DonutChart({
  size = 160,
  thickness = 20,
  segments,
  centerLabel,
  centerValue,
}: {
  size?: number;
  thickness?: number;
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: string | number;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((acc, s) => acc + Math.max(0, s.value), 0);
  const cx = size / 2;
  const cy = size / 2;

  let offsetAcc = 0;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={cx} originY={cy}>
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={theme.muted}
            strokeWidth={thickness}
            fill="none"
          />
          {total > 0
            ? segments.map((seg, idx) => {
                const v = Math.max(0, seg.value);
                const len = (v / total) * circumference;
                const dasharray = `${len} ${circumference - len}`;
                const dashoffset = -offsetAcc;
                offsetAcc += len;
                return (
                  <Circle
                    key={idx}
                    cx={cx}
                    cy={cy}
                    r={radius}
                    stroke={seg.color}
                    strokeWidth={thickness}
                    fill="none"
                    strokeLinecap="butt"
                    strokeDasharray={dasharray}
                    strokeDashoffset={dashoffset}
                  />
                );
              })
            : null}
        </G>
      </Svg>
      <View style={{ position: "absolute", alignItems: "center", justifyContent: "center" }}>
        {centerValue !== undefined ? (
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 24, color: theme.foreground }}>
            {centerValue}
          </Text>
        ) : null}
        {centerLabel ? (
          <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: theme.mutedForeground, marginTop: 2 }}>
            {centerLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
