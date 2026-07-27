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
// Il prodotto è due cose insieme: si lavora in cantiere e si tiene la
// contabilità. L'animazione deve dirle entrambe, e può farlo con UN solo
// disegno perché i due mestieri condividono la stessa grafica:
//
//   • la griglia del ponteggio  ==  la carta quadrettata del registro
//   • il mattone che si posa    ==  la presenza che si segna
//   • la trave che chiude       ==  la riga che si tira sopra il totale
//
// Da qui la narrazione in tre battute: si registra il lavoro (le tacche
// cadono nella griglia mentre un contatore le somma) → si tira la riga →
// il totale diventa l'identità (CA).
//
// Vincolo forte: il frame finale coincide ESATTAMENTE con l'icona statica
// (CA bianco su teal #0d9488). Chi guarda lo sting e poi apre l'app deve
// vedere la stessa cosa, altrimenti lo sting racconta un logo che non esiste.
//
// `transparent` serve per l'export con canale alpha (webm vp9 / mov prores):
// l'MP4 il canale alpha NON lo supporta e lo perderebbe in silenzio. Per la
// trasparenza Remotion vuole anche --image-format=png.
// ---------------------------------------------------------------------------

export const BRAND_TEAL = "#0d9488";

/** Tacche registrate. Il contatore arriva esattamente a questo numero: quello
 *  che vedi posare è quello che vedi sommato — nessuna cifra inventata. */
const MARKS = 14;
const COLS = 7;

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

  // Tutto in rapporto al lato minore: la stessa composizione regge 16:9, 1:1,
  // 9:16 e l'icona quadrata senza riscrivere una misura.
  const base = Math.min(width, height);
  const letterSize = base * 0.34;
  const strokeW = Math.max(base * 0.004, 2);
  const boxW = letterSize * 1.9;
  const boxH = letterSize * 1.6;

  const cell = boxW / COLS;
  const markSize = cell * 0.5;

  // --- 1. La griglia (0-14) — ponteggio e registro nello stesso tratto ------
  const gridDraw = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const gridFade = interpolate(frame, [64, 82], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const gridOpacity = gridDraw * gridFade * 0.22;

  // --- 2. Le tacche cadono e vengono contate (12-56) ------------------------
  // Ogni tacca è una presenza segnata e un mattone posato. Il contatore sale
  // in sincrono: conta esattamente ciò che hai appena visto posare.
  const markDelay = (i: number) => 12 + i * 3;
  const marksLanded = Math.max(
    0,
    Math.min(MARKS, Math.floor((frame - 12) / 3) + 1),
  );

  const marksFade = interpolate(frame, [66, 80], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- 3. La riga del totale si posa (56-70) --------------------------------
  // Entra da sinistra e si ferma: è la trave che chiude la struttura ed è la
  // riga che in contabilità si tira sopra la somma. Stesso gesto, due letture.
  const rule = spring({
    frame: frame - 56,
    fps,
    config: { damping: 18, mass: 0.9, stiffness: 70 },
  });
  const ruleX = interpolate(rule, [0, 1], [-boxW, 0]);
  const ruleOpacity = interpolate(frame, [56, 62], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- 4. Il totale diventa identità (72-96) --------------------------------
  const counterFade = interpolate(frame, [72, 84], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const letterRise = (delay: number) =>
    spring({
      frame: frame - delay,
      fps,
      config: { damping: 14, mass: 0.7, stiffness: 90 },
    });
  const cRise = letterRise(76);
  const aRise = letterRise(82);

  const riseStyle = (p: number): React.CSSProperties => ({
    display: "inline-block",
    transform: `translateY(${(1 - p) * letterSize * 0.42}px)`,
    opacity: interpolate(p, [0, 0.35], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  });

  const word = spring({
    frame: frame - 96,
    fps,
    config: { damping: 16, mass: 0.8, stiffness: 80 },
  });

  const gridLine: React.CSSProperties = {
    position: "absolute",
    background: "#ffffff",
    opacity: gridOpacity,
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
      <div
        style={{
          position: "relative",
          width: boxW,
          height: boxH,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Griglia: montanti verticali + correnti orizzontali. Letta da lontano
            è un ponteggio, letta da vicino è un registro quadrettato. */}
        {Array.from({ length: COLS + 1 }).map((_, i) => (
          <div
            key={`v${i}`}
            style={{
              ...gridLine,
              left: i * cell,
              top: `${50 - gridDraw * 50}%`,
              width: strokeW * 0.6,
              height: `${gridDraw * 100}%`,
            }}
          />
        ))}
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`h${i}`}
            style={{
              ...gridLine,
              top: (boxH / 2) * i,
              left: `${50 - gridDraw * 50}%`,
              height: strokeW * 0.6,
              width: `${gridDraw * 100}%`,
            }}
          />
        ))}

        {/* Le tacche: cadono nelle celle, due file. Presenze segnate, mattoni posati. */}
        {Array.from({ length: MARKS }).map((_, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const p = spring({
            frame: frame - markDelay(i),
            fps,
            config: { damping: 20, mass: 0.5, stiffness: 140 },
          });
          return (
            <div
              key={`m${i}`}
              style={{
                position: "absolute",
                left: col * cell + (cell - markSize) / 2,
                top: row * (boxH / 2) + (boxH / 2 - markSize) / 2,
                width: markSize,
                height: markSize * 0.42,
                borderRadius: strokeW * 0.8,
                background: "#ffffff",
                opacity: p * 0.92 * marksFade,
                transform: `translateY(${(1 - p) * -cell * 0.8}px)`,
              }}
            />
          );
        })}

        {/* Il contatore: somma in tempo reale le tacche posate.
            tabular-nums perché le cifre non devono ballare mentre sale. */}
        <div
          style={{
            position: "absolute",
            bottom: -letterSize * 0.34,
            width: "100%",
            textAlign: "right",
            color: "#ffffff",
            fontSize: letterSize * 0.3,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            opacity: counterFade,
          }}
        >
          {String(marksLanded).padStart(2, "0")}
        </div>

        {/* Il monogramma: stesso peso e stesso rapporto dell'icona statica. */}
        <div
          style={{
            position: "absolute",
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

        {/* La riga del totale / la trave. */}
        <div
          style={{
            position: "absolute",
            bottom: -letterSize * 0.06,
            left: 0,
            width: boxW,
            height: strokeW * 2.2,
            background: "#ffffff",
            borderRadius: strokeW,
            transform: `translateX(${ruleX}px)`,
            opacity: ruleOpacity,
          }}
        />
      </div>

      {wordmark ? (
        <div
          style={{
            marginTop: letterSize * 0.42,
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
