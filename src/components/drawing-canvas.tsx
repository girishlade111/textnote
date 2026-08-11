"use client";

import { useRef, useState, useEffect } from "react";
import { Pencil, Eraser, Highlighter, Undo, Redo, Trash2, Download, Check, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Tool = "pen" | "pencil" | "highlighter" | "eraser" | "select";
type Bg = "blank" | "dotted" | "ruled" | "grid";

const COLORS = ["#1f2937", "#ef4444", "#f97316", "#f59e0b", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff"];

export function DrawingCanvas({ onSave }: { onSave: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#1f2937");
  const [size, setSize] = useState(4);
  const [bg, setBg] = useState<Bg>("blank");
  const [drawing, setDrawing] = useState(false);
  const historyRef = useRef<ImageData[]>([]);
  const redoRef = useRef<ImageData[]>([]);
  const posRef = useRef<{ x: number; y: number } | null>(null);

  const drawBackground = (preserve = false) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    let snapshot: ImageData | null = null;
    if (preserve) snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const rect = canvas.getBoundingClientRect();
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    if (bg === "dotted") {
      ctx.fillStyle = "#cbd5e1";
      for (let x = 12; x < rect.width; x += 16) {
        for (let y = 12; y < rect.height; y += 16) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (bg === "ruled") {
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      for (let y = 24; y < rect.height; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(rect.width, y); ctx.stroke(); }
    } else if (bg === "grid") {
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      for (let x = 20; x < rect.width; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, rect.height); ctx.stroke(); }
      for (let y = 20; y < rect.height; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(rect.width, y); ctx.stroke(); }
    }
    ctx.restore();
    if (preserve && snapshot) ctx.putImageData(snapshot, 0, 0);
  };

  const pushHistory = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (historyRef.current.length > 30) historyRef.current.shift();
    redoRef.current = [];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;
    drawBackground();
    pushHistory();
  }, []);

  useEffect(() => {
    drawBackground(true);
  }, [bg]);

  const undo = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    const last = historyRef.current.pop();
    if (!last) return;
    redoRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    ctx.putImageData(last, 0, 0);
  };
  const redo = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    const next = redoRef.current.pop();
    if (!next) return;
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    ctx.putImageData(next, 0, 0);
  };

  const getPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.PointerEvent) => {
    if (tool === "select") return;
    setDrawing(true);
    posRef.current = getPos(e);
    const ctx = ctxRef.current!;
    ctx.beginPath();
    ctx.moveTo(posRef.current.x, posRef.current.y);
  };
  const moveDraw = (e: React.PointerEvent) => {
    if (!drawing || !posRef.current) return;
    const ctx = ctxRef.current!;
    const pos = getPos(e);
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = color;
    ctx.lineWidth = tool === "highlighter" ? size * 4 : tool === "eraser" ? size * 5 : size;
    ctx.globalAlpha = tool === "highlighter" ? 0.35 : 1;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    posRef.current = pos;
  };
  const endDraw = () => {
    if (!drawing) return;
    setDrawing(false);
    posRef.current = null;
    pushHistory();
    const ctx = ctxRef.current!;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };

  const clear = () => {
    drawBackground();
    pushHistory();
    toast.success("Canvas cleared");
  };

  const save = () => {
    const canvas = canvasRef.current!;
    onSave(canvas.toDataURL("image/png"));
  };

  const download = () => {
    const canvas = canvasRef.current!;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `LS_Notes_Sketch_${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="flex flex-col h-full">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border/60">
        <div className="flex rounded-full bg-muted p-0.5">
          {([["pen",Pencil],["pencil",Pencil],["highlighter",Highlighter],["eraser",Eraser],["select",MousePointer2]] as const).map(([t,Icon]) => (
            <button key={t} onClick={() => setTool(t)} className={cn("p-1.5 rounded-full", tool === t ? "bg-background elev-1" : "text-muted-foreground")} aria-label={t}><Icon className="h-4 w-4" /></button>
          ))}
        </div>
        <div className="flex gap-1">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} className={cn("h-6 w-6 rounded-full border-2", color === c ? "border-foreground scale-110" : "border-transparent")} style={{ background: c }} aria-label={c} />
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span>Size</span>
          <input type="range" min={1} max={20} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-24" />
          <span className="tabular-nums w-5">{size}</span>
        </div>
        <div className="flex rounded-full bg-muted p-0.5">
          {([["blank","Blank"],["dotted","Dotted"],["ruled","Ruled"],["grid","Grid"]] as const).map(([b,label]) => (
            <button key={b} onClick={() => setBg(b as Bg)} className={cn("px-2 h-7 rounded-full text-[11px]", bg === b ? "bg-background elev-1" : "text-muted-foreground")}>{label}</button>
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={undo} aria-label="Undo"><Undo className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={redo} aria-label="Redo"><Redo className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={clear} aria-label="Clear"><Trash2 className="h-4 w-4 text-destructive" /></Button>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={download} aria-label="Download"><Download className="h-4 w-4" /></Button>
          <Button size="sm" className="rounded-full" onClick={save}><Check className="h-4 w-4 mr-1" /> Save</Button>
        </div>
      </div>
      {/* canvas */}
      <div className="flex-1 p-3 bg-muted/30 overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={startDraw}
          onPointerMove={moveDraw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
          className="w-full h-full rounded-xl touch-none bg-white elev-1"
          style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}
        />
      </div>
    </div>
  );
}
