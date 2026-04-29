import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { theme } from "@/components/UI";
import { useIsRTL } from "@/lib/i18n-direction";

export type FilterOption<T extends string> = { value: T; label: string };

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<FilterOption<T>>;
  value: T;
  onChange: (v: T) => void;
}) {
  const rtl = useIsRTL();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        flexDirection: rtl ? "row-reverse" : "row",
        gap: 8,
        paddingVertical: 2,
      }}
      style={{ alignSelf: "stretch" }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable key={opt.value} onPress={() => onChange(opt.value)}>
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? theme.primary : theme.border,
                backgroundColor: active ? theme.primary : theme.card,
              }}
            >
              <Text
                style={{
                  color: active ? theme.primaryForeground : theme.foreground,
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                }}
              >
                {opt.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
