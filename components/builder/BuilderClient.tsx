'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Transformer } from 'react-konva';
import type Konva from 'konva';

const DPI = 300;
const SHEET_WIDTH_IN = 22.5;

const heightOptions = [24, 36, 48, 60];

type Settings = {
  safeMarginIn: number;
  spacingIn: number;
  gridIn: number;
} | null;

type AssetOption = {
  id: string;
  title: string;
  previewUrl: string | null;
  originalUrl: string | null;
};

type BuilderItem = {
  id: string;
  name: string;
  src: string;
  originalSrc?: string | null;
  xIn: number;
  yIn: number;
  widthIn: number;
  heightIn: number;
  rotation: number;
  dpiMin?: number;
  type: 'upload' | 'library';
  uploadMeta?: {
    widthPx: number;
    heightPx: number;
  };
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = src;
  });
}

export default function BuilderClient({
  settings,
  assets
}: {
  settings: Settings;
  assets: AssetOption[];
}) {
  const scaleInch = 20;
  const [sheetHeightIn, setSheetHeightIn] = useState(36);
  const [autoHeight, setAutoHeight] = useState(false);
  const [items, setItems] = useState<BuilderItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const safeMargin = settings?.safeMarginIn ?? 0.15;
  const gridSize = settings?.gridIn ?? 0.25;

  const pxWidth = SHEET_WIDTH_IN * scaleInch * zoom;
  const pxHeight = sheetHeightIn * scaleInch * zoom;

  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;
    const selectedNode = stage.findOne(`#item-${selectedId}`);
    if (selectedNode) {
      transformer.nodes([selectedNode as unknown as Konva.Node]);
      transformer.getLayer()?.batchDraw();
    } else {
      transformer.nodes([]);
    }
  }, [selectedId, items]);

  const warnings = useMemo(() => {
    const warningsList: string[] = [];
    items.forEach((item) => {
      const outOfBounds =
        item.xIn < 0 ||
        item.yIn < 0 ||
        item.xIn + item.widthIn > SHEET_WIDTH_IN ||
        item.yIn + item.heightIn > sheetHeightIn;
      const safeViolation =
        item.xIn < safeMargin ||
        item.yIn < safeMargin ||
        item.xIn + item.widthIn > SHEET_WIDTH_IN - safeMargin ||
        item.yIn + item.heightIn > sheetHeightIn - safeMargin;

      if (outOfBounds) {
        warningsList.push(`${item.name} is out of bounds.`);
      }
      if (safeViolation) {
        warningsList.push(`${item.name} is inside safe margin.`);
      }
      if (item.dpiMin && item.dpiMin < DPI) {
        warningsList.push(`${item.name} DPI is below 300.`);
      }
    });
    return warningsList;
  }, [items, sheetHeightIn, safeMargin]);

  async function handleUpload(files: FileList | null) {
    if (!files) return;
    const nextItems: BuilderItem[] = [];
    for (const file of Array.from(files)) {
      const url = URL.createObjectURL(file);
      const image = await loadImage(url);
      const widthIn = image.width / DPI;
      const heightIn = image.height / DPI;
      nextItems.push({
        id: crypto.randomUUID(),
        name: file.name,
        src: url,
        xIn: safeMargin,
        yIn: safeMargin,
        widthIn,
        heightIn,
        rotation: 0,
        type: 'upload',
        uploadMeta: { widthPx: image.width, heightPx: image.height }
      });
    }
    setItems((prev) => [...prev, ...nextItems]);
  }

  async function handleAddAsset(asset: AssetOption) {
    if (!asset.previewUrl) return;
    const image = await loadImage(asset.previewUrl);
    const widthIn = image.width / DPI;
    const heightIn = image.height / DPI;
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: asset.title,
        src: asset.previewUrl ?? '',
        originalSrc: asset.originalUrl,
        xIn: safeMargin,
        yIn: safeMargin,
        widthIn,
        heightIn,
        rotation: 0,
        type: 'library'
      }
    ]);
  }

  function updateItem(id: string, patch: Partial<BuilderItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function handleExport() {
    const stage = stageRef.current;
    if (!stage) return;
    const originalItems = items;
    const swappedItems = items.map((item) =>
      item.originalSrc ? { ...item, src: item.originalSrc } : item
    );
    setItems(swappedItems);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const pixelRatio = DPI / scaleInch;
    const dataUrl = stage.toDataURL({ pixelRatio });
    await fetch('/api/builder/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataUrl,
        sheetHeightIn,
        items: swappedItems
      })
    });
    setItems(originalItems);
    alert('Exported gang sheet!');
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-4">
        <div className="rounded border bg-white p-4">
          <label className="text-sm font-medium">Upload PNGs</label>
          <input
            type="file"
            accept="image/png"
            multiple
            onChange={(event) => handleUpload(event.target.files)}
            className="mt-2"
          />
        </div>
        <div className="rounded border bg-white p-4">
          <h2 className="text-sm font-medium">Sheet Height</h2>
          <div className="mt-2 flex flex-col gap-2">
            {heightOptions.map((height) => (
              <label key={height} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={!autoHeight && sheetHeightIn === height}
                  onChange={() => {
                    setAutoHeight(false);
                    setSheetHeightIn(height);
                  }}
                />
                {height}"
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoHeight}
                onChange={() => setAutoHeight((prev) => !prev)}
              />
              Auto Height
            </label>
          </div>
        </div>
        <div className="rounded border bg-white p-4">
          <h2 className="text-sm font-medium">Tools</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(prev + 0.1, 2))}
              className="rounded border px-2 py-1 text-xs"
            >
              Zoom In
            </button>
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(prev - 0.1, 0.5))}
              className="rounded border px-2 py-1 text-xs"
            >
              Zoom Out
            </button>
            <button
              type="button"
              onClick={() => setSnapToGrid((prev) => !prev)}
              className="rounded border px-2 py-1 text-xs"
            >
              {snapToGrid ? 'Snap On' : 'Snap Off'}
            </button>
            <button
              type="button"
              onClick={() => setItems([])}
              className="rounded border px-2 py-1 text-xs"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="rounded border bg-white p-4">
          <h2 className="text-sm font-medium">Design Library</h2>
          <div className="mt-2 space-y-2">
            {assets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => handleAddAsset(asset)}
                className="w-full rounded border px-2 py-1 text-left text-xs"
              >
                {asset.title}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="rounded bg-slate-900 px-4 py-2 text-white"
        >
          Export PNG
        </button>
        {warnings.length > 0 && (
          <div className="rounded border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-700">
            <p className="font-medium">Warnings</p>
            <ul className="list-disc pl-5">
              {warnings.map((warning, idx) => (
                <li key={`${warning}-${idx}`}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="overflow-auto rounded border bg-white p-4">
        <div
          className="relative"
          style={{ width: pxWidth, height: pxHeight, background: '#f8fafc' }}
        >
          <Stage ref={stageRef} width={pxWidth} height={pxHeight}>
            <Layer>
              <Rect
                x={safeMargin * scaleInch * zoom}
                y={safeMargin * scaleInch * zoom}
                width={(SHEET_WIDTH_IN - safeMargin * 2) * scaleInch * zoom}
                height={(sheetHeightIn - safeMargin * 2) * scaleInch * zoom}
                stroke="#e2e8f0"
                dash={[4, 4]}
              />
              {items.map((item) => (
                <BuilderImage
                  key={item.id}
                  item={item}
                  scale={scaleInch * zoom}
                  isSelected={item.id === selectedId}
                  onSelect={() => setSelectedId(item.id)}
                  onChange={(patch) => updateItem(item.id, patch)}
                  snapToGrid={snapToGrid}
                  gridSize={gridSize}
                />
              ))}
              <Transformer ref={transformerRef} rotateEnabled />
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  );
}

function BuilderImage({
  item,
  scale,
  isSelected,
  onSelect,
  onChange,
  snapToGrid,
  gridSize
}: {
  item: BuilderItem;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<BuilderItem>) => void;
  snapToGrid: boolean;
  gridSize: number;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    loadImage(item.src).then((img) => {
      if (isMounted) setImage(img);
    });
    return () => {
      isMounted = false;
    };
  }, [item.src]);

  useEffect(() => {
    if (item.uploadMeta) {
      const dpiX = item.uploadMeta.widthPx / item.widthIn;
      const dpiY = item.uploadMeta.heightPx / item.heightIn;
      const dpiMin = Math.min(dpiX, dpiY);
      if (dpiMin !== item.dpiMin) {
        onChange({ dpiMin });
      }
    }
  }, [item.heightIn, item.widthIn, item.uploadMeta, item.dpiMin, onChange]);

  return (
    <KonvaImage
      id={`item-${item.id}`}
      image={image ?? undefined}
      x={item.xIn * scale}
      y={item.yIn * scale}
      width={item.widthIn * scale}
      height={item.heightIn * scale}
      rotation={item.rotation}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      stroke={isSelected ? '#2563eb' : undefined}
      strokeWidth={isSelected ? 2 : 0}
      onDragEnd={(event) => {
        const xIn = event.target.x() / scale;
        const yIn = event.target.y() / scale;
        const snappedX = snapToGrid
          ? Math.round(xIn / gridSize) * gridSize
          : xIn;
        const snappedY = snapToGrid
          ? Math.round(yIn / gridSize) * gridSize
          : yIn;
        onChange({ xIn: snappedX, yIn: snappedY });
      }}
      onTransformEnd={(event) => {
        const node = event.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        const widthIn = (node.width() * scaleX) / scale;
        const heightIn = (node.height() * scaleY) / scale;
        onChange({
          widthIn,
          heightIn,
          rotation: node.rotation()
        });
      }}
    />
  );
}
