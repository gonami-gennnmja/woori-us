import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#ffffff",
          color: "#1e1e1e",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          fontFamily: "serif",
          border: "1px solid #ececec",
        }}
      >
        <div style={{ fontSize: 54, letterSpacing: "0.2em" }}>iyyko | us</div>
        <div style={{ marginTop: 20, fontSize: 28, color: "#525252" }}>
          clean shared calendar for together moments
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
