import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#1B1914",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 108,
            height: 108,
            borderRadius: 999,
            border: "12px solid #FF5C39",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
