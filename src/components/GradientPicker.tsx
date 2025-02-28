import * as React from "react";
import { Swatch } from "@canva/app-ui-kit";
import { openColorSelector } from "@canva/asset";

export interface ColorStop {
  color: string;
  position: number;
  id: string;
}

interface GradientPickerProps {
  onChange: (colors: ColorStop[]) => void;
}

export const GradientPicker: React.FC<GradientPickerProps> = ({ onChange }) => {
  const [colorStops, setColorStops] = React.useState<ColorStop[]>([
    { color: "#ff0099", position: 0, id: "start" },
    { color: "#6600ff", position: 100, id: "end" }
  ]);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [draggingStop, setDraggingStop] = React.useState<string | null>(null);
  const [selectedStop, setSelectedStop] = React.useState<string | null>(null);
  const [pressTimer, setPressTimer] = React.useState<number | null>(null);
  const PRESS_DELAY = 50; // 缩短到 100ms，让交互更自然
  const [closeColorSelector, setCloseColorSelector] = React.useState<(() => void) | null>(null);

  const handleBarClick = (e: React.MouseEvent) => {
    if (draggingStop) return;
    
    if (!containerRef.current) return;
    
    if (e.target === containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const position = ((e.clientX - rect.left) / rect.width) * 100;
      
      // 获取点击位置的渐变颜色
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 100;
        canvas.height = 1;
        
        const gradient = ctx.createLinearGradient(0, 0, 100, 0);
        colorStops.forEach(stop => {
          gradient.addColorStop(stop.position / 100, stop.color);
        });
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 100, 1);
        
        const pixelData = ctx.getImageData(Math.floor(position), 0, 1, 1).data;
        const color = `#${[...pixelData.slice(0, 3)].map(x => x.toString(16).padStart(2, '0')).join('')}`;
      
      const newStop = {
        color: color,  // 使用获取到的渐变颜色
        position: Math.max(0, Math.min(100, position)),
        id: Math.random().toString(36).substr(2, 9)
      };
      
      setColorStops(prev => [...prev, newStop].sort((a, b) => a.position - b.position));
      onChange(colorStops);
      setSelectedStop(newStop.id);
      }
    }
  };

  const handleStopDragStart = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStop(id);
    
    const timer = window.setTimeout(() => {
      setDraggingStop(id);
    }, PRESS_DELAY);
    setPressTimer(timer);
  };

  const handleStopDragEnd = () => {
    setDraggingStop(null);
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingStop || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const position = ((e.clientX - rect.left) / rect.width) * 100;

      setColorStops(prev => 
        prev.map(stop => 
          stop.id === draggingStop 
            ? { ...stop, position: Math.max(0, Math.min(100, position)) }
            : stop
        ).sort((a, b) => a.position - b.position)
      );
      onChange(colorStops);
    };

    const handleMouseUp = () => {
      handleStopDragEnd();
    };

    if (draggingStop) {
      // 当开始拖动时，添加全局事件监听
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      // 清理事件监听
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingStop]);

  const handleDeleteStop = (stopId: string) => {
    if (colorStops.length <= 2) return;
    
    setColorStops(prev => {
      const newStops = prev.filter(stop => stop.id !== stopId);
      return newStops;
    });
    
    if (selectedStop === stopId) {
      setSelectedStop(null);
    }
    
    onChange(colorStops);
  };

  const handleColorChange = (stopId: string, newColor: string) => {
    const updatedStops = colorStops.map(stop => 
      stop.id === stopId ? { ...stop, color: newColor } : stop
    );
    setColorStops(updatedStops);
    onChange(updatedStops);
  };

  const handleSwatchClick = async (stopId: string, currentColor: string, event: React.MouseEvent) => {
    const anchor = event.currentTarget.getBoundingClientRect();
    const closeSelector = await openColorSelector(anchor, {
      scopes: ["solid"],
      selectedColor: currentColor
        ? { type: "solid", hexString: currentColor }
        : undefined,
      onColorSelect: (event) => {
        if (event.selection.type === "solid") {
          handleColorChange(stopId, event.selection.hexString);
        }
      },
    });
    setCloseColorSelector(() => closeSelector);
  };

  const gradientString = `linear-gradient(to right, ${
    colorStops.map(stop => `${stop.color} ${stop.position}%`).join(', ')
  })`;

  return (
    <div style={{ 
      position: 'relative', 
      width: '90%',
      height: '70px',
      paddingTop: '40px',
      margin: '0 auto',
      paddingLeft: '12px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <div
        ref={containerRef}
        onClick={handleBarClick}
        style={{
          position: 'relative',
          width: '100%',
          height: '40px',
          borderRadius: '8px',
          background: gradientString,
          cursor: 'pointer'
        }}
      >
        {colorStops.map((stop) => (
          <div
            key={stop.id}
            style={{
              position: 'absolute',
              left: `${stop.position}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: draggingStop === stop.id || selectedStop === stop.id ? 1000 : 1,
              pointerEvents: draggingStop && draggingStop !== stop.id ? 'none' : 'auto',
            }}
          >
            <div style={{ 
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              bottom: '150%',
              zIndex: draggingStop === stop.id || selectedStop === stop.id ? 1000 : 1,
            }}>
              <Swatch
                fill={[stop.color]}
                onClick={async (event) => {
                  const anchor = event.currentTarget.getBoundingClientRect();
                  const closeColorSelector = await openColorSelector(anchor, {
                    scopes: ["solid"],
                    selectedColor: {
                      type: "solid",
                      hexString: stop.color,
                    },
                    onColorSelect: (event) => {
                      if (event.selection.type === "solid") {
                        handleColorChange(stop.id, event.selection.hexString);
                      }
                    },
                  });
                }}
                onDelete={colorStops.length > 2 ? () => handleDeleteStop(stop.id) : undefined}
              />
            </div>
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: `${selectedStop === stop.id ? '3px' : '2px'} solid white`,
                backgroundColor: stop.color,
                cursor: 'move',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                zIndex: draggingStop === stop.id || selectedStop === stop.id ? 1000 : 1,
              }}
              onMouseDown={(e) => handleStopDragStart(stop.id, e)}
              onMouseUp={handleStopDragEnd}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStop(stop.id);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}; 