import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont();

// ---------------------------------------------------------------------------
// CantiereApp — logo sting.
//
// Idea: il logo non "appare", si COSTRUISCE. È un'app di gestione cantieri,
// quindi il movimento cita il mestiere: linee guida di tracciamento, le lettere
// che salgono in posizione, una trave che si posa e chiude la struttura.
//
// Vincolo forte: il frame finale deve coincidere ESATTAMENTE con l'icona statica
// (CA bianco centrato su teal #0d9488). Chi guarda lo sting e poi apre l'app deve
// vedere la stessa cosa, altrimenti lo sting racconta un logo che non esiste.
//
// `transparent` serve per l'export con canale alpha (webm vp9 / mov prores 4444):
// l'MP4 il canale alpha NON lo supporta e lo perderebbe in silenzio.
// ---------------------------------------------------------------------------

export const BRAND_TEAL = "#0d9488";

export interface CantiereAppLogoProps {
  /** Sfondo trasparente per export con alpha. Default: teal di brand. */
  transparent?: boolean;
  /** Mostra il wordmark sotto il monogramma. */
  wordmark?: boolean;
}

export const CantiereAppLogo: React.FC<CantiereAppLogoProps> = ({
  transparent = false,
  wordmark = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Tutto è espresso in rapporto al lato minore: la stessa composizione deve
  // reggere 1920x1080, 1080x1080 e 1080x1920 senza riscrivere le misure.
  const base = Math.min(width, height);
  const letterSize = base * 0.34;
  const strokeW = Math.max(base * 0.004, 2);

  // --- 1. Linee guida di tracciamento (0-14) --------------------------------
  const guideDraw = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Svaniscono quando la struttura regge da sola: il ponteggio si smonta.
  const guideFade = interpolate(frame, [42, 58], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const guideOpacity = guideDraw * guideFade * 0.28;

  // --- 2. Le lettere salgono in posizione (8 / 14, sfasate) ------------------
  const letterRise = (delay: number) =>
    spring({
      frame: frame - delay,
      fps,
      config: { damping: 14, mass: 0.7, stiffness: 90 },
    });

  const cRise = letterRise(8);
  const aRise = letterRise(14);

  const riseStyle = (p: number): React.CSSProperties => ({
    display: "inline-block",
    transform: `translateY(${(1 - p) * letterSize * 0.42}px)`,
    opacity: interpolate(p, [0, 0.35], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  });

  // --- 3. La trave si posa (28-46) ------------------------------------------
  // Entra da sinistra, decelera, si ferma sotto le lettere.
  const beam = spring({
    frame: frame - 28,
    fps,
    config: { damping: 18, mass: 0.9, stiffness: 70 },
  });
  const beamWidth = letterSize * 1.9;
  const beamX = interpolate(beam, [0, 1], [-beamWidth, 0]);
  const beamOpacity = interpolate(frame, [28, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- 4. Wordmark (48-64) ---------------------------------------------------
  const word = spring({
    frame: frame - 48,
    fps,
    config: { damping: 16, mass: 0.8, stiffness: 80 },
  });

  const guideLine: React.CSSProperties = {
    position: "absolute",
    background: "#ffffff",
    opacity: guideOpacity,
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: transparent ? "transparent" : BRAND_TEAL,
        fontFamily,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Linee guida: due verticali che inquadrano il monogramma, una orizzontale
          sulla baseline. Sono il "tracciamento" prima della posa. */}
      <div
        style={{
          position: "relative",
          width: beamWidth,
          height: letterSize * 1.6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            ...guideLine,
            left: 0,
            top: `${50 - guideDraw * 50}%`,
            width: strokeW,
            height: `${guideDraw * 100}%`,
          }}
        />
        <div
          style={{
            ...guideLine,
            right: 0,
            top: `${50 - guideDraw * 50}%`,
            width: strokeW,
            height: `${guideDraw * 100}%`,
          }}
        />
        <div
          style={{
            ...guideLine,
            left: `${50 - guideDraw * 50}%`,
            bottom: 0,
            height: strokeW,
            width: `${guideDraw * 100}%`,
          }}
        />

        {/* Monogramma: stesso peso e stesso rapporto dell'icona statica. */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: letterSize * 0.06,
            color: "#ffffff",
            fontSize: letterSize,
            fontWeight: 800,
            letterSpacing: letterSize * -0.02,
            lineHeight: 1,
          }}
        >
          <span style={riseStyle(cRise)}>C</span>
          <span style={riseStyle(aRise)}>A</span>
        </div>

        {/* La trave: chiude la struttura sotto il monogramma. */}
        <div
          style={{
            position: "absolute",
            bottom: letterSize * 0.06,
            left: 0,
            width: beamWidth,
            height: strokeW * 2.2,
            background: "#ffffff",
            borderRadius: strokeW,
            transform: `translateX(${beamX}px)`,
            opacity: beamOpacity,
          }}
        />
      </div>

      {wordmark ? (
        <div
          style={{
            marginTop: letterSize * 0.28,
            color: "#ffffff",
            fontSize: letterSize * 0.19,
            fontWeight: 600,
            letterSpacing: letterSize * 0.012,
            opacity: word,
            transform: `translateY(${(1 - word) * letterSize * 0.12}px)`,
          }}
        >
          CantiereApp
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
