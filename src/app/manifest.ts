import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cal",
    short_name: "Cal",
    description: "A quieter way to track what you eat.",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F0E6",
    theme_color: "#F4F0E6",
    orientation: "portrait",
  };
}
