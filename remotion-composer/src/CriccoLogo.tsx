import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont();

// ---------------------------------------------------------------------------
// Cricco — animated logo reveals for the 3 concepts in
// cricco/docs/design/logo/preview.html. Geometry is copied 1:1 from the
// approved lockup (viewBox 0 0 220 64) so the held end-frame matches the
// static design exactly.
// ---------------------------------------------------------------------------

export type CriccoConcept = "A" | "B" | "C";

export interface CriccoLogoProps {
  concept?: CriccoConcept;
}

interface Palette {
  bg: string;
  bgGlow: string;
  ink: string;
  accent: string;
  muted: string;
}

const PALETTES: Record<CriccoConcept, Palette> = {
  A: {
    bg: "#15171B",
    bgGlow: "#1D2026",
    ink: "#F6F5F2",
    accent: "#FF5C1A",
    muted: "#9A9DA3",
  },
  B: {
    bg: "#131519",
    bgGlow: "#1B1E24",
    ink: "#F5F4F1",
    accent: "#FFB800",
    muted: "#9A9DA3",
  },
  C: {
    bg: "#14170D",
    bgGlow: "#1C2013",
    ink: "#F2F4EC",
    accent: "#A3E635",
    muted: "#9BA189",
  },
};

const TAGLINE = "L’app che solleva la tua officina.";

// Shared timeline (frames @ 30fps)
const WORDMARK_START = 62;
const LETTER_STAGGER = 5;
const LETTER_DRAW = 20;
const TAGLINE_START = 112;

// ---------------------------------------------------------------------------
// Stroke draw-on helper — pathLength={1} normalizes every path so dash math
// is independent of real path length.
// ---------------------------------------------------------------------------

const drawStyle = (progress: number) => ({
  strokeDasharray: 1,
  strokeDashoffset: 1 - progress,
  opacity: progress > 0.001 ? 1 : 0,
});

// ---------------------------------------------------------------------------
// Wordmark CRICCO — monoline paths from the approved lockup
// ---------------------------------------------------------------------------

const LETTERS: Array<{ tx: number; d?: string; circle?: boolean }> = [
  { tx: 0, d: "M29.08 9.54A14.75 14.75 0 1 0 29.08 26.46" },
  { tx: 40, d: "M3.5 32.5V3.5H13A7.5 7.5 0 0 1 13 18.5H3.5M12 18.5 23 32.5" },
  { tx: 74, d: "M3.5 3.5V32.5" },
  { tx: 88.5, d: "M29.08 9.54A14.75 14.75 0 1 0 29.08 26.46" },
  { tx: 128.5, d: "M29.08 9.54A14.75 14.75 0 1 0 29.08 26.46" },
  { tx: 168.5, circle: true },
];

const Wordmark: React.FC<{ ink: string; frame: number }> = ({ ink, frame }) => {
  return (
    <g
      transform="translate(62 19) scale(0.7222)"
      fill="none"
      stroke={ink}
      strokeWidth={7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {LETTERS.map((letter, i) => {
        const start = WORDMARK_START + i * LETTER_STAGGER;
        const progress = interpolate(frame, [start, start + LETTER_DRAW], [0, 1], {
          easing: Easing.out(Easing.cubic),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        if (letter.circle) {
          return (
            <circle
              key={i}
              transform={`translate(${letter.tx} 0) rotate(-90 17.5 18)`}
              cx={17.5}
              cy={18}
              r={14.75}
              pathLength={1}
              style={drawStyle(progress)}
            />
          );
        }
        return (
          <path
            key={i}
            transform={`translate(${letter.tx} 0)`}
            d={letter.d}
            pathLength={1}
            style={drawStyle(progress)}
          />
        );
      })}
    </g>
  );
};

// ---------------------------------------------------------------------------
// Concept A — "C-cric" monogram: the C draws on, the pantograph diamond
// drops into the mouth of the C and locks in with an impact ring.
// ---------------------------------------------------------------------------

const MarkA: React.FC<{ p: Palette; frame: number; fps: number }> = ({
  p,
  frame,
  fps,
}) => {
  const arcProgress = interpolate(frame, [8, 34], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const DROP_START = 32;
  const drop = spring({
    frame: frame - DROP_START,
    fps,
    config: { damping: 13, stiffness: 140, mass: 0.9 },
  });
  const dy = interpolate(drop, [0, 1], [-58, 0]);
  const rot = interpolate(drop, [0, 1], [-135, 0]);
  const diamondOpacity = interpolate(frame, [DROP_START, DROP_START + 3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const RING_START = DROP_START + 7;
  const ringR = interpolate(frame, [RING_START, RING_START + 14], [7, 21], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ringOpacity = interpolate(frame, [RING_START, RING_START + 14], [0.85, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ringWidth = interpolate(frame, [RING_START, RING_START + 14], [2.6, 0.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <g transform="translate(6 8) scale(0.75)">
      <path
        d="M48.55 19.07A21 21 0 1 0 48.55 44.93"
        fill="none"
        stroke={p.ink}
        strokeWidth={10}
        pathLength={1}
        style={drawStyle(arcProgress)}
      />
      <g
        transform={`translate(0 ${dy}) rotate(${rot} 47 32)`}
        style={{ opacity: diamondOpacity }}
      >
        <path d="M47 24 55 32 47 40 39 32Z" fill={p.accent} />
      </g>
      {frame >= RING_START && frame <= RING_START + 14 ? (
        <circle
          cx={47}
          cy={32}
          r={ringR}
          fill="none"
          stroke={p.accent}
          strokeWidth={ringWidth}
          style={{ opacity: ringOpacity }}
        />
      ) : null}
    </g>
  );
};

// ---------------------------------------------------------------------------
// Concept B — lift: the yellow two-post bracket draws on, the C rolls in at
// ground level, then gets jacked up in three mechanical pumps (the bracket
// takes the weight with a tiny squash on each pump).
// ---------------------------------------------------------------------------

const GROUND_DY = 4.85; // C resting on the bracket floor
const PUMPS = [58, 69, 80]; // frames where a pump stroke lands

const MarkB: React.FC<{ p: Palette; frame: number }> = ({ p, frame }) => {
  const bracketProgress = interpolate(frame, [8, 32], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // C rolls in from the left at ground level
  const rollX = interpolate(frame, [26, 42], [-36, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rollOpacity = interpolate(frame, [26, 31], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // suspension wobble when it stops
  const wobble =
    frame >= 42 ? 2.4 * Math.exp(-(frame - 42) / 6) * Math.sin((frame - 42) / 1.8) : 0;

  // Three pump strokes lift the C from the ground to its final position,
  // with a slight overshoot before settling.
  const liftDy = interpolate(
    frame,
    [52, PUMPS[0], PUMPS[0] + 4, PUMPS[1], PUMPS[1] + 4, PUMPS[2], PUMPS[2] + 5],
    [GROUND_DY, 3.3, 3.3, 1.7, 1.7, -0.6, 0],
    {
      easing: Easing.inOut(Easing.quad),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // bracket squash: gaussian impulse on each pump landing
  const squash = PUMPS.reduce(
    (acc, t) => acc + Math.exp(-(((frame - t) / 2.5) ** 2)),
    0,
  );
  const scaleY = 1 - 0.014 * squash;

  return (
    <g transform="translate(2 8) scale(0.75)">
      <g transform={`translate(0 ${51 * (1 - scaleY)}) scale(1 ${scaleY})`}>
        <path
          d="M7 25v26h50V25"
          fill="none"
          stroke={p.accent}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          style={drawStyle(bracketProgress)}
        />
      </g>
      <g
        transform={`translate(${rollX} ${liftDy}) rotate(${wobble} 29 26)`}
        style={{ opacity: rollOpacity }}
      >
        <path
          d="M42.34 17.32A13.5 13.5 0 1 0 42.34 34.68"
          fill="none"
          stroke={p.ink}
          strokeWidth={8.5}
          strokeLinecap="round"
        />
      </g>
    </g>
  );
};

// ---------------------------------------------------------------------------
// Concept C — app badge: the lime badge springs in, the solid C lands, then
// the diamond counterform gets punched out of the stroke (impact ring +
// badge shake). The lime diamond overlay is visually identical to the
// even-odd hole in the approved static mark.
// ---------------------------------------------------------------------------

const GLYPH_NO_HOLE =
  "M51.66 18.23A24 24 0 1 0 51.66 45.77L41.01 38.31A11 11 0 1 1 41.01 25.69Z";
const HOLE = "M14.5 27 19.5 32 14.5 37 9.5 32Z";
const PUNCH_START = 36;

const MarkC: React.FC<{ p: Palette; frame: number; fps: number }> = ({
  p,
  frame,
  fps,
}) => {
  const badgeSpring = spring({
    frame: frame - 8,
    fps,
    config: { damping: 14, stiffness: 150 },
  });
  const badgeScale = 0.55 + 0.45 * badgeSpring;
  const badgeRot = -10 + 10 * badgeSpring;
  const badgeOpacity = interpolate(frame, [8, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const glyphSpring = spring({
    frame: frame - 20,
    fps,
    config: { damping: 16, stiffness: 170 },
  });
  const glyphScale = 0.8 + 0.2 * glyphSpring;
  const glyphOpacity = interpolate(frame, [20, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const punch = interpolate(frame, [PUNCH_START, PUNCH_START + 6], [0, 1], {
    easing: Easing.in(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const punchScale = 2.6 - 1.6 * punch;

  const impact = frame - (PUNCH_START + 6);
  const shake = impact >= 0 ? 0.9 * Math.exp(-impact / 5) * Math.sin(impact * 1.4) : 0;

  const ringR = interpolate(impact, [0, 13], [4, 11], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ringOpacity = interpolate(impact, [0, 13], [0.7, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <g transform="translate(0 8) scale(0.75)">
      <g
        transform={`translate(${shake} 0) rotate(${badgeRot} 32 32) translate(${32 * (1 - badgeScale)} ${32 * (1 - badgeScale)}) scale(${badgeScale})`}
        style={{ opacity: badgeOpacity }}
      >
        <rect width={64} height={64} rx={14.4} fill={p.accent} />
        <g
          transform={`translate(${32 * (1 - glyphScale)} ${32 * (1 - glyphScale)}) scale(${glyphScale})`}
          style={{ opacity: glyphOpacity }}
        >
          <path d={GLYPH_NO_HOLE} fill="#171B10" />
        </g>
        {frame >= PUNCH_START ? (
          <g
            transform={`translate(${14.5 * (1 - punchScale)} ${32 * (1 - punchScale)}) scale(${punchScale})`}
          >
            <path d={HOLE} fill={p.accent} />
          </g>
        ) : null}
        {impact >= 0 && impact <= 13 ? (
          <path
            d={HOLE}
            fill="none"
            stroke="#171B10"
            strokeWidth={1.4}
            transform={`translate(${14.5 * (1 - ringR / 5)} ${32 * (1 - ringR / 5)}) scale(${ringR / 5})`}
            style={{ opacity: ringOpacity }}
          />
        ) : null}
      </g>
    </g>
  );
};

// ---------------------------------------------------------------------------
// Main composition
// ---------------------------------------------------------------------------

export const CriccoLogo: React.FC<CriccoLogoProps> = ({ concept = "A" }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const p = PALETTES[concept];

  const bgOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // slow push-in over the whole video for a bit of life
  const push = interpolate(frame, [0, durationInFrames], [1, 1.035]);

  const taglineOpacity = interpolate(frame, [TAGLINE_START, TAGLINE_START + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineY = interpolate(frame, [TAGLINE_START, TAGLINE_START + 14], [16, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1300px 800px at 50% 42%, ${p.bgGlow}, ${p.bg})`,
        opacity: bgOpacity,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 72,
          transform: `scale(${push})`,
        }}
      >
        <svg
          width={1360}
          viewBox="0 0 220 64"
          style={{ overflow: "visible", display: "block" }}
        >
          {concept === "A" ? <MarkA p={p} frame={frame} fps={fps} /> : null}
          {concept === "B" ? <MarkB p={p} frame={frame} /> : null}
          {concept === "C" ? <MarkC p={p} frame={frame} fps={fps} /> : null}
          <Wordmark ink={p.ink} frame={frame} />
        </svg>
        <div
          style={{
            fontFamily,
            fontSize: 46,
            fontWeight: 500,
            letterSpacing: "0.01em",
            color: p.muted,
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
          }}
        >
          {TAGLINE}
        </div>
      </div>
    </AbsoluteFill>
  );
};
