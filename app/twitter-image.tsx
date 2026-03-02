import { ImageResponse } from "next/og";
import icon from "./icon.png";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#000",
          color: "#fff",
          fontWeight: 600
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            padding: "24px 40px",
            borderRadius: 32,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(12,12,12,0.88)"
          }}
        >
          <img
            src={icon.src}
            alt="PromDevs icon"
            width={112}
            height={112}
            style={{ borderRadius: 22 }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 88,
              letterSpacing: "-0.04em",
              lineHeight: 1
            }}
          >
            <span style={{ color: "#fff" }}>prom</span>
            <span style={{ color: "#2563eb" }}>devs</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size
    }
  );
}
