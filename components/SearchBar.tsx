import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, TextInput, View } from "react-native";
import { theme } from "@/components/UI";
import { useIsRTL } from "@/lib/i18n-direction";
import { alignStart, writeDir } from "@/lib/layout";

export function SearchBar({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  const rtl = useIsRTL();
  return (
    <View
      style={{
        flexDirection: rtl ? "row-reverse" : "row",
        alignItems: "center",
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.input,
        borderRadius: 12,
        paddingHorizontal: 12,
        gap: 8,
        alignSelf: "stretch",
      }}
    >
      <Feather name="search" size={16} color={theme.mutedForeground} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.mutedForeground}
        style={{
          flex: 1,
          paddingVertical: 12,
          fontSize: 14,
          color: theme.foreground,
          fontFamily: "Inter_400Regular",
          textAlign: alignStart(rtl),
          writingDirection: writeDir(rtl),
        }}
      />
      {value ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={8}>
          <Feather name="x" size={16} color={theme.mutedForeground} />
        </Pressable>
      ) : null}
    </View>
  );
}
