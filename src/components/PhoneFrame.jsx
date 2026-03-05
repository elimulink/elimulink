import { useEffect, useMemo, useState } from "react";

function formatFrameTime(locale) {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
}

function readConnectionType() {
  if (typeof navigator === "undefined") return "";
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const value = String(connection?.effectiveType || connection?.type || "").trim().toLowerCase();
  return value || "wifi";
}

export default function PhoneFrame({ children }) {
  const locale = useMemo(
    () => (typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US"),
    []
  );
  const [timeLabel, setTimeLabel] = useState(() => formatFrameTime(locale));
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [connectionType, setConnectionType] = useState(() => readConnectionType());
  const [battery, setBattery] = useState({ level: null, charging: false });

  useEffect(() => {
    const tick = () => setTimeLabel(formatFrameTime(locale));
    tick();
    const intervalId = window.setInterval(tick, 30000);
    return () => window.clearInterval(intervalId);
  }, [locale]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    const syncConnection = () => setConnectionType(readConnectionType());

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    connection?.addEventListener?.("change", syncConnection);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      connection?.removeEventListener?.("change", syncConnection);
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || typeof navigator.getBattery !== "function") return;

    let batteryManager = null;
    let disposed = false;

    const syncBattery = () => {
      if (!batteryManager || disposed) return;
      setBattery({
        level: Math.round(Number(batteryManager.level || 0) * 100),
        charging: Boolean(batteryManager.charging),
      });
    };

    navigator
      .getBattery()
      .then((manager) => {
        if (disposed) return;
        batteryManager = manager;
        syncBattery();
        batteryManager.addEventListener("levelchange", syncBattery);
        batteryManager.addEventListener("chargingchange", syncBattery);
      })
      .catch(() => {
        // keep fallback battery state
      });

    return () => {
      disposed = true;
      if (batteryManager) {
        batteryManager.removeEventListener("levelchange", syncBattery);
        batteryManager.removeEventListener("chargingchange", syncBattery);
      }
    };
  }, []);

  const batteryLevel = battery.level == null ? 55 : battery.level;
  const batteryFill = `${Math.max(8, Math.min(100, batteryLevel))}%`;
  const connectionLabel = String(connectionType || "wifi").toUpperCase();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "radial-gradient(circle at 50% 10%, #ffffff 0%, #eef0f5 55%, #dfe3eb 100%)",
      }}
    >
      <div
        style={{
          width: "min(95vw, 420px)",
          height: "min(95vh, 880px)",
          aspectRatio: "9 / 19.5",
          border: "14px solid black",
          borderRadius: "40px",
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
          background: "white",
          position: "relative",
          outline: "1px solid rgba(255,255,255,0.28)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "26px",
            border: "1px solid rgba(0,0,0,0.08)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {/* Notch */}
        <div
          style={{
            width: "35%",
            height: "4%",
            background: "black",
            borderRadius: "0 0 20px 20px",
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 15,
            pointerEvents: "none",
            background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0))",
            padding: "8px 14px 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "#0f172a",
            fontWeight: 700,
          }}
        >
          <span>{timeLabel}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: 600 }}>
            <span style={{ opacity: 0.8 }}>{connectionLabel}</span>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "999px",
                background: isOnline ? "#16a34a" : "#dc2626",
                boxShadow: isOnline ? "0 0 0 3px rgba(22,163,74,0.15)" : "0 0 0 3px rgba(220,38,38,0.15)",
              }}
              title={isOnline ? "Online" : "Offline"}
            />
            <div
              style={{
                width: "22px",
                height: "10px",
                border: "1.5px solid #0f172a",
                borderRadius: "3px",
                position: "relative",
              }}
              title={battery.charging ? `Charging ${batteryLevel}%` : `Battery ${batteryLevel}%`}
            >
              <div
                style={{
                  position: "absolute",
                  left: "1px",
                  top: "1px",
                  bottom: "1px",
                  width: batteryFill,
                  borderRadius: "2px",
                  background: battery.charging ? "#16a34a" : "#0f172a",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: "-3px",
                  top: "2px",
                  width: "2px",
                  height: "4px",
                  borderRadius: "1px",
                  background: "#0f172a",
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "8px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "36%",
            height: "4px",
            borderRadius: "999px",
            background: "rgba(15,23,42,0.25)",
            zIndex: 15,
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            height: "100%",
            overflowY: "auto",
            paddingTop: "30px",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
