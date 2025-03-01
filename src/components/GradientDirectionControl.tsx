import * as React from "react";
import { ColorStop } from "./GradientPicker";

interface GradientDirectionControlProps {
  colorStops: ColorStop[];
  onChange: (angle: number) => void;
}

export const GradientDirectionControl: React.FC<GradientDirectionControlProps> = ({ 
  colorStops,
  onChange 
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [startPoint, setStartPoint] = React.useState({ x: 30, y: 70 });
  const [endPoint, setEndPoint] = React.useState({ x: 70, y: 30 });
  const [draggingPoint, setDraggingPoint] = React.useState<'start' | 'end' | null>(null);
  // 存储当前边缘颜色的状态
  const [edgeColors, setEdgeColors] = React.useState({ startColor: '#000000', endColor: '#ffffff' });

  // 计算角度和更新状态
  const updatePoints = (newStart: { x: number; y: number } | null, newEnd: { x: number; y: number } | null) => {
    const start = newStart || startPoint;
    const end = newEnd || endPoint;
    
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    // 计算数学坐标系下的角度
    const mathAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    // 转换为CSS角度系统 (mathAngle是从右开始的，CSS是从上开始的，相差90度)
    const cssAngle = (mathAngle + 90) % 360;
    
    if (newStart) setStartPoint(newStart);
    if (newEnd) setEndPoint(newEnd);
    
    // 传递CSS兼容的角度
    onChange(cssAngle);
  };

  // 监听 colorStops 变化，实时更新边缘颜色
  React.useEffect(() => {
    console.log("colorStops changed:", colorStops); // 调试用
    
    if (!colorStops || colorStops.length === 0) {
      setEdgeColors({ startColor: '#000000', endColor: '#ffffff' });
      return;
    }
    
    // 确保使用完整的深拷贝进行排序
    const sortedStops = JSON.parse(JSON.stringify(colorStops))
      .sort((a: ColorStop, b: ColorStop) => a.position - b.position);
    
    const newColors = {
      startColor: sortedStops[0]?.color || '#000000',
      endColor: sortedStops[sortedStops.length - 1]?.color || '#ffffff'
    };
    
    console.log("New edge colors:", newColors); // 调试用
    setEdgeColors(newColors);
  }, [colorStops]); // 监听colorStops的变化

  const handleMouseMove = (e: MouseEvent) => {
    if (!draggingPoint || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newPoint = {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    };

    if (draggingPoint === 'start') {
      updatePoints(newPoint, null);
    } else {
      updatePoints(null, newPoint);
    }
  };

  const handleMouseDown = (point: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingPoint(point);
  };

  const handleMouseUp = () => {
    setDraggingPoint(null);
  };

  React.useEffect(() => {
    if (draggingPoint) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingPoint]);

  // 计算连接线的角度
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'all',
      }}
    >
      {/* 使用SVG绘制连接线和圆形 */}
      <svg
        width="100%"
        height="100%"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      >
        {/* 定义阴影滤镜 */}
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.3" />
          </filter>
          <filter id="circleShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.4" />
          </filter>
        </defs>
        
        {/* 连接线 */}
        <line
          x1={`${startPoint.x}%`}
          y1={`${startPoint.y}%`}
          x2={`${endPoint.x}%`}
          y2={`${endPoint.y}%`}
          stroke="white"
          strokeWidth="3.5"
          filter="url(#shadow)"
        />
        
        {/* 起点圆形 - 使用最左侧的颜色 */}
        <circle
          cx={`${startPoint.x}%`}
          cy={`${startPoint.y}%`}
          r={draggingPoint === 'start' ? "11" : "8"}
          fill={edgeColors.startColor}
          stroke="white"
          strokeWidth={draggingPoint === 'start' ? "2.5" : "2"}
          filter="url(#circleShadow)"
          pointerEvents="none"
          style={{
            transition: 'r 0.1s ease, stroke-width 0.1s ease'
          }}
        />
        
        {/* 终点圆形 - 使用最右侧的颜色 */}
        <circle
          cx={`${endPoint.x}%`}
          cy={`${endPoint.y}%`}
          r={draggingPoint === 'end' ? "11" : "8"}
          fill={edgeColors.endColor}
          stroke="white"
          strokeWidth={draggingPoint === 'end' ? "2.5" : "2"}
          filter="url(#circleShadow)"
          pointerEvents="none"
          style={{
            transition: 'r 0.1s ease, stroke-width 0.1s ease'
          }}
        />
      </svg>
      
      {/* 可拖动的起点区域（透明） */}
      <div
        style={{
          position: 'absolute',
          left: `${startPoint.x}%`,
          top: `${startPoint.y}%`,
          width: '24px', // 稍大一点更容易拖动
          height: '24px',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          cursor: 'move',
          zIndex: draggingPoint === 'start' ? 1000 : 999,
          opacity: 0.01, // 几乎透明，只用于捕获事件
        }}
        onMouseDown={handleMouseDown('start')}
      />

      {/* 可拖动的终点区域（透明） */}
      <div
        style={{
          position: 'absolute',
          left: `${endPoint.x}%`,
          top: `${endPoint.y}%`,
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          cursor: 'move',
          zIndex: draggingPoint === 'end' ? 1000 : 999,
          opacity: 0.01,
        }}
        onMouseDown={handleMouseDown('end')}
      />
    </div>
  );
}; 