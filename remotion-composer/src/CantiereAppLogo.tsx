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
// Il prodotto è due mestieri insieme: si lavora in cantiere e si tiene la
// contabilità. I due condividono la stessa grafica, quindi un solo movimento
// può dirle entrambe:
//
//   griglia del ponteggio   ==  carta quadrettata del registro
//   mattone posato          ==  presenza segnata
//   trave che la gru posa   ==  riga tirata sopra il totale
//   livella "in bolla"      ==  i conti che tornano
//
// Due oggetti di cantiere che LAVORANO, non decorano:
//   • la GRU cala la trave — senza di lei la riga del totale non arriva
//   • la LIVELLA è quella trave, e la sua bolla si centra prima di sparire
//
// Le lettere restano il glifo VERO (Inter 800), mai ridisegnato: si animano
// per intero (la C sale per corsi come una muratura, la A si ribalta in piedi
// come un pannello prefabbricato). Una versione precedente spezzava la A con
// clip-path per far posare la traversa dalla gru: le bande non coincidono con
// la traversa reale del font e il glifo si rompeva. Le metriche di un font non
// sono un'API — non ci si costruisce sopra un'animazione.
//
// Il frame finale coincide con l'icona statica dell'app: chi guarda lo sting e
// poi apre CantiereApp deve trovare la stessa identica cosa.
//
// `transparent` per l'export con alpha (webm vp9 / mov prores). L'MP4 il canale
// alpha NON lo supporta. Per la trasparenza Remotion vuole --image-format=png.
// ---------------------------------------------------------------------------

export const BRAND_TEAL = "#0d9488";

/** Tacche registrate. Il contatore arriva esattamente a questo numero: quello
 *  che vedi posare è quello che vedi sommato — nessuna cifra inventata. */
const MARKS = 14;
const COLS = 7;

export interface CantiereAppLogoProps {
  transparent?: boolean;
  wordmark?: boolean;
}

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const CantiereAppLogo: React.FC<CantiereAppLogoProps> = ({
  transparent = false,
  wordmark = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Misure in rapporto al lato minore: 16:9, 1:1, 9:16 e icona quadrata escono
  // dalla stessa composizione senza riscrivere niente.
  const base = Math.min(width, height);
  const letterSize = base * 0.3;
  const strokeW = Math.max(base * 0.0038, 2);
  const boxW = letterSize * 1.9;
  const boxH = letterSize * 1.35;
  const craneH = boxH * 0.85;
  const cell = boxW / COLS;
  const markSize = cell * 0.5;
  const jibW = boxW * 0.62;
  const ruleY = boxH * 0.94; // dove si posa la trave/livella

  // --- 1. Griglia: ponteggio e registro nello stesso tratto (0-14) ----------
  const gridDraw = interpolate(frame, [0, 14], [0, 1], clamp);
  const gridOpacity = gridDraw * interpolate(frame, [54, 70], [1, 0], clamp) * 0.22;

  // --- 2. Le tacche cadono e vengono contate (12-54) ------------------------
  const marksLanded = Math.max(0, Math.min(MARKS, Math.floor((frame - 12) / 3) + 1));
  const marksFade = interpolate(frame, [54, 68], [1, 0], clamp);
  const counterFade = interpolate(frame, [56, 68], [1, 0], clamp);

  // --- 3. La gru entra (44-62) e più tardi se ne va (118-136) ---------------
  const craneIn = spring({
    frame: frame - 44,
    fps,
    config: { damping: 20, mass: 0.9, stiffness: 60 },
  });
  const craneOpacity = craneIn * interpolate(frame, [118, 136], [1, 0], clamp);

  // --- 4. La C sale per corsi, come una muratura (58-78) --------------------
  const cBuild = interpolate(frame, [58, 78], [0, 1], clamp);

  // --- 5. La A si ribalta in piedi, come un pannello prefabbricato (66-86) --
  const aStand = spring({
    frame: frame - 66,
    fps,
    config: { damping: 13, mass: 0.8, stiffness: 90 },
  });

  // --- 6. La gru cala la trave, la posa, risale vuota (84-126) --------------
  const hookDown = interpolate(frame, [84, 106], [0, 1], clamp);
  const hookUp = interpolate(frame, [112, 126], [0, 1], clamp);
  const hookY = (hookDown - hookUp) * (craneH * 0.42 + ruleY * 0.62);
  // La trave viaggia col gancio finché non è posata: da lì resta dov'è.
  const beamReleased = interpolate(frame, [104, 110], [0, 1], clamp);
  const beamCarried = interpolate(frame, [86, 92], [0, 1], clamp);

  // --- 7. La bolla si centra: "in bolla" == i conti tornano (116-140) -------
  const bubble = spring({
    frame: frame - 116,
    fps,
    config: { damping: 9, mass: 0.9, stiffness: 55 },
  });
  const bubbleX = interpolate(bubble, [0, 1], [-boxW * 0.32, 0]);
  // Poi la livella smette di essere oggetto e resta la riga del totale.
  const levelChrome = interpolate(frame, [142, 156], [1, 0], clamp);

  const word = spring({
    frame: frame - 150,
    fps,
    config: { damping: 16, mass: 0.8, stiffness: 80 },
  });

  const gridLine: React.CSSProperties = {
    position: "absolute",
    background: "#ffffff",
    opacity: gridOpacity,
  };

  const glyph: React.CSSProperties = {
    position: "absolute",
    fontSize: letterSize,
    fontWeight: 800,
    lineHeight: 1,
    color: "#ffffff",
    letterSpacing: letterSize * -0.02,
    textAlign: "center",
  };

  const letterGap = letterSize * 0.06;
  const letterW = letterSize * 0.72;
  const pairW = letterW * 2 + letterGap;
  const cLeft = (boxW - pairW) / 2;
  const aLeft = cLeft + letterW + letterGap;
  const letterTop = (boxH - letterSize) / 2;

  // Trave: sotto il gancio mentre viaggia, alla riga del totale una volta posata.
  const beamY = interpolate(beamReleased, [0, 1], [craneH * 0.12 + hookY + strokeW * 3, craneH + ruleY]);
  const beamX = interpolate(beamReleased, [0, 1], [(boxW - jibW * 0.5) / 2, 0]);
  const beamW = interpolate(beamReleased, [0, 1], [jibW * 0.5, boxW]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: transparent ? "transparent" : BRAND_TEAL,
        fontFamily,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Il gruppo include la fascia della gru: così la gru sta DENTRO
          l'inquadratura e tutto resta centrato come un blocco solo. */}
      <div style={{ position: "relative", width: boxW, height: craneH + boxH }}>
        {/* --- GRU: montante, freccia, cavo, gancio ----------------------- */}
        <div
          style={{
            position: "absolute",
            left: boxW / 2 - jibW * 0.5,
            top: 0,
            width: jibW,
            height: craneH,
            opacity: craneOpacity,
            transform: `translateY(${(1 - craneIn) * -craneH * 0.6}px)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: jibW * 0.14,
              top: craneH * 0.12,
              width: strokeW * 1.8,
              height: craneH * 0.7,
              background: "#ffffff",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: craneH * 0.12,
              width: jibW,
              height: strokeW * 1.8,
              background: "#ffffff",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: jibW * 0.5,
              top: craneH * 0.12,
              width: strokeW * 0.7,
              height: Math.max(hookY, 0),
              background: "#ffffff",
              opacity: 0.85,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: jibW * 0.5 - strokeW * 1.8,
              top: craneH * 0.12 + Math.max(hookY, 0),
              width: strokeW * 4.2,
              height: strokeW * 2.2,
              borderRadius: strokeW * 0.6,
              background: "#ffffff",
            }}
          />
        </div>

        {/* --- Il piano di lavoro ----------------------------------------- */}
        <div style={{ position: "absolute", left: 0, top: craneH, width: boxW, height: boxH }}>
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

          {/* Tacche: presenze segnate / mattoni posati */}
          {Array.from({ length: MARKS }).map((_, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const p = spring({
              frame: frame - (12 + i * 3),
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

          {/* Contatore: somma esattamente le tacche posate */}
          <div
            style={{
              position: "absolute",
              top: boxH * 1.02,
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

          {/* C: sale per corsi, come una muratura */}
          <div
            style={{
              ...glyph,
              left: cLeft,
              top: letterTop,
              width: letterW,
              clipPath: `inset(${(1 - cBuild) * 100}% 0% 0% 0%)`,
            }}
          >
            C
          </div>

          {/* A: si ribalta in piedi, come un pannello prefabbricato */}
          <div
            style={{
              ...glyph,
              left: aLeft,
              top: letterTop,
              width: letterW,
              opacity: interpolate(aStand, [0, 0.25], [0, 1], clamp),
              transformOrigin: "0% 100%",
              transform: `rotate(${(1 - aStand) * -14}deg)`,
            }}
          >
            A
          </div>
        </div>

        {/* --- LA TRAVE: viaggia col gancio, si posa, diventa livella ----- */}
        <div
          style={{
            position: "absolute",
            left: beamX,
            top: beamY,
            width: beamW,
            height: strokeW * 2.2 + levelChrome * strokeW * 3.2,
            opacity: beamCarried,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#ffffff",
              borderRadius: strokeW,
            }}
          />
          {/* fiala + bolla: compaiono solo quando la trave è posata */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: boxW * 0.2,
              height: strokeW * 3,
              marginLeft: -boxW * 0.1,
              marginTop: -strokeW * 1.5,
              borderRadius: strokeW * 1.5,
              background: BRAND_TEAL,
              opacity: levelChrome * beamReleased,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: strokeW * 2.4,
              height: strokeW * 2.4,
              marginLeft: -strokeW * 1.2,
              marginTop: -strokeW * 1.2,
              borderRadius: "50%",
              background: "#ffffff",
              opacity: levelChrome * beamReleased,
              transform: `translateX(${bubbleX}px)`,
            }}
          />
        </div>
      </div>

      {wordmark ? (
        <div
          style={{
            marginTop: letterSize * 0.4,
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
