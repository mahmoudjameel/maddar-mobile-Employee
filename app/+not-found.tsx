import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useColors } from "@/hooks/useColors";
import { useIsRTL } from "@/lib/i18n-direction";
import { alignStart, writeDir } from "@/lib/layout";

export default function NotFoundScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const rtl = useIsRTL();

  return (
    <>
      <Stack.Screen options={{ title: t("notFound.title") }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text
          style={[
            styles.title,
            {
              color: colors.foreground,
              textAlign: alignStart(rtl),
              writingDirection: writeDir(rtl),
            },
          ]}
        >
          {t("notFound.message")}
        </Text>

        <Link href="/" style={styles.link}>
          <Text
            style={[
              styles.linkText,
              {
                color: colors.primary,
                textAlign: alignStart(rtl),
                writingDirection: writeDir(rtl),
              },
            ]}
          >
            {t("notFound.goHome")}
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
  },
});
