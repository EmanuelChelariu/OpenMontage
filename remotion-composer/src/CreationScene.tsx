import React from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * CreationScene — storybook still con micro-animazione cutout 2.5D.
 *
 * Due layer della STESSA inquadratura: lo sfondo originale (il soggetto
 * resta "cotto" dentro) e il ritaglio del soggetto sopra di esso. Entrambi
 * condividono il Ken Burns; il ritaglio riceve in piu' un moto sinusoidale
 * piccolo (respiro/ondeggio/fluttuazione). Ampiezze volutamente minime:
 * sotto ~1.5% di scala e ~10px il "doppione" sottostante non si percepisce.
 */
export interface CreationSceneMotion {
  period: number; // secondi per ciclo completo
  ampY?: number; // px
  ampX?: number; // px
  ampRot?: number; // gradi
  ampScale?: number; // frazione, es. 0.015
  origin?: string; // transform-origin del ritaglio
}

export interface CreationSceneProps {
  bg: string; // file sotto public/creation/
  fg?: string | null; // ritaglio con alpha, stesso canvas del bg
  seconds: number;
  zoom: "in" | "out";
  motion?: CreationSceneMotion | null;
  /** Crop del cover (es. "50% 62%" per scendere); IDENTICO su bg e fg. */
  objectPosition?: string;
}

export const calculateCreationSceneMetadata: CalculateMetadataFunction<
  CreationSceneProps
> = ({ props }) => ({
  durationInFrames: Math.max(2, Math.round(props.seconds * 30)),
  fps: 30,
  width: 1920,
  height: 1080,
});

const FADE_S = 0.5;
const KB_MAX = 1.18;

export const CreationScene: React.FC<CreationSceneProps> = ({
  bg,
  fg,
  seconds,
  zoom,
  motion,
  objectPosition = "50% 50%",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;

  const kb = interpolate(
    frame,
    [0, Math.max(durationInFrames - 1, 1)],
    zoom === "in" ? [1.0, KB_MAX] : [KB_MAX, 1.0],
  );

  const fadeIn = interpolate(frame, [0, FADE_S * fps], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 1 - FADE_S * fps, durationInFrames - 1],
    [1, 0],
    { extrapolateLeft: "clamp" },
  );
  const opacity = Math.min(fadeIn, fadeOut);

  let fgTransform = "none";
  if (motion) {
    const w = (2 * Math.PI * t) / motion.period;
    const dy = (motion.ampY ?? 0) * Math.sin(w);
    const dx = (motion.ampX ?? 0) * Math.sin(w * 0.5);
    const rot = (motion.ampRot ?? 0) * Math.sin(w + Math.PI / 3);
    const sc = 1 + (motion.ampScale ?? 0) * Math.sin(w);
    fgTransform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${rot.toFixed(3)}deg) scale(${sc.toFixed(4)})`;
  }

  const imgStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill style={{ opacity }}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${kb})` }}>
          <Img src={staticFile(`creation/${bg}`)} style={imgStyle} />
          {fg ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: fgTransform,
                transformOrigin: motion?.origin ?? "50% 100%",
              }}
            >
              <Img src={staticFile(`creation/${fg}`)} style={imgStyle} />
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
