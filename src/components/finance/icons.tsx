import { Briefcase, Laptop, ShoppingBasket, Utensils, Car, Home, Zap, ShoppingBag, HeartPulse, Gamepad2, BookOpen, PiggyBank, Shield, Plane, Gift, Coffee, GraduationCap, Baby, Dog, Shirt, Smartphone, Fuel, Wallet, Landmark, Target, Music, type LucideIcon } from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  briefcase: Briefcase, laptop: Laptop, "shopping-basket": ShoppingBasket, utensils: Utensils, car: Car, home: Home, zap: Zap,
  "shopping-bag": ShoppingBag, "heart-pulse": HeartPulse, gamepad: Gamepad2, book: BookOpen, "piggy-bank": PiggyBank, shield: Shield,
  plane: Plane, gift: Gift, coffee: Coffee, graduation: GraduationCap, baby: Baby, pet: Dog, shirt: Shirt, phone: Smartphone,
  fuel: Fuel, wallet: Wallet, bank: Landmark, target: Target, music: Music,
};

export function CatIcon({ name, color, size = "md" }: { name: string; color: string; size?: "sm" | "md" | "lg" }) {
  const Icon = ICONS[name] ?? Wallet;
  const dim = size === "sm" ? "size-7 rounded-lg" : size === "lg" ? "size-11 rounded-2xl" : "size-9 rounded-xl";
  return (
    <span className={`grid shrink-0 place-items-center ${dim}`} style={{ background: `color-mix(in oklch, ${color} 16%, transparent)`, color }}>
      <Icon className={size === "lg" ? "size-5" : size === "sm" ? "size-3.5" : "size-4"} />
    </span>
  );
}

export const SWATCHES = ["#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#64748b"];
