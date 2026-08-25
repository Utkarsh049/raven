import React from "react";

export function AdminLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <img
        src="/icon-512.png"
        alt="Raven"
        width={32}
        height={32}
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "8px",
          objectFit: "contain",
          display: "block",
        }}
      />
      <span
        style={{
          fontSize: "1.125rem",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "var(--theme-text, #fafafa)",
        }}
      >
        Raven
      </span>
    </div>
  );
}

export function AdminIcon() {
  return (
    <img
      src="/icon-512.png"
      alt="Raven"
      width={28}
      height={28}
      style={{
        width: "28px",
        height: "28px",
        borderRadius: "6px",
        objectFit: "contain",
        display: "block",
      }}
    />
  );
}
