import { useRef, useEffect, useState } from "react";

export interface AvatarCanvasProps {
  onSave: (avatarData: string) => void;
  initialData?: string;
}

export function AvatarCanvas({ onSave, initialData }: AvatarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#ff6b6b");
  const [brushSize, setBrushSize] = useState(8);

  const colors = [
    "#ff6b6b",
    "#ffd93d",
    "#4ecdc4",
    "#a855f7",
    "#ffffff",
    "#000000",
    "#ff8c42",
    "#6bcb77",
  ];

  const brushSizes = [4, 8, 12, 16];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initialize canvas with white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load initial data if provided
    if (initialData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = initialData;
    }
  }, [initialData]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
      onSave(dataUrl);
    }
  };

  return (
    <div className="avatar-canvas-container">
      <canvas
        ref={canvasRef}
        width={200}
        height={200}
        className="avatar-canvas"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      <div className="canvas-controls">
        <div className="color-picker">
          {colors.map((c) => (
            <button
              key={c}
              className={`color-btn ${color === c ? "active" : ""}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
              title={c}
            />
          ))}
        </div>
        <div className="brush-picker">
          {brushSizes.map((size) => (
            <button
              key={size}
              className={`brush-btn ${brushSize === size ? "active" : ""}`}
              onClick={() => setBrushSize(size)}
              title={`Size ${size}`}
            >
              <div
                style={{
                  width: size,
                  height: size,
                  borderRadius: "50%",
                  backgroundColor: color,
                }}
              />
            </button>
          ))}
        </div>
        <div className="canvas-actions">
          <button type="button" onClick={clearCanvas} className="secondary-btn">
            Clear
          </button>
          <button type="button" onClick={handleSave}>
            Save Avatar
          </button>
        </div>
      </div>
    </div>
  );
}
