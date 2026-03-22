export async function renderHighlightedImage({
  imageUrl,
  highlights = [],
  dimOutside = false,
}) {
  const image = await loadImage(imageUrl);

  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);

  if (dimOutside) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  highlights.forEach((item, index) => {
    const color = item.color || "#28a8ff";
    const label = item.label || `${index + 1}`;
    const x = item.x ?? 0;
    const y = item.y ?? 0;
    const width = item.width ?? 120;
    const height = item.height ?? 80;

    if (item.type === "box" || !item.type) {
      drawBox(ctx, { x, y, width, height, color, label });
    }

    if (item.type === "arrow") {
      drawArrow(ctx, {
        fromX: item.fromX ?? x,
        fromY: item.fromY ?? y,
        toX: item.toX ?? x + width,
        toY: item.toY ?? y + height,
        color,
        label,
      });
    }

    if (item.type === "circle") {
      drawCircle(ctx, {
        x,
        y,
        radius: item.radius ?? Math.max(width, height) / 2,
        color,
        label,
      });
    }
  });

  return {
    dataUrl: canvas.toDataURL("image/png"),
    blob: await canvasToBlob(canvas),
    width: canvas.width,
    height: canvas.height,
  };
}

function drawBox(ctx, { x, y, width, height, color, label }) {
  ctx.save();
  ctx.lineWidth = 6;
  ctx.strokeStyle = color;
  ctx.fillStyle = "rgba(255,255,255,0.0)";
  ctx.strokeRect(x, y, width, height);
  drawLabel(ctx, { x, y, color, label });
  ctx.restore();
}

function drawCircle(ctx, { x, y, radius, color, label }) {
  ctx.save();
  ctx.lineWidth = 6;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  drawLabel(ctx, { x: x + radius + 8, y: y - radius, color, label });
  ctx.restore();
}

function drawArrow(ctx, { fromX, fromY, toX, toY, color, label }) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  const angle = Math.atan2(toY - fromY, toX - fromX);
  const headLength = 18;

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle - Math.PI / 6),
    toY - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headLength * Math.cos(angle + Math.PI / 6),
    toY - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();

  drawLabel(ctx, { x: fromX, y: fromY, color, label });
  ctx.restore();
}

function drawLabel(ctx, { x, y, color, label }) {
  const text = String(label);
  ctx.save();
  ctx.font = "bold 22px sans-serif";

  const paddingX = 12;
  const metrics = ctx.measureText(text);
  const boxWidth = metrics.width + paddingX * 2;
  const boxHeight = 36;

  ctx.fillStyle = color;
  roundRect(ctx, x, Math.max(0, y - 42), boxWidth, boxHeight, 12);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x + paddingX, Math.max(24, y - 18));
  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}
