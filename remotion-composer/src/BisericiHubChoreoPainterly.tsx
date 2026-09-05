import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// ---------------------------------------------------------------------------
// BisericiHubChoreoPainterly — the choreographed intro rebuilt with the
// painterly (soft 3D clay) art. Layers cut from the generated scene:
//   bg.png        — empty starry sky + mist sea (reveal start frame)
//   bg-glow.png   — same scene with rock/church regions self-blurred into a
//                   soft light shaft ("the light gathers before they arrive")
//   layer-rock/church/cross.png — feathered cutouts of the full scene
// Acts: stars → light gathers → the monolith rises → the church appears →
// the cross drops with a bounce → the BisericiHub lockup fades in.
// 1080x1920 · 30fps · 168 frames (5.6s). Last frame == full painterly scene.
// ---------------------------------------------------------------------------

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const easeOut = Easing.out(Easing.cubic);
const easeInOut = Easing.inOut(Easing.cubic);

const SPARKS: Array<[number, number, number]> = [
  [180, 300, 0], [860, 240, 5], [340, 160, 9], [700, 420, 13], [140, 560, 17], [930, 520, 21],
];

export const BisericiHubChoreoPainterly: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Act II — the light gathers, the monolith rises
  const glowOp = interpolate(frame, [20, 52], [0, 1], { ...clamp, easing: easeInOut });
  const rockS = spring({ frame: frame - 24, fps, config: { damping: 16, stiffness: 60, mass: 1.1 } });
  const rockY = 520 * (1 - rockS);
  const rockOp = interpolate(frame, [24, 42], [0, 1], { ...clamp, easing: easeOut });

  // Act III — the church appears on the summit
  const churchOp = interpolate(frame, [58, 80], [0, 1], { ...clamp, easing: easeOut });
  const churchScale = interpolate(frame, [58, 84], [0.95, 1], { ...clamp, easing: easeOut });

  // Act IV — the cross drops and plants
  const crossS = spring({ frame: frame - 94, fps, config: { damping: 11, stiffness: 130, mass: 0.9 } });
  const crossY = -300 * (1 - crossS);
  const crossOp = interpolate(frame, [94, 100], [0, 1], clamp);

  // Act V — lockup
  const wmOp = interpolate(frame, [122, 142], [0, 1], { ...clamp, easing: easeInOut });
  const wmY = interpolate(frame, [122, 144], [16, 0], { ...clamp, easing: easeOut });
  const tgOp = interpolate(frame, [136, 158], [0, 1], { ...clamp, easing: easeInOut });
  const tgY = interpolate(frame, [136, 160], [12, 0], { ...clamp, easing: easeOut });

  const sparkEls = SPARKS.map(([x, y, d], i) => {
    const pop = interpolate(frame, [d, d + 12], [0, 1], { ...clamp, easing: easeOut });
    const tw = 0.5 + 0.5 * Math.sin((frame / 30) * 2 * Math.PI * (0.3 + (i % 3) * 0.1) + i * 2.1);
    return (
      <div key={i} style={{
        position: "absolute", left: x, top: y, width: 5, height: 5, borderRadius: 3,
        background: "#FFFFFF", opacity: 0.35 * pop * tw,
      }} />
    );
  });

  return (
    <AbsoluteFill style={{ background: "#0D1035" }}>
      <Img src={staticFile("bisericihub/bg.png")} style={{ position: "absolute", inset: 0, width: 1080, height: 1920 }} />
      <Img src={staticFile("bisericihub/bg-glow.png")} style={{ position: "absolute", inset: 0, width: 1080, height: 1920, opacity: glowOp }} />
      {sparkEls}

      <div style={{ position: "absolute", inset: 0, transform: `translateY(${rockY}px)`, opacity: rockOp }}>
        <Img src={staticFile("bisericihub/layer-rock.png")} style={{ position: "absolute", inset: 0, width: 1080, height: 1920 }} />
      </div>

      <div style={{
        position: "absolute", inset: 0, opacity: churchOp,
        transform: `scale(${churchScale})`, transformOrigin: "540px 800px",
      }}>
        <Img src={staticFile("bisericihub/layer-church.png")} style={{ position: "absolute", inset: 0, width: 1080, height: 1920 }} />
      </div>

      <div style={{ position: "absolute", inset: 0, transform: `translateY(${crossY}px)`, opacity: crossOp }}>
        <Img src={staticFile("bisericihub/layer-cross.png")} style={{ position: "absolute", inset: 0, width: 1080, height: 1920 }} />
      </div>

      {/* lockup */}
      <div style={{
        position: "absolute", top: 1676, left: 0, width: 1080, textAlign: "center",
        opacity: wmOp, transform: `translateY(${wmY}px)`,
        fontFamily: '-apple-system, "SF Pro Display", "Helvetica Neue", sans-serif',
        fontSize: 66, fontWeight: 600, letterSpacing: "0.02em",
        WebkitFontSmoothing: "antialiased",
      }}>
        <span style={{ color: "#E4DFF7" }}>Biserici</span>
        <span style={{ color: "#FF5F52" }}>Hub</span>
      </div>
      <div style={{
        position: "absolute", top: 1778, left: 0, width: 1080, textAlign: "center",
        opacity: 0.68 * tgOp, transform: `translateY(${tgY}px)`,
        fontFamily: '-apple-system, "SF Pro Display", "Helvetica Neue", sans-serif',
        fontSize: 27, fontWeight: 500, letterSpacing: "0.06em", color: "#CDC5EC",
        WebkitFontSmoothing: "antialiased",
      }}>
        Un singur loc pentru fiecare biserică
      </div>
    </AbsoluteFill>
  );
};
