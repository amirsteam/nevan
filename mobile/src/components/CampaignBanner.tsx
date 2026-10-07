/**
 * Home-screen banner for the live festival/event campaign: the admin's
 * uploaded mobile banner, or a card built from the campaign's palette.
 */
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { ArrowRight, Clock } from "lucide-react-native";
import type { IPublicCampaign } from "@shared/types";
import { radius } from "../theme";

/** "2d 4h left" / "5h 12m left" / "Ending soon" */
export const timeLeft = (endsAt: string, now: number = Date.now()): string => {
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return "Ended";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return "Ending soon";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return days > 0 ? `${days}d ${hours}h left` : `${hours}h ${minutes % 60}m left`;
};

/** "15% off Rompers & Jhablas" (same wording as the website) */
export const saleText = (campaign: IPublicCampaign): string | null => {
  const { label, scope, categories } = campaign.sale;
  if (!label) return null;
  if (scope === "categories" && categories.length) {
    const names = categories.map((c) => c.name);
    return `${label} ${names.length > 2 ? `${names.slice(0, 2).join(", ")} and more` : names.join(" & ")}`;
  }
  return scope === "products" ? `${label} selected items` : `${label} everything`;
};

interface CampaignBannerProps {
  campaign: IPublicCampaign;
  onPress: () => void;
}

const CampaignBanner: React.FC<CampaignBannerProps> = ({ campaign, onPress }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const { theme } = campaign;
  const offer = saleText(campaign);
  const banner = campaign.bannerMobile || campaign.bannerDesktop;
  const label = [campaign.headline, offer, timeLeft(campaign.endsAt, now)].filter(Boolean).join(", ");

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.bg }]}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${campaign.ctaLabel || "Shop the sale"}`}
    >
      {banner ? (
        <Image source={{ uri: banner }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.content}>
          <View style={[styles.glow, { backgroundColor: theme.highlight }]} />
          {!!campaign.emoji && <Text style={styles.emoji}>{campaign.emoji}</Text>}
          {!!campaign.greeting && <Text style={[styles.greeting, { color: theme.text }]}>{campaign.greeting}</Text>}
          <Text style={[styles.headline, { color: theme.text }]}>{campaign.headline}</Text>
          {!!offer && (
            <View style={[styles.offer, { backgroundColor: theme.accent }]}>
              <Text style={[styles.offerText, { color: theme.onAccent }]}>{offer}</Text>
            </View>
          )}
          <View style={styles.footer}>
            <View style={[styles.cta, { backgroundColor: theme.accent }]}>
              <Text style={[styles.ctaText, { color: theme.onAccent }]}>{campaign.ctaLabel || "Shop the sale"}</Text>
              <ArrowRight size={16} color={theme.onAccent} />
            </View>
            <View style={styles.timer}>
              <Clock size={14} color={theme.text} />
              <Text style={[styles.timerText, { color: theme.text }]}>{timeLeft(campaign.endsAt, now)}</Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 20, borderRadius: radius.lg, overflow: "hidden" },
  image: { width: "100%", aspectRatio: 9 / 11 },
  content: { padding: 20, alignItems: "center", overflow: "hidden" },
  glow: { position: "absolute", top: -60, left: -60, width: 180, height: 180, borderRadius: 90, opacity: 0.25 },
  emoji: { fontSize: 40, marginBottom: 4 },
  greeting: { fontSize: 14, fontWeight: "500", opacity: 0.9, marginBottom: 2, textAlign: "center" },
  headline: { fontSize: 26, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  offer: { borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 14 },
  offerText: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  footer: { flexDirection: "row", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "center" },
  cta: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 10 },
  ctaText: { fontWeight: "700", fontSize: 15 },
  timer: { flexDirection: "row", alignItems: "center", gap: 4 },
  timerText: { fontSize: 13, fontWeight: "600" },
});

export default CampaignBanner;
