import React from "react";

export default function LiveGuidanceOverlay({
  highlights = [],
  visible = true,
}) {
  if (!visible || !highlights.length) return null;

  return (
    <div className="el-live-guidance-layer" aria-hidden="true">
      {highlights.map((item, index) => {
        const style = {
          left: `${item.x ?? 0}%`,
          top: `${item.y ?? 0}%`,
          width: `${item.width ?? 18}%`,
          height: `${item.height ?? 12}%`,
        };

        const shapeClass =
          item.shape === "circle"
            ? "is-circle"
            : item.shape === "spotlight"
            ? "is-spotlight"
            : "is-rect";

        return (
          <div
            key={item.id || index}
            className={`el-live-guidance-item ${shapeClass}`}
            style={style}
          >
            {item.label ? (
              <div className="el-live-guidance-label">{item.label}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
