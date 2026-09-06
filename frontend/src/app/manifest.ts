import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FinTrack — Personal Finance Platform",
    short_name: "FinTrack",
    description: "Track your spending, manage budgets, reach your savings goals, and understand your financial habits.",
    start_url: "/",
    display: "standalone",
    background_color: "#090d16",
    theme_color: "#4f46e5",
    orientation: "portrait",
    categories: ["finance", "productivity", "utilities"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
