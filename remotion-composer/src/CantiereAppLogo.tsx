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
// CantiereApp — logo sting.
//
// TESI: il cantiere e la contabilità sono lo stesso gesto — misurare. Il
// linguaggio del DISEGNO TECNICO li dice entrambi in una volta: quote, linee
// di misura, tralicci, la livella. È preciso senza essere freddo, ed è vero per
// un'app che tiene i conti di un cantiere.
//
// GERARCHIA (è ciò che separa il professionale dal carino): due piani distinti.
//   • piano TECNICO — griglia, gru, quote: teal chiaro, opacità bassa. È il
//     progetto, sta dietro, non compete col marchio.
//   • piano MARCHIO — CA, riga del totale, wordmark: bianco pieno.
// Una versione precedente disegnava tutto in bianco pieno: senza figura/sfondo
// l'occhio non sa dove guardare e il risultato legge amatoriale.
//
// I due mestieri nello stesso segno:
//   griglia del ponteggio   ==  carta quadrettata del registro
//   trave che la gru posa   ==  riga tirata sopra il totale
//   livella "in bolla"      ==  i conti che tornano
//
// MOVIMENTO: la macchina spinge (scale 1.05 → 1.0) per tutta la durata — è ciò
// che dà peso. Le easing sono divise per natura: bezier meccanico per la gru
// (una macchina non rimbalza), spring solo per la bolla (un liquido sì).
// Il ritmo è sincopato, con una PAUSA prima del lockup: il silenzio è la parte
// che costa.
//
// Le lettere restano il glifo VERO (Inter 800), mai ridisegnato, e il frame
// finale coincide con l'icona statica dell'app.
//
// TENTATIVO SCARTATO: far posare alla gru la traversa della A spezzando il
// glifo con clip-path complementari. Le bande non coincidono con la traversa
// reale di Inter 800 e il glifo si rompe. Le metriche di un font non sono
// un'API su cui costruire un'animazione — servirebbero path SVG propri.
//
// `transparent` per l'export con alpha (webm vp9 / mov prores). L'MP4 il canale
// alpha NON lo supporta. Per la trasparenza Remotion vuole --image-format=png.
// ---------------------------------------------------------------------------

export const BRAND_TEAL = "#0d9488";
const TEAL_LIFT = "#13a596"; // centro, un gradino più chiaro
const TEAL_DEEP = "#0a6b64"; // bordi, per dare profondità
const BLUEPRINT = "rgba(220, 250, 245, 0.26)";
const BLUEPRINT_SOFT = "rgba(220, 250, 245, 0.15)";

const MARKS = 14;
const COLS = 7;

export interface CantiereAppLogoProps {
  transparent?: boolean;
  wordmark?: boolean;
}

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
/** Meccanico: parte deciso, si ferma senza rimbalzare. Una gru non fa spring. */
const MECH = Easing.bezier(0.16, 0.84, 0.24, 1);
/** Ingresso di scena: piccola anticipazione, poi si assesta. */
const ENTER = Easing.bezier(0.22, 1, 0.36, 1);

export const CantiereAppLogo: React.FC<CantiereAppLogoProps> = ({
  transparent = false,
  wordmark = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const base = Math.min(width, height);
  const letterSize = base * 0.28;
  const strokeW = Math.max(base * 0.0034, 2);
  const boxW = letterSize * 1.95;
  const boxH = letterSize * 1.25;
  const craneH = boxH * 0.95;
  const cell = boxW / COLS;
  const markSize = cell * 0.46;
  const jibW = boxW * 0.78;

  // --- Camera: spinta continua. Il peso di una sigla viene da qui. ---------
  const push = interpolate(frame, [0, 175], [1.055, 1], {
    ...clamp,
    easing: Easing.bezier(0.3, 0, 0.2, 1),
  });

  // --- 1. Il progetto si traccia (0-18) ------------------------------------
  const gridDraw = interpolate(frame, [0, 18], [0, 1], { ...clamp, easing: MECH });
  const gridOut = interpolate(frame, [58, 76], [1, 0], clamp);

  // --- 2. Le quote si registrano (14-52) -----------------------------------
  const marksLanded = Math.max(0, Math.min(MARKS, Math.floor((frame - 14) / 2.6) + 1));
  const marksFade = interpolate(frame, [56, 72], [1, 0], clamp);

  // --- 3. La gru entra (44-64), lavora, esce (124-142) ---------------------
  const craneIn = interpolate(frame, [44, 64], [0, 1], { ...clamp, easing: ENTER });
  const craneOpacity = craneIn * interpolate(frame, [124, 142], [1, 0], clamp);

  // --- 4. La C sale per corsi (60-82) --------------------------------------
  const cBuild = interpolate(frame, [60, 82], [0, 1], { ...clamp, easing: MECH });

  // --- 5. La A si ribalta in piedi (68-90) ---------------------------------
  const aStand = interpolate(frame, [68, 92], [0, 1], { ...clamp, easing: ENTER });

  // --- 6. La gru cala la trave (88-112), la posa, risale (118-134) ---------
  const hookDown = interpolate(frame, [88, 112], [0, 1], { ...clamp, easing: MECH });
  const hookUp = interpolate(frame, [118, 134], [0, 1], { ...clamp, easing: MECH });
  const hookY = (hookDown - hookUp) * (craneH * 0.46 + boxH * 0.72);
  const beamCarried = interpolate(frame, [90, 96], [0, 1], clamp);
  const beamReleased = interpolate(frame, [110, 118], [0, 1], { ...clamp, easing: MECH });

  // --- 7. La bolla si centra (124-152) — qui sì lo spring: è un liquido ----
  const bubble = spring({
    frame: frame - 124,
    fps,
    config: { damping: 8.5, mass: 1, stiffness: 52 },
  });
  const bubbleX = interpolate(bubble, [0, 1], [-boxW * 0.3, 0]);
  const levelChrome = interpolate(frame, [156, 170], [1, 0], clamp);

  // --- 8. PAUSA (152-166), poi il lockup ----------------------------------
  const word = interpolate(frame, [166, 184], [0, 1], { ...clamp, easing: ENTER });

  const glyph: React.CSSProperties = {
    position: "absolute",
    fontSize: letterSize,
    fontWeight: 800,
    lineHeight: 1,
    color: "#ffffff",
    letterSpacing: letterSize * -0.02,
    textAlign: "center",
  };

  const letterGap = letterSize * 0.05;
  const letterW = letterSize * 0.72;
  const pairW = letterW * 2 + letterGap;
  const cLeft = (boxW - pairW) / 2;
  const aLeft = cLeft + letterW + letterGap;
  const letterTop = (boxH - letterSize) / 2;
  const ruleY = boxH * 0.99;

  const beamY = interpolate(beamReleased, [0, 1], [craneH * 0.14 + hookY + strokeW * 3.4, craneH + ruleY]);
  const beamX = interpolate(beamReleased, [0, 1], [(boxW - jibW * 0.42) / 2, 0]);
  const beamW = interpolate(beamReleased, [0, 1], [jibW * 0.42, boxW]);

  // La gru come TRALICCIO: le diagonali sono la differenza fra una gru e tre
  // rettangoli. Disegnata in SVG perché le linee restino nette a ogni scala.
  const VB_W = 200;
  const VB_H = 120;
  const trussDiag = (x0: number, x1: number, y0: number, y1: number, n: number) =>
    Array.from({ length: n }).map((_, i) => {
      const a = x0 + ((x1 - x0) * i) / n;
      const b = x0 + ((x1 - x0) * (i + 1)) / n;
      return (
        <line
          key={`d${i}`}
          x1={a}
          y1={i % 2 === 0 ? y0 : y1}
          x2={b}
          y2={i % 2 === 0 ? y1 : y0}
          stroke={BLUEPRINT}
          strokeWidth={1.1}
        />
      );
    });

  return (
    <AbsoluteFill
      style={{
        background: transparent
          ? "transparent"
          : `radial-gradient(120% 120% at 50% 42%, ${TEAL_LIFT} 0%, ${BRAND_TEAL} 46%, ${TEAL_DEEP} 100%)`,
        fontFamily,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          transform: `scale(${push})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", width: boxW, height: craneH + boxH }}>
          {/* --- GRU a traliccio ----------------------------------------- */}
          <svg
            width={boxW}
            height={craneH}
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              opacity: craneOpacity,
              transform: `translateY(${(1 - craneIn) * -craneH * 0.5}px)`,
              overflow: "visible",
            }}
          >
            {/* freccia: due correnti + diagonali */}
            <line x1={8} y1={16} x2={192} y2={16} stroke={BLUEPRINT} strokeWidth={1.6} />
            <line x1={8} y1={26} x2={192} y2={26} stroke={BLUEPRINT} strokeWidth={1.6} />
            {trussDiag(8, 192, 16, 26, 16)}
            {/* montante: due correnti + croci */}
            <line x1={52} y1={26} x2={52} y2={118} stroke={BLUEPRINT} strokeWidth={1.6} />
            <line x1={64} y1={26} x2={64} y2={118} stroke={BLUEPRINT} strokeWidth={1.6} />
            {Array.from({ length: 5 }).map((_, i) => {
              const y0 = 26 + (92 / 5) * i;
              const y1 = 26 + (92 / 5) * (i + 1);
              return (
                <g key={`m${i}`}>
                  <line x1={52} y1={y0} x2={64} y2={y1} stroke={BLUEPRINT_SOFT} strokeWidth={1} />
                  <line x1={64} y1={y0} x2={52} y2={y1} stroke={BLUEPRINT_SOFT} strokeWidth={1} />
                  <line x1={52} y1={y1} x2={64} y2={y1} stroke={BLUEPRINT_SOFT} strokeWidth={0.8} />
                </g>
              );
            })}
            {/* tiranti dalla torretta alla freccia */}
            <line x1={58} y1={8} x2={150} y2={16} stroke={BLUEPRINT_SOFT} strokeWidth={1} />
            <line x1={58} y1={8} x2={26} y2={16} stroke={BLUEPRINT_SOFT} strokeWidth={1} />
            <line x1={58} y1={8} x2={58} y2={16} stroke={BLUEPRINT} strokeWidth={1.4} />
            {/* contrappeso */}
            <rect x={14} y={26} width={20} height={7} fill={BLUEPRINT} />
          </svg>

          {/* cavo + gancio: si muovono, quindi fuori dall'SVG statico */}
          <div
            style={{
              position: "absolute",
              left: boxW * 0.5,
              top: craneH * 0.14,
              width: strokeW * 0.6,
              height: Math.max(hookY, 0),
              background: BLUEPRINT,
              opacity: craneOpacity,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: boxW * 0.5 - strokeW * 1.5,
              top: craneH * 0.14 + Math.max(hookY, 0),
              width: strokeW * 3.6,
              height: strokeW * 1.8,
              borderRadius: strokeW * 0.5,
              background: BLUEPRINT,
              opacity: craneOpacity,
            }}
          />

          {/* --- Il piano di lavoro -------------------------------------- */}
          <div style={{ position: "absolute", left: 0, top: craneH, width: boxW, height: boxH }}>
            {/* griglia: ponteggio e registro nello stesso tratto */}
            {Array.from({ length: COLS + 1 }).map((_, i) => (
              <div
                key={`v${i}`}
                style={{
                  position: "absolute",
                  background: BLUEPRINT_SOFT,
                  left: i * cell,
                  top: `${50 - gridDraw * 50}%`,
                  width: strokeW * 0.5,
                  height: `${gridDraw * 100}%`,
                  opacity: gridOut,
                }}
              />
            ))}
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`h${i}`}
                style={{
                  position: "absolute",
                  background: BLUEPRINT_SOFT,
                  top: (boxH / 2) * i,
                  left: `${50 - gridDraw * 50}%`,
                  height: strokeW * 0.5,
                  width: `${gridDraw * 100}%`,
                  opacity: gridOut,
                }}
              />
            ))}

            {/* quote registrate: presenze segnate / mattoni posati */}
            {Array.from({ length: MARKS }).map((_, i) => {
              const col = i % COLS;
              const row = Math.floor(i / COLS);
              const p = interpolate(frame, [14 + i * 2.6, 14 + i * 2.6 + 7], [0, 1], {
                ...clamp,
                easing: MECH,
              });
              return (
                <div
                  key={`m${i}`}
                  style={{
                    position: "absolute",
                    left: col * cell + (cell - markSize) / 2,
                    top: row * (boxH / 2) + (boxH / 2 - markSize) / 2,
                    width: markSize,
                    height: markSize * 0.34,
                    borderRadius: strokeW * 0.7,
                    background: BLUEPRINT,
                    opacity: p * marksFade,
                    transform: `translateY(${(1 - p) * -cell * 0.7}px)`,
                  }}
                />
              );
            })}

            {/* quota: il conteggio in linguaggio da disegno tecnico */}
            <div
              style={{
                position: "absolute",
                top: boxH * 1.06,
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: strokeW * 3,
                opacity: marksFade,
              }}
            >
              <div style={{ height: strokeW * 0.5, width: boxW * 0.3, background: BLUEPRINT_SOFT }} />
              <span
                style={{
                  color: BLUEPRINT,
                  fontSize: letterSize * 0.16,
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: letterSize * 0.01,
                }}
              >
                {String(marksLanded).padStart(2, "0")}
              </span>
              <div style={{ height: strokeW * 0.5, width: boxW * 0.3, background: BLUEPRINT_SOFT }} />
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
                opacity: interpolate(aStand, [0, 0.2], [0, 1], clamp),
                transformOrigin: "0% 100%",
                transform: `rotate(${(1 - aStand) * -12}deg)`,
              }}
            >
              A
            </div>
          </div>

          {/* --- LA TRAVE: viaggia col gancio, si posa, diventa livella --- */}
          <div
            style={{
              position: "absolute",
              left: beamX,
              top: beamY,
              width: beamW,
              height: strokeW * 2 + levelChrome * strokeW * 2.8,
              opacity: beamCarried,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "#ffffff",
                borderRadius: strokeW * 0.8,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: boxW * 0.18,
                height: strokeW * 2.6,
                marginLeft: -boxW * 0.09,
                marginTop: -strokeW * 1.3,
                borderRadius: strokeW * 1.3,
                background: BRAND_TEAL,
                opacity: levelChrome * beamReleased,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: strokeW * 2.1,
                height: strokeW * 2.1,
                marginLeft: -strokeW * 1.05,
                marginTop: -strokeW * 1.05,
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
              marginTop: letterSize * 0.34,
              color: "#ffffff",
              fontSize: letterSize * 0.155,
              fontWeight: 500,
              // tracking aperto: convenzione da lockup, il wordmark respira
              letterSpacing: letterSize * 0.062,
              paddingLeft: letterSize * 0.062,
              opacity: word,
              transform: `translateY(${(1 - word) * letterSize * 0.09}px)`,
            }}
          >
            CANTIEREAPP
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
