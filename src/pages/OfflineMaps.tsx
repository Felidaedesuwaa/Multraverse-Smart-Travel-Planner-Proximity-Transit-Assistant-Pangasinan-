import { useState } from "react";
import { RefreshCw, Download, Trash2 } from "lucide-react";
import { colors } from "../theme/colors";
import Card from "../components/Card";
import WovenDivider from "../components/WovenDivider";
import { offlineRegions, offlineStorageCapMB, type OfflineRegion } from "../data/places";

export default function OfflineMaps() {
  const [regions, setRegions] = useState<OfflineRegion[]>(offlineRegions);

  const toggleRegion = (id: string) => {
    setRegions((prev) => prev.map((r) => (r.id === id ? { ...r, downloaded: !r.downloaded } : r)));
  };

  const downloadedRegions = regions.filter((r) => r.downloaded);
  const usedMB = downloadedRegions.reduce((sum, r) => sum + r.sizeMB, 0);
  const freeMB = offlineStorageCapMB - usedMB;
  const usedPct = (usedMB / offlineStorageCapMB) * 100;

  return (
    <main style={{ flex: 1, backgroundColor: colors.warmSand, padding: 28, overflowY: "auto" }}>
      {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: 26,
                fontWeight: 700,
                color: colors.oceanBlue,
                margin: 0,
              }}
            >
              Offline Maps
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: colors.textMuted, margin: "4px 0 0" }}>
              Download regions for offline navigation
            </p>
          </div>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "11px 20px",
              borderRadius: 10,
              border: `1.5px solid ${colors.border}`,
              backgroundColor: "#fff",
              color: colors.textPrimary,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={15} />
            Sync All
          </button>
        </div>

        {/* Storage summary */}
        <Card style={{ marginBottom: 28 }}>
          <WovenDivider color={colors.oceanBlue} count={40} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  color: colors.textMuted,
                  marginBottom: 8,
                }}
              >
                STORAGE USED
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: 32, fontWeight: 700, color: colors.textPrimary }}>
                  {usedMB} MB
                </span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: colors.textMuted }}>
                  / {offlineStorageCapMB} MB
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>
                Downloaded
              </div>
              <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 20, fontWeight: 700, color: colors.oceanBlue }}>
                {downloadedRegions.length}
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: colors.textMuted }}>regions</div>
            </div>
          </div>

          <div style={{ height: 8, borderRadius: 999, backgroundColor: "#EFEAE0", margin: "16px 0 8px" }}>
            <div
              style={{
                height: "100%",
                width: `${usedPct}%`,
                borderRadius: 999,
                backgroundColor: colors.oceanBlue,
              }}
            />
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: colors.textMuted }}>
            {freeMB} MB free
          </div>
        </Card>

        {/* Regions list */}
        <h2
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: 18,
            fontWeight: 700,
            color: colors.oceanBlue,
            margin: "0 0 16px",
          }}
        >
          Pangasinan Regions
        </h2>

        <Card style={{ padding: 0 }}>
          {regions.map((region, i) => (
            <div
              key={region.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "18px 22px",
                borderBottom: i < regions.length - 1 ? `1px solid ${colors.border}` : "none",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  backgroundColor: region.downloaded ? colors.palmGreenLight : "#F0F0F0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Download size={17} color={region.downloaded ? colors.palmGreen : colors.textMuted} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: colors.textPrimary }}>
                  {region.name}
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: colors.textMuted }}>
                  {region.description} · {region.sizeMB} MB
                </div>
              </div>

              {region.downloaded ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 12px",
                      borderRadius: 999,
                      color: colors.palmGreen,
                      backgroundColor: colors.palmGreenLight,
                    }}
                  >
                    Downloaded
                  </span>
                  <button
                    onClick={() => toggleRegion(region.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 16px",
                      borderRadius: 10,
                      border: `1.5px solid ${colors.coralLight}`,
                      backgroundColor: "#fff",
                      color: colors.sunsetCoral,
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => toggleRegion(region.id)}
                  style={{
                    padding: "9px 20px",
                    borderRadius: 10,
                    border: "none",
                    backgroundColor: colors.oceanBlue,
                    color: "#fff",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Download
                </button>
              )}
            </div>
          ))}
        </Card>
      </main>
  );
}
