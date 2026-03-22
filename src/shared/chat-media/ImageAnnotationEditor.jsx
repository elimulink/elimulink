import React, { useEffect, useMemo, useRef, useState } from "react";
import { Eraser, Highlighter, Pencil, RotateCcw, Check, X } from "lucide-react";
import "./chat-media.css";

const TOOLS = [
  { key: "draw", label: "Draw", icon: Pencil, width: 4, color: "#38bdf8", alpha: 1 },
  { key: "highlight", label: "Highlight", icon: Highlighter, width: 18, color: "#fde047", alpha: 0.35 },
];

function fitDimensions(width, height, maxSide = 1600) {
  if (!width || !height) return { width: 1, height: 1 };
  const largest = Math.max(width, height);
  if (largest <= maxSide) return { width, height };
  const scale = maxSide / largest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

export default function ImageAnnotationEditor({
  item,
  open,
  onClose,
  onApply,
}) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const drawingRef = useRef(false);
  const [tool, setTool] = useState("draw");
  const [strokes, setStrokes] = useState([]);
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const [isSaving, setIsSaving] = useState(false);

  const activeTool = useMemo(() => TOOLS.find((entry) => entry.key === tool) || TOOLS[0], [tool]);

  useEffect(() => {
    if (!open || !item?.url) return undefined;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      imageRef.current = image;
      setImageSize(fitDimensions(image.naturalWidth, image.naturalHeight));
      setStrokes([]);
    };
    image.src = item.url;
    return () => {
      imageRef.current = null;
    };
  }, [open, item]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.width = imageSize.width;
    canvas.height = imageSize.height;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    strokes.forEach((stroke) => {
      if (!stroke.points.length) return;
      context.save();
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = stroke.color;
      context.globalAlpha = stroke.alpha;
      context.lineWidth = stroke.width;
      context.beginPath();
      stroke.points.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.stroke();
      context.restore();
    });
  }, [imageSize, strokes]);

  if (!open || !item?.isImage) return null;

  const getPoint = (event) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const clientX = event.touches?.[0]?.clientX ?? event.clientX;
    const clientY = event.touches?.[0]?.clientY ?? event.clientY;
    const x = ((clientX - rect.left) / rect.width) * imageSize.width;
    const y = ((clientY - rect.top) / rect.height) * imageSize.height;
    return { x, y };
  };

  const startStroke = (event) => {
    event.preventDefault();
    drawingRef.current = true;
    const point = getPoint(event);
    setStrokes((prev) => [
      ...prev,
      {
        id: Date.now(),
        color: activeTool.color,
        width: activeTool.width,
        alpha: activeTool.alpha,
        points: [point],
      },
    ]);
  };

  const extendStroke = (event) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    const point = getPoint(event);
    setStrokes((prev) => {
      if (!prev.length) return prev;
      const next = [...prev];
      const last = next[next.length - 1];
      next[next.length - 1] = { ...last, points: [...last.points, point] };
      return next;
    });
  };

  const endStroke = () => {
    drawingRef.current = false;
  };

  const handleUndo = () => setStrokes((prev) => prev.slice(0, -1));
  const handleClear = () => setStrokes([]);

  const handleApply = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsSaving(true);
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setIsSaving(false);
        return;
      }
      const baseName = item.name?.replace(/\.[^.]+$/, "") || "image";
      const file = new File([blob], `${baseName}-annotated.png`, { type: "image/png" });
      await onApply?.(file);
      setIsSaving(false);
    }, "image/png");
  };

  return (
    <div className="chat-media-annotator-backdrop" onClick={onClose}>
      <div className="chat-media-annotator" onClick={(event) => event.stopPropagation()}>
        <div className="chat-media-annotator-header">
          <div>
            <div className="chat-media-annotator-title">Annotate image</div>
            <div className="chat-media-annotator-subtitle">{item.name}</div>
          </div>
          <button type="button" className="chat-media-modal-close" onClick={onClose} aria-label="Close annotation editor">
            <X size={16} />
          </button>
        </div>

        <div className="chat-media-annotator-toolbar">
          {TOOLS.map((entry) => {
            const Icon = entry.icon;
            const active = tool === entry.key;
            return (
              <button
                key={entry.key}
                type="button"
                onClick={() => setTool(entry.key)}
                className={`chat-media-tool-btn ${active ? "is-active" : ""}`.trim()}
              >
                <Icon size={15} />
                <span>{entry.label}</span>
              </button>
            );
          })}
          <button type="button" onClick={handleUndo} className="chat-media-tool-btn" disabled={!strokes.length}>
            <RotateCcw size={15} />
            <span>Undo</span>
          </button>
          <button type="button" onClick={handleClear} className="chat-media-tool-btn" disabled={!strokes.length}>
            <Eraser size={15} />
            <span>Clear</span>
          </button>
        </div>

        <div className="chat-media-annotator-stage">
          <canvas
            ref={canvasRef}
            className="chat-media-annotator-canvas"
            onPointerDown={startStroke}
            onPointerMove={extendStroke}
            onPointerUp={endStroke}
            onPointerLeave={endStroke}
            onPointerCancel={endStroke}
            onTouchStart={startStroke}
            onTouchMove={extendStroke}
            onTouchEnd={endStroke}
          />
        </div>

        <div className="chat-media-annotator-footer">
          <button type="button" className="chat-media-annotator-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="chat-media-annotator-primary"
            onClick={handleApply}
            disabled={isSaving}
          >
            <Check size={16} />
            <span>{isSaving ? "Saving..." : "Apply"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
