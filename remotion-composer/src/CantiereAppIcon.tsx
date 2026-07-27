import React from "react";
import { AbsoluteFill } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont();

// ---------------------------------------------------------------------------
// CantiereApp — icona applicazione, generata da codice (non disegnata a mano)
// così le tre varianti restano coerenti e rigenerabili.
//
// Vincolo che decide TUTTO il disegno: l'icona deve reggere a 48px. Il
// traliccio della gru dello sting qui è escluso — a quella scala diventa
// poltiglia. Serve una silhouette a tratto pieno, e una gerarchia netta:
//   CA domina · la gru è un accento · la barra chiude.
// Alle dimensioni piccole la gru sfuma con grazia e resta un CA leggibile:
// è il comportamento giusto, non un compromesso.
//
// Varianti:
//   ios      — fondo pieno, l'OS arrotonda gli angoli
//   adaptive — fondo trasparente, contenuto dentro il cerchio di sicurezza
//              Android (66% della tela: fuori di lì la maschera può tagliare)
//   splash   — fondo trasparente, contenuto più arioso
// ---------------------------------------------------------------------------

export const BRAND_TEAL = "#0d9488";

export type IconVariant = "ios" | "adaptive" | "splash";

export interface CantiereAppIconProps {
  variant?: IconVariant;
}

/** Quanto del lato occupa il marchio, per variante. Android maschera l'esterno. */
const SCALE: Record<IconVariant, number> = {
  ios: 1,
  adaptive: 0.66,
  splash: 0.82,
};

export const CantiereAppIcon: React.FC<CantiereAppIconProps> = ({
  variant = "ios",
}) => {
  const S = 1024;
  const k = SCALE[variant];

  // Geometria su tela 1024, poi scalata per variante.
  // Proporzioni tarate sul test di scala 1024/180/87/48: il CA deve dominare
  // (è l'elemento riconoscibile), la gru resta un accento che sfuma in basso.
  const stroke = 36;
  const craneTop = 214;
  const jibLeft = 276;
  const jibRight = 748;
  const mastX = 352;
  const mastBottom = 436;
  const hookX = 638;
  const hookDrop = 112;

  const barW = 600;
  const barH = 34;
  const barY = 796;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: variant === "ios" ? BRAND_TEAL : "transparent",
        fontFamily,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: S,
          height: S,
          transform: `scale(${k})`,
        }}
      >
        {/* --- GRU: silhouette piena, niente traliccio ------------------- */}
        {/* freccia */}
        <div
          style={{
            position: "absolute",
            left: jibLeft,
            top: craneTop,
            width: jibRight - jibLeft,
            height: stroke,
            background: "#ffffff",
            borderRadius: stroke * 0.15,
          }}
        />
        {/* montante */}
        <div
          style={{
            position: "absolute",
            left: mastX,
            top: craneTop,
            width: stroke,
            height: mastBottom - craneTop,
            background: "#ffffff",
            borderRadius: stroke * 0.15,
          }}
        />
        {/* contrappeso: il dettaglio che rende la sagoma una GRU e non una T */}
        <div
          style={{
            position: "absolute",
            left: jibLeft,
            top: craneTop - stroke * 0.9,
            width: stroke * 2.6,
            height: stroke * 0.9,
            background: "#ffffff",
            borderRadius: stroke * 0.15,
          }}
        />
        {/* cavo + gancio */}
        <div
          style={{
            position: "absolute",
            left: hookX,
            top: craneTop + stroke,
            width: stroke * 0.34,
            height: hookDrop,
            background: "#ffffff",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: hookX - stroke * 0.8,
            top: craneTop + stroke + hookDrop,
            width: stroke * 1.95,
            height: stroke * 0.75,
            background: "#ffffff",
            borderRadius: stroke * 0.2,
          }}
        />

        {/* --- CA: domina ------------------------------------------------ */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 424,
            width: S,
            textAlign: "center",
            color: "#ffffff",
            fontSize: 350,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: -10,
          }}
        >
          CA
        </div>

        {/* --- La barra: chiude la struttura ed è la riga del totale ----- */}
        <div
          style={{
            position: "absolute",
            left: (S - barW) / 2,
            top: barY,
            width: barW,
            height: barH,
            background: "#ffffff",
            borderRadius: barH * 0.5,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
