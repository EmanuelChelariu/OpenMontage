import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// ---------------------------------------------------------------------------
// EmanuelSplash — animated launch screens for the emanuel native app.
// Round 3 logos: H "scara" (stairway to the portal) and I "biserica"
// (monoline church). Three animation concepts per logo. 1080x1920, 3.2s.
// Last frame always equals the static logo for a seamless hand-off.
// ---------------------------------------------------------------------------

export type EmanuelSplashProps = {
  concept:
    | "h-ascent"
    | "h-fan"
    | "h-light"
    | "i-draw"
    | "i-rise"
    | "i-alive";
};

const LOGO_SIZE = 560;
const CRIMSON = "#F53844";
const WARM = "#FFD9A0";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const easeInOut = Easing.inOut(Easing.cubic);
const easeOut = Easing.out(Easing.cubic);

// --- H geometry (icon.svg, group translate(0,-20) baked into the group) ----

type TreadDef = { xi: number; yi: number; xo: number; yo: number; w: number };
// left flight, inner->outer; right flight is mirrored (x -> 1024 - x)
const TREADS: TreadDef[] = [
  { xi: 424, yi: 542, xo: 266, yo: 562, w: 48 }, // top
  { xi: 408, yi: 628, xo: 222, yo: 656, w: 52 }, // mid
  { xi: 388, yi: 716, xo: 176, yo: 752, w: 56 }, // bottom
];
const H_ARCH = "M404 544 L404 420 A108 108 0 0 1 620 420 L620 544";

// --- I geometry (icon.svg) -------------------------------------------------

const I_TOWER = "M430 752 L430 460 L512 348 L594 460 L594 752";
const I_NAVE_L = "M430 528 L330 560 L330 752";
const I_NAVE_R = "M594 528 L694 560 L694 752";
const I_BASE = "M330 752 L694 752";
const I_TOWER_LEN = 880;
const I_NAVE_LEN = 310;
const I_BASE_LEN = 370;
const I_SPIRE = "430,460 512,348 594,460";
const I_DOOR = "M474 752 L474 696 A38 38 0 0 1 550 696 L550 752 Z";
const I_WIN_L = "M362 752 L362 700 A24 24 0 0 1 410 700 L410 752 Z";
const I_WIN_R = "M614 752 L614 700 A24 24 0 0 1 662 700 L662 752 Z";

const popAt = (
  frame: number,
  fps: number,
  start: number
): { scale: number; opacity: number } => {
  const s = spring({ frame: frame - start, fps, config: { damping: 13, stiffness: 140, mass: 0.8 } });
  return {
    scale: frame < start ? 0 : 0.6 + 0.4 * s,
    opacity: interpolate(frame, [start, start + 6], [0, 1], clamp),
  };
};

const Pop: React.FC<{
  cx: number;
  cy: number;
  start: number;
  children: React.ReactNode;
}> = ({ cx, cy, start, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = popAt(frame, fps, start);
  return (
    <g
      transform={`translate(${cx} ${cy}) scale(${p.scale}) translate(${-cx} ${-cy})`}
      opacity={p.opacity}
    >
      {children}
    </g>
  );
};

// --------------------------------------------------------------------------
// H — stairway logo
// --------------------------------------------------------------------------

const Tread: React.FC<{
  def: TreadDef;
  side: "left" | "right";
  opacity: number;
  dy: number;
  rot: number; // degrees about the inner end
}> = ({ def, side, opacity, dy, rot }) => {
  const m = (x: number): number => (side === "left" ? x : 1024 - x);
  const sign = side === "left" ? 1 : -1;
  return (
    <path
      d={`M${m(def.xo)} ${def.yo} L${m(def.xi)} ${def.yi}`}
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={def.w}
      strokeLinecap="round"
      opacity={opacity}
      transform={`translate(0 ${dy}) rotate(${sign * rot} ${m(def.xi)} ${def.yi})`}
    />
  );
};

const HLogo: React.FC<{ concept: "h-ascent" | "h-fan" | "h-light" }> = ({ concept }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // per tread-pair [top, mid, bottom]: opacity, dy, rot
  const treadStarts =
    concept === "h-ascent" ? [24, 14, 4] : concept === "h-fan" ? [26, 34, 42] : [22, 32, 42];

  const treads = TREADS.map((def, i) => {
    const start = treadStarts[i] ?? 0;
    if (concept === "h-ascent") {
      const s = spring({ frame: frame - start, fps, config: { damping: 13, stiffness: 120, mass: 1 } });
      return {
        opacity: interpolate(frame, [start, start + 8], [0, 1], clamp),
        dy: frame < start ? 70 : 70 * (1 - s),
        rot: 0,
      };
    }
    if (concept === "h-fan") {
      const s = spring({ frame: frame - start, fps, config: { damping: 14, stiffness: 110, mass: 1 } });
      return {
        opacity: interpolate(frame, [start, start + 5], [0, 1], clamp),
        dy: 0,
        rot: frame < start ? 70 : 70 * (1 - s),
      };
    }
    // h-light: pure luminance, no movement
    return {
      opacity: interpolate(frame, [start, start + 12], [0, 1], { ...clamp, easing: easeInOut }),
      dy: 0,
      rot: 0,
    };
  });

  const archStart = concept === "h-ascent" ? 34 : concept === "h-fan" ? 2 : 0;
  const archSpring = spring({ frame: frame - archStart, fps, config: { damping: 14, stiffness: 120, mass: 1 } });
  const archScale = concept === "h-light" ? 1 : frame < archStart ? 0 : 0.7 + 0.3 * archSpring;
  const archOpacity = interpolate(frame, [archStart, archStart + 10], [0, 1], clamp);

  const crossStart = concept === "h-ascent" ? 50 : concept === "h-fan" ? 16 : 8;
  const crossOpacity = interpolate(frame, [crossStart, crossStart + 10], [0, 1], clamp);
  const crossDy =
    concept === "h-ascent"
      ? interpolate(frame, [crossStart, crossStart + 14], [-40, 0], { ...clamp, easing: easeOut })
      : 0;

  const glow =
    concept === "h-light"
      ? interpolate(frame, [4, 14, 60, 92], [0, 0.5, 0.22, 0], clamp)
      : interpolate(frame, [58, 70, 92], [0, 0.4, 0], clamp);

  const beam =
    concept === "h-light" ? interpolate(frame, [16, 28, 66, 88], [0, 0.16, 0.13, 0], clamp) : 0;

  return (
    <>
      {/* glow halo behind portal + cross */}
      <svg
        viewBox="0 0 1024 1024"
        style={{ position: "absolute", inset: 0, filter: "blur(46px)", opacity: glow }}
      >
        <g transform="translate(0,-20)">
          <path d={H_ARCH} fill="none" stroke="#FFFFFF" strokeWidth={60} />
          <rect x={480} y={330} width={64} height={150} fill={CRIMSON} />
        </g>
      </svg>
      <svg viewBox="0 0 1024 1024" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="beamGrad" gradientUnits="userSpaceOnUse" x1="0" y1="524" x2="0" y2="792">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <g transform="translate(0,-20)">
          {beam > 0 && (
            <polygon points="452,544 572,544 640,792 384,792" fill="url(#beamGrad)" opacity={beam} />
          )}
          {treads.map((t, i) => {
            const def = TREADS[i];
            if (!def) return null;
            return (
              <React.Fragment key={i}>
                <Tread def={def} side="left" opacity={t.opacity} dy={t.dy} rot={t.rot} />
                <Tread def={def} side="right" opacity={t.opacity} dy={t.dy} rot={t.rot} />
              </React.Fragment>
            );
          })}
          <g
            transform={`translate(512 482) scale(${archScale}) translate(-512 -482)`}
            opacity={archOpacity}
          >
            <path d={H_ARCH} fill="none" stroke="#FFFFFF" strokeWidth={40} strokeLinecap="round" />
          </g>
          <g opacity={crossOpacity} transform={`translate(0 ${crossDy})`}>
            <rect x={494} y={346} width={36} height={116} fill={CRIMSON} />
            <rect x={462} y={380} width={100} height={36} fill={CRIMSON} />
          </g>
        </g>
      </svg>
    </>
  );
};

// --------------------------------------------------------------------------
// I — church logo
// --------------------------------------------------------------------------

const DrawPath: React.FC<{
  d: string;
  len: number;
  progress: number;
  width: number;
}> = ({ d, len, progress, width }) => (
  <path
    d={d}
    fill="none"
    stroke="#FFFFFF"
    strokeWidth={width}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeDasharray={len}
    strokeDashoffset={len * (1 - progress)}
    opacity={progress > 0 ? 1 : 0}
  />
);

const ILogo: React.FC<{ concept: "i-draw" | "i-rise" | "i-alive" }> = ({ concept }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const drawP = (start: number, end: number): number =>
    concept === "i-draw"
      ? interpolate(frame, [start, end], [0, 1], { ...clamp, easing: easeInOut })
      : 1;

  const towerP = drawP(2, 32);
  const naveP = drawP(12, 38);
  const baseP = drawP(22, 42);

  // i-rise: whole building springs up from the ground
  const riseSpring = spring({ frame, fps, config: { damping: 15, stiffness: 90, mass: 1 } });
  const buildingDy = concept === "i-rise" ? 130 * (1 - riseSpring) : 0;
  const buildingOpacity =
    concept === "i-rise"
      ? interpolate(frame, [0, 12], [0, 1], clamp)
      : concept === "i-alive"
        ? interpolate(frame, [0, 14], [0, 1], clamp)
        : 1;

  // detail pops
  const popStarts: Record<string, number> =
    concept === "i-draw"
      ? { door: 40, winL: 45, winR: 50, rosette: 55, spire: 48 }
      : concept === "i-rise"
        ? { door: 28, winL: 33, winR: 38, rosette: 43, spire: 30 }
        : { door: -10, winL: -10, winR: -10, rosette: -10, spire: -10 }; // i-alive: already there

  // cross
  const crossStart = concept === "i-draw" ? 60 : concept === "i-rise" ? 46 : -10;
  const crossSpring = spring({ frame: frame - crossStart, fps, config: { damping: 11, stiffness: 120, mass: 1 } });
  const crossDy = concept === "i-alive" ? 0 : frame < crossStart ? -90 : -90 * (1 - crossSpring);
  const crossOpacity =
    concept === "i-alive"
      ? buildingOpacity
      : interpolate(frame, [crossStart, crossStart + 6], [0, 1], clamp);

  const glow =
    concept === "i-alive"
      ? interpolate(frame, [48, 60, 88], [0, 0.3, 0], clamp)
      : interpolate(frame, [crossStart + 8, crossStart + 20, 92], [0, 0.35, 0], clamp);

  // i-alive: windows warm up one by one, then cool back to white
  const warmth = (start: number): number => {
    if (concept !== "i-alive") return 0;
    const up = interpolate(frame, [start, start + 12], [0, 1], { ...clamp, easing: easeInOut });
    const down = interpolate(frame, [64, 82], [1, 0], { ...clamp, easing: easeInOut });
    return up * down;
  };
  const warmDoor = warmth(20);
  const warmWinL = warmth(26);
  const warmWinR = warmth(32);
  const warmRose = warmth(38);
  const warmColor = (w: number): string =>
    interpolateColors(w, [0, 1], ["#FFFFFF", WARM]);
  const warmGlow = Math.max(warmDoor, warmWinL, warmWinR, warmRose);

  return (
    <>
      {/* glow: crimson cross halo + warm windows halo */}
      <svg
        viewBox="0 0 1024 1024"
        style={{ position: "absolute", inset: 0, filter: "blur(42px)" }}
      >
        <g opacity={glow}>
          <rect x={470} y={200} width={84} height={170} fill={CRIMSON} />
        </g>
        {concept === "i-alive" && (
          <g opacity={warmGlow * 0.55}>
            <rect x={340} y={660} width={344} height={110} fill={WARM} />
          </g>
        )}
      </svg>
      <svg viewBox="0 0 1024 1024" style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(0 ${buildingDy})`} opacity={buildingOpacity}>
          <DrawPath d={I_TOWER} len={I_TOWER_LEN} progress={towerP} width={44} />
          <DrawPath d={I_NAVE_L} len={I_NAVE_LEN} progress={naveP} width={44} />
          <DrawPath d={I_NAVE_R} len={I_NAVE_LEN} progress={naveP} width={44} />
          <DrawPath d={I_BASE} len={I_BASE_LEN} progress={baseP} width={44} />

          <Pop cx={512} cy={430} start={popStarts.spire ?? 0}>
            <polygon points={I_SPIRE} fill="#FFFFFF" />
          </Pop>
          <Pop cx={512} cy={724} start={popStarts.door ?? 0}>
            <path d={I_DOOR} fill={warmColor(warmDoor)} />
          </Pop>
          <Pop cx={386} cy={726} start={popStarts.winL ?? 0}>
            <path d={I_WIN_L} fill={warmColor(warmWinL)} />
          </Pop>
          <Pop cx={638} cy={726} start={popStarts.winR ?? 0}>
            <path d={I_WIN_R} fill={warmColor(warmWinR)} />
          </Pop>
          <Pop cx={512} cy={506} start={popStarts.rosette ?? 0}>
            <circle cx={512} cy={506} r={30} fill={warmColor(warmRose)} />
          </Pop>
        </g>

        <g opacity={crossOpacity} transform={`translate(0 ${crossDy + buildingDy})`}>
          <path d="M512 216 L512 348" stroke={CRIMSON} strokeWidth={44} strokeLinecap="round" />
          <path d="M466 262 L558 262" stroke={CRIMSON} strokeWidth={44} strokeLinecap="round" />
        </g>
      </svg>
    </>
  );
};

// --------------------------------------------------------------------------

export const EmanuelSplash: React.FC<EmanuelSplashProps> = ({ concept }) => {
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #352C74 0%, #221B4F 100%)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ position: "relative", width: LOGO_SIZE, height: LOGO_SIZE, marginTop: -170 }}>
        {concept.startsWith("h-") ? (
          <HLogo concept={concept as "h-ascent" | "h-fan" | "h-light"} />
        ) : (
          <ILogo concept={concept as "i-draw" | "i-rise" | "i-alive"} />
        )}
      </div>
    </AbsoluteFill>
  );
};
