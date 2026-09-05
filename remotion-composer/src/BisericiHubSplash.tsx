import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// ---------------------------------------------------------------------------
// BisericiHubSplash — choreographed launch animation for BisericiHub.
// Scene "Summit": rock monolith rises from a sea of night mist, the candlelit
// church materializes on top, windows ignite one by one, the crimson cross
// drops and plants with a bounce, the BisericiHub lockup fades in.
// 1080x1920 · 30fps · 165 frames (5.5s). Ends on the static splash design.
// ---------------------------------------------------------------------------

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const easeOut = Easing.out(Easing.cubic);
const easeInOut = Easing.inOut(Easing.cubic);

const STARS: Array<[number, number, number, number, number]> = [
  // cx, cy, r, baseOpacity, popDelay(frames)
  [140, 260, 4, 0.35, 2], [248, 168, 3, 0.25, 6], [352, 118, 2.5, 0.18, 10],
  [540, 86, 3, 0.22, 4], [726, 128, 2.5, 0.18, 12], [838, 188, 3, 0.24, 8],
  [948, 288, 4, 0.32, 3], [96, 452, 3, 0.2, 14], [982, 472, 3, 0.2, 9],
  [204, 560, 2.5, 0.16, 16], [874, 596, 2.5, 0.16, 11], [430, 238, 2, 0.14, 18],
  [662, 300, 2, 0.14, 7], [308, 392, 2, 0.13, 15], [770, 420, 2, 0.13, 5],
  [118, 720, 2.5, 0.14, 13], [962, 760, 2.5, 0.14, 17], [180, 900, 2, 0.11, 19],
  [920, 940, 2, 0.11, 20],
];

export const BisericiHubSplash: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- act I: stars pop in, then twinkle forever -------------------------
  const starEls = STARS.map(([cx, cy, r, base, delay], i) => {
    const pop = interpolate(frame, [delay, delay + 14], [0, 1], { ...clamp, easing: easeOut });
    const twinkle = 0.35 * Math.sin((frame / 30) * 2 * Math.PI * (0.35 + (i % 5) * 0.09) + i * 1.7);
    return (
      <circle key={i} cx={cx} cy={cy} r={r} fill="#FFFFFF"
        opacity={Math.max(0, pop * base * (1 + twinkle))} />
    );
  });

  // --- act II: fog sea slides up, monolith rises out of it ---------------
  const fogY = interpolate(frame, [8, 44], [150, 0], { ...clamp, easing: easeOut });
  const fogOp = interpolate(frame, [8, 36], [0, 1], { ...clamp, easing: easeOut });
  const rockS = spring({ frame: frame - 16, fps, config: { damping: 16, stiffness: 60, mass: 1.1 } });
  const rockY = 340 * (1 - rockS);
  const rockOp = interpolate(frame, [14, 30], [0, 1], { ...clamp, easing: easeOut });
  const wispDriftA = 22 * Math.sin((frame / 30) * 2 * Math.PI * 0.10);
  const wispDriftB = 26 * Math.sin((frame / 30) * 2 * Math.PI * 0.08 + 2.1);

  // --- act III: church materializes, windows ignite ----------------------
  const churchOp = interpolate(frame, [46, 66], [0, 1], { ...clamp, easing: easeOut });
  const churchScale = interpolate(frame, [46, 72], [0.94, 1], { ...clamp, easing: easeOut });
  const ignite = (at: number) =>
    interpolate(frame, [at, at + 9], [0, 1], { ...clamp, easing: easeOut });
  const doorLit = ignite(64);
  const naveLLit = ignite(72);
  const naveRLit = ignite(76);
  const roseLit = ignite(84);
  const breathe = 1 + 0.05 * Math.sin((frame / 30) * 2 * Math.PI * 0.45);
  const haloOp = interpolate(frame, [80, 104], [0, 1], { ...clamp, easing: easeInOut }) * breathe;

  // --- act IV: the cross drops and plants with a bounce ------------------
  const crossS = spring({ frame: frame - 92, fps, config: { damping: 11, stiffness: 130, mass: 0.9 } });
  const crossY = -300 * (1 - crossS);
  const crossOp = interpolate(frame, [92, 98], [0, 1], clamp);

  // --- act V: wordmark spreads in ---------------------------------------
  const wmOp = interpolate(frame, [116, 138], [0, 1], { ...clamp, easing: easeInOut });
  const wmY = interpolate(frame, [116, 140], [16, 0], { ...clamp, easing: easeOut });
  const tgOp = interpolate(frame, [134, 156], [0, 1], { ...clamp, easing: easeInOut });
  const tgY = interpolate(frame, [134, 158], [12, 0], { ...clamp, easing: easeOut });

  return (
    <AbsoluteFill style={{ background: "#1D1848" }}>
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="bg" cx="50%" cy="36%" r="85%">
            <stop offset="0%" stopColor="#4A3EA3" />
            <stop offset="55%" stopColor="#332A6E" />
            <stop offset="100%" stopColor="#1B1642" />
          </radialGradient>
          <linearGradient id="bgBottom" x1="0" y1="0" x2="0" y2="1">
            <stop offset="70%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#0E0B2E" stopOpacity="0.5" />
          </linearGradient>
          <radialGradient id="halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.13" />
            <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="warmHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFC894" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#FFC894" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="towerBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E0DAF7" />
          </linearGradient>
          <linearGradient id="roof" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F7F4FF" />
            <stop offset="100%" stopColor="#D8D0F3" />
          </linearGradient>
          <linearGradient id="nave" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F2EEFF" />
            <stop offset="100%" stopColor="#CEC6EE" />
          </linearGradient>
          <linearGradient id="cross" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6A55" />
            <stop offset="100%" stopColor="#E8283F" />
          </linearGradient>
          <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFEFD0" />
            <stop offset="100%" stopColor="#FFB27E" />
          </linearGradient>
          <linearGradient id="door" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE8C2" />
            <stop offset="100%" stopColor="#FF9E70" />
          </linearGradient>
          <radialGradient id="windowGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFC894" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FFC894" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="rockBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7C6FC4" />
            <stop offset="40%" stopColor="#4A3D8F" />
            <stop offset="82%" stopColor="#2E2668" />
            <stop offset="100%" stopColor="#282158" />
          </linearGradient>
          <linearGradient id="rockTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CDC5EE" />
            <stop offset="100%" stopColor="#8D81CD" />
          </linearGradient>
          <filter id="soft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
          <filter id="mist" x="-60%" y="-160%" width="220%" height="420%">
            <feGaussianBlur stdDeviation="30" />
          </filter>
        </defs>

        <rect width="1080" height="1920" fill="url(#bg)" />
        <g>{starEls}</g>

        {/* halos bloom with the rose window */}
        <circle cx="540" cy="830" r="430" fill="url(#halo)" opacity={haloOp} />
        <circle cx="540" cy="872" r="255" fill="url(#warmHalo)" opacity={haloOp} />

        {/* rock pillar rising */}
        <g transform={`translate(0 ${rockY})`} opacity={rockOp} strokeLinejoin="round">
          <path d="M330 1048 L416 1072 L540 1078 L672 1070 L750 1048 L778 1150 L736 1360 L360 1360 L312 1170 Z"
            fill="url(#rockBody)" stroke="url(#rockBody)" strokeWidth="10" />
          <path d="M330 1048 L430 1028 L540 1038 L668 1026 L750 1048 L672 1070 L540 1078 L416 1072 Z"
            fill="url(#rockTop)" stroke="url(#rockTop)" strokeWidth="8" />
          <path d="M312 1170 L330 1048 L416 1072 L362 1290 Z" fill="#8B7FD0" opacity="0.3" />
          <path d="M672 1070 L750 1048 L778 1150 L730 1300 Z" fill="#1D1748" opacity="0.45" />
        </g>

        {/* church on the summit (rides the rock while it rises) */}
        <g transform={`translate(0 ${rockY})`} opacity={churchOp}>
          <ellipse cx="540" cy="1062" rx="72" ry="12" fill="#FFC894" opacity={0.32 * doorLit} filter="url(#soft)" />
          <g transform={`translate(540 1060) scale(${churchScale}) translate(-540 -1060)`}>
            <g transform="translate(130.4, 428) scale(0.8)">
              <g strokeLinejoin="round">
                <path d="M432 565 L287 612 L287 790 L432 790 Z" fill="url(#nave)" stroke="url(#nave)" strokeWidth="14" />
                <path d="M592 565 L737 612 L737 790 L592 790 Z" fill="url(#nave)" stroke="url(#nave)" strokeWidth="14" />
              </g>
              {/* windows: dark glass first, warm light ignites over it */}
              <circle cx="359" cy="700" r="42" fill="url(#windowGlow)" opacity={naveLLit} />
              <circle cx="665" cy="700" r="42" fill="url(#windowGlow)" opacity={naveRLit} />
              <path d="M336 740 L336 678 A23 23 0 0 1 382 678 L382 740 Z" fill="#3A2F6E" />
              <path d="M642 740 L642 678 A23 23 0 0 1 688 678 L688 740 Z" fill="#3A2F6E" />
              <path d="M336 740 L336 678 A23 23 0 0 1 382 678 L382 740 Z" fill="url(#glow)" opacity={0.92 * naveLLit} />
              <path d="M642 740 L642 678 A23 23 0 0 1 688 678 L688 740 Z" fill="url(#glow)" opacity={0.92 * naveRLit} />

              <rect x="432" y="455" width="160" height="335" fill="url(#towerBody)" />
              <path d="M512 318 L616 474 L408 474 Z" fill="url(#roof)" stroke="url(#roof)" strokeWidth="16" strokeLinejoin="round" />

              <circle cx="512" cy="548" r="72" fill="url(#windowGlow)" opacity={roseLit} />
              <circle cx="512" cy="548" r="46" fill="none" stroke="#FFFFFF" strokeWidth="6" opacity="0.95" />
              <circle cx="512" cy="548" r="33" fill="#3A2F6E" />
              <circle cx="512" cy="548" r="33" fill="url(#glow)" opacity={roseLit} />

              <path d="M470 790 L470 702 A42 42 0 0 1 554 702 L554 790 Z" fill="#3A2F6E" />
              <path d="M470 790 L470 702 A42 42 0 0 1 554 702 L554 790 Z" fill="url(#door)" opacity={doorLit} />

              {/* the cross drops in */}
              <g fill="url(#cross)" opacity={crossOp} transform={`translate(0 ${crossY})`}>
                <rect x="492" y="170" width="40" height="160" rx="20" />
                <rect x="446" y="204" width="132" height="40" rx="20" />
              </g>
            </g>
          </g>
        </g>

        {/* mist wisps + fog sea (over the rock) */}
        <g transform={`translate(0 ${fogY})`} opacity={fogOp}>
          <ellipse cx={450 + wispDriftA} cy="1180" rx="300" ry="30" fill="#FFFFFF" opacity="0.11" filter="url(#mist)" />
          <ellipse cx={660 + wispDriftB} cy="1280" rx="320" ry="34" fill="#FFFFFF" opacity="0.09" filter="url(#mist)" />
          <ellipse cx={400 - wispDriftB} cy="1330" rx="330" ry="46" fill="#8B7FD0" opacity="0.16" filter="url(#mist)" />
          <ellipse cx={700 + wispDriftA} cy="1360" rx="360" ry="52" fill="#FFFFFF" opacity="0.09" filter="url(#mist)" />
          <ellipse cx="540" cy="1420" rx="660" ry="90" fill="#221B52" opacity="0.95" filter="url(#mist)" />
          <ellipse cx="540" cy="1560" rx="760" ry="140" fill="#1B1642" opacity="1" filter="url(#mist)" />
        </g>

        <rect width="1080" height="1920" fill="url(#bgBottom)" />
      </svg>

      {/* wordmark lockup */}
      <div
        style={{
          position: "absolute",
          top: 1676,
          left: 0,
          width: 1080,
          textAlign: "center",
          opacity: wmOp,
          transform: `translateY(${wmY}px)`,
          fontFamily: '-apple-system, "SF Pro Display", "Helvetica Neue", sans-serif',
          fontSize: 66,
          fontWeight: 600,
          letterSpacing: "0.02em",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <span style={{ color: "#E4DFF7" }}>Biserici</span>
        <span style={{ color: "#FF5F52" }}>Hub</span>
      </div>
      <div
        style={{
          position: "absolute",
          top: 1778,
          left: 0,
          width: 1080,
          textAlign: "center",
          opacity: 0.68 * tgOp,
          transform: `translateY(${tgY}px)`,
          fontFamily: '-apple-system, "SF Pro Display", "Helvetica Neue", sans-serif',
          fontSize: 27,
          fontWeight: 500,
          letterSpacing: "0.06em",
          color: "#CDC5EC",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        Un singur loc pentru fiecare biserică
      </div>
    </AbsoluteFill>
  );
};

// Static lockup on transparent background — for RGBA overlay stills (ffmpeg).
export const BisericiHubWordmark: React.FC = () => (
  <AbsoluteFill style={{ background: "transparent" }}>
    <div
      style={{
        position: "absolute", top: 1676, left: 0, width: 1080, textAlign: "center",
        fontFamily: '-apple-system, "SF Pro Display", "Helvetica Neue", sans-serif',
        fontSize: 66, fontWeight: 600, letterSpacing: "0.02em",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <span style={{ color: "#E4DFF7" }}>Biserici</span>
      <span style={{ color: "#FF5F52" }}>Hub</span>
    </div>
    <div
      style={{
        position: "absolute", top: 1778, left: 0, width: 1080, textAlign: "center",
        opacity: 0.68,
        fontFamily: '-apple-system, "SF Pro Display", "Helvetica Neue", sans-serif',
        fontSize: 27, fontWeight: 500, letterSpacing: "0.06em", color: "#CDC5EC",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      Un singur loc pentru fiecare biserică
    </div>
  </AbsoluteFill>
);
