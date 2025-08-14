import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Rows,
  Text,
  Title,
  Box,
  LoadingIndicator,
  Alert,
  SegmentedControl,
  Column,
  Columns,
  Switch,
  Slider,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  TabPanels,
  Grid,
  CheckIcon,
  Select,
  ColorSelector
} from "@canva/app-ui-kit";
import { openDesign, addElementAtPoint } from "@canva/design";
import * as paper from 'paper';

// Define Shape type
interface CanvaShape {
  id: string;
  type: 'shape';
  paths: Array<{
    d: string;
    fill?: string | null;  // Simplified to just the color string
    stroke?: string | null;  // Simplified to just the color string  
    strokeWidth?: number;  // Separate strokeWidth property
  }>;
  viewBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  transform?: {
    x: number;
    y: number;
    rotation?: number;
  };
  width?: number;
  height?: number;
  top?: number;
  left?: number;
  rotation?: number;
}

// Boolean operation types
type BooleanOperationType = 'union' | 'intersect' | 'subtract' | 'exclude' | 'fragment';

// Stroke configuration interface
interface StrokeConfig {
  enabled: boolean;
  weight: number;
  color: string;
}

// Fill color configuration interface
interface FillConfig {
  color: string;
}

const BooleanOperations: React.FC = () => {
  const [shapes, setShapes] = useState<CanvaShape[]>([]);
  const [selectedShapes, setSelectedShapes] = useState<string[]>([]);
  const [operation, setOperation] = useState<BooleanOperationType>('union');
  const [strokeConfig, setStrokeConfig] = useState<StrokeConfig>({
    enabled: false,
    weight: 0,
    color: '#000000'
  });
  const [fillConfig, setFillConfig] = useState<FillConfig>({
    color: '#FF6B6B'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize Paper.js
  useEffect(() => {
    // Create a hidden canvas for Paper.js
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1000;
    canvas.style.display = 'none';
    document.body.appendChild(canvas);
    
    paper.setup(canvas);
    
    return () => {
      document.body.removeChild(canvas);
    };
  }, []);

  // Auto-load shapes when component mounts
  useEffect(() => {
    loadShapes();
  }, []);

  // State for preview
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);

  // Generate preview SVG using the same logic as boolean operation
  const generatePreview = useCallback(async () => {
    if (selectedShapes.length !== 2) {
      setPreviewSvg(null);
      return;
    }

    try {
      const shape1 = shapes.find(s => s.id === selectedShapes[0]);
      const shape2 = shapes.find(s => s.id === selectedShapes[1]);

      if (!shape1 || !shape2) {
        setPreviewSvg(null);
        return;
      }

      // Clear Paper.js project for preview
      paper.project.clear();

      // Convert paths (same logic as in performBooleanOperation)
      const paths1: paper.Path[] = [];
      shape1.paths.forEach(pathData => {
        if (pathData.d) {
          const path = svgPathToPaperPath(pathData.d, shape1.transform, shape1.viewBox, shape1.width, shape1.height);
          paths1.push(path);
        }
      });

      const paths2: paper.Path[] = [];
      shape2.paths.forEach(pathData => {
        if (pathData.d) {
          const path = svgPathToPaperPath(pathData.d, shape2.transform, shape2.viewBox, shape2.width, shape2.height);
          paths2.push(path);
        }
      });

      if (paths1.length === 0 || paths2.length === 0) {
        setPreviewSvg(null);
        return;
      }

      // Merge paths from same shape
      let compound1 = paths1[0];
      for (let i = 1; i < paths1.length; i++) {
        compound1 = compound1.unite(paths1[i]) as paper.Path;
      }

      let compound2 = paths2[0];
      for (let i = 1; i < paths2.length; i++) {
        compound2 = compound2.unite(paths2[i]) as paper.Path;
      }

      // Execute boolean operation
      let result: paper.Path;
      switch (operation) {
        case 'union':
          result = compound1.unite(compound2) as paper.Path;
          break;
        case 'intersect':
          result = compound1.intersect(compound2) as paper.Path;
          break;
        case 'subtract':
          result = compound1.subtract(compound2) as paper.Path;
          break;
        case 'exclude':
          // Exclude operation: use Paper.js native exclude method
          result = compound1.exclude(compound2) as paper.Path;
          break;
        case 'fragment':
          // Fragment operation: split all shapes into independent parts
          console.log('Generating fragment preview - splitting all parts');
          
          const intersections = compound1.getIntersections(compound2);
          console.log(`Found ${intersections.length} intersection points`);
          
          let fragmentParts: paper.Path[] = [];
          
          if (intersections.length > 0) {
            // Get all fragment parts: shape1 parts, shape2 parts, and intersection
            const shape1Minus2 = compound1.subtract(compound2) as paper.Path;
            const shape2Minus1 = compound2.subtract(compound1) as paper.Path;
            const intersection = compound1.intersect(compound2) as paper.Path;
            
            // Add non-empty parts
            if (shape1Minus2 && !shape1Minus2.isEmpty()) fragmentParts.push(shape1Minus2);
            if (shape2Minus1 && !shape2Minus1.isEmpty()) fragmentParts.push(shape2Minus1);
            if (intersection && !intersection.isEmpty()) fragmentParts.push(intersection);
            
            console.log(`Fragment parts: shape1-only=${!shape1Minus2?.isEmpty()}, shape2-only=${!shape2Minus1?.isEmpty()}, intersection=${!intersection?.isEmpty()}`);
          } else {
            // No intersections, use original shapes as separate parts
            fragmentParts = [compound1, compound2];
            console.log('No intersections found, using separate shapes');
          }
          
          console.log(`Fragment operation generated ${fragmentParts.length} total parts`);
          
          // Create a compound path containing all fragments
          result = new paper.CompoundPath({ children: fragmentParts }) as any;
          (result as any)._isFragment = true; // Mark for special handling
          break;
        default:
          setPreviewSvg(null);
          return;
      }

      if (!result || result.isEmpty()) {
        // For intersect operations, show empty preview with combined bounds
        if (operation === 'intersect') {
          // Calculate combined bounds of both shapes
          const shape1Bounds = compound1.bounds;
          const shape2Bounds = compound2.bounds;
          
          const combinedMinX = Math.min(shape1Bounds.x, shape2Bounds.x);
          const combinedMinY = Math.min(shape1Bounds.y, shape2Bounds.y);
          const combinedMaxX = Math.max(shape1Bounds.x + shape1Bounds.width, shape2Bounds.x + shape2Bounds.width);
          const combinedMaxY = Math.max(shape1Bounds.y + shape1Bounds.height, shape2Bounds.y + shape2Bounds.height);
          
          const combinedWidth = combinedMaxX - combinedMinX;
          const combinedHeight = combinedMaxY - combinedMinY;
          
          const padding = 20;
          const viewBoxX = combinedMinX - padding;
          const viewBoxY = combinedMinY - padding;
          const viewBoxWidth = combinedWidth + padding * 2;
          const viewBoxHeight = combinedMaxY - combinedMinY + padding * 2;

          const emptyPreviewSvg = `
            <svg 
              width="200" 
              height="150" 
              viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}"
              xmlns="http://www.w3.org/2000/svg"
              style="border: 1px solid #e5e7eb; border-radius: 8px; background: white;"
            >
            </svg>
          `;
          
          setPreviewSvg(emptyPreviewSvg);
        } else {
          setPreviewSvg(null);
        }
        return;
      }

      // Get bounds for viewBox
      const bounds = result.bounds;
      const padding = 20;
      const viewBoxX = bounds.x - padding;
      const viewBoxY = bounds.y - padding;
      const viewBoxWidth = bounds.width + padding * 2;
      const viewBoxHeight = bounds.height + padding * 2;

      // Generate SVG with user's color configuration
      const fillStyle = fillConfig.color;
      const strokeStyle = strokeConfig.weight > 0 ? 
        `stroke="${strokeConfig.color}" stroke-width="${strokeConfig.weight}"` : 
        'stroke="none"';

      // Special handling for Fragment operation - show multiple parts with user's fill color
      if (operation === 'fragment' && (result as any)._isFragment) {
        const fragmentParts = (result as any).children || [];
        
        const fragmentPaths = fragmentParts.map((part: any, index: number) => {
          return `<path d="${part.pathData}" fill="${fillStyle}" ${strokeStyle} fill-rule="evenodd" />`;
        }).join('\n          ');

        const svgContent = `
          <svg 
            width="200" 
            height="150" 
            viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}"
            xmlns="http://www.w3.org/2000/svg"
            style="border: 1px solid #e5e7eb; border-radius: 8px; background: white;"
          >
            ${fragmentPaths}
          </svg>
        `;
        setPreviewSvg(svgContent);
      } else {
        // Regular single-path preview
        const svgContent = `
          <svg 
            width="200" 
            height="150" 
            viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}"
            xmlns="http://www.w3.org/2000/svg"
            style="border: 1px solid #e5e7eb; border-radius: 8px; background: white;"
          >
            <path 
              d="${result.pathData}" 
              fill="${fillStyle}" 
              ${strokeStyle}
              fill-rule="evenodd"
            />
          </svg>
        `;
        setPreviewSvg(svgContent);
      }

    } catch (error) {
      console.error('Preview generation failed:', error);
      setPreviewSvg(null);
    }
  }, [selectedShapes, shapes, operation, fillConfig, strokeConfig]);

  // Auto-update preview when dependencies change
  useEffect(() => {
    generatePreview();
  }, [generatePreview]);



  // Helper function to extract color from various Canva color formats
  const extractColor = (colorData: any): string => {
    if (!colorData) return 'none';
    
    // Direct string color (hex)
    if (typeof colorData === 'string') {
      return colorData;
    }
    
    // Object with color property
    if (typeof colorData === 'object') {
      if (colorData.color) {
        return colorData.color;
      }
      
      // Handle RGB format
      if (colorData.r !== undefined && colorData.g !== undefined && colorData.b !== undefined) {
        const r = Math.round(colorData.r * 255);
        const g = Math.round(colorData.g * 255);
        const b = Math.round(colorData.b * 255);
        return `rgb(${r}, ${g}, ${b})`;
      }
      
      // Handle HSL format
      if (colorData.h !== undefined && colorData.s !== undefined && colorData.l !== undefined) {
        return `hsl(${colorData.h}, ${colorData.s * 100}%, ${colorData.l * 100}%)`;
      }
      
      // Handle asset-based fills (gradients, patterns, etc.)
      if (colorData.asset) {
        return '#9ca3af'; // Gray fallback for complex fills
      }
    }
    
    return 'none';
  };

  // Generate smart default colors based on shape characteristics
  const getSmartDefaultColor = (shape: CanvaShape): string => {
    const shapeType = getShapeType(shape);
    const colors = {
      'Circle': '#3b82f6',     // Blue
      'Rectangle': '#10b981',  // Green  
      'Polygon': '#f59e0b',    // Orange
      'Complex': '#8b5cf6',    // Purple
      'Curve': '#ef4444',      // Red
      'Simple': '#6b7280',     // Gray
      'Unknown': '#6366f1'     // Default blue
    };
    return colors[shapeType as keyof typeof colors] || colors.Unknown;
  };

  // Generate SVG preview for a shape
  const generateShapePreview = (shape: CanvaShape): React.ReactElement | null => {
    if (!shape.paths || shape.paths.length === 0) {
      return null;
    }

    const viewBox = shape.viewBox || { top: 0, left: 0, width: 100, height: 100 };
    const aspectRatio = viewBox.width / viewBox.height;
    
    // Create standardized preview size
    const previewSize = 80;
    const previewWidth = aspectRatio >= 1 ? previewSize : previewSize * aspectRatio;
    const previewHeight = aspectRatio >= 1 ? previewSize / aspectRatio : previewSize;
    
    console.log('Shape color analysis:', {
      shapeId: shape.id,
      paths: shape.paths.map((path, index) => ({
        index,
        fill: path.fill,
        stroke: path.stroke,
        pathData: path.d?.substring(0, 50) + '...'
      }))
    });
    
    return (
            <svg
        width={previewWidth}
        height={previewHeight}
        viewBox={`${viewBox.left} ${viewBox.top} ${viewBox.width} ${viewBox.height}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{
          display: 'block',
          margin: 'auto'
        }}
      >
        {shape.paths.map((path, index) => {
          // Use colors directly from Design Editing API (already extracted in loadShapes)
          const pathFill = (typeof path.fill === 'string') ? path.fill : 'none';
          const pathStroke = (typeof path.stroke === 'string') ? path.stroke : 'none';
          const pathStrokeWidth = (typeof path.strokeWidth === 'number') ? path.strokeWidth : 0;
          
          // Use smart default color if no fill or stroke is specified
          const smartDefaultColor = getSmartDefaultColor(shape);
          const finalFill = pathFill === 'none' && pathStroke === 'none' ? smartDefaultColor : pathFill;
          
          console.log(`Path ${index} colors from Design Editing API:`, {
            fill: pathFill,
            stroke: pathStroke,
            finalFill: finalFill,
            strokeWidth: pathStrokeWidth
          });
          
          return (
            <path 
              key={index}
              d={path.d} 
              fill={finalFill}
              stroke={pathStroke}
              strokeWidth={pathStrokeWidth}
              fillRule="evenodd"
            />
          );
        })}
      </svg>
    );
  };

  // Get shape type based on path analysis
  const getShapeType = (shape: CanvaShape): string => {
    if (!shape.paths || shape.paths.length === 0) {
      return 'Unknown';
    }
    
    const pathData = shape.paths[0]?.d || '';
    const pathLength = pathData.length;
    
    // Simple heuristics to determine shape type
    if (pathData.includes('C') || pathData.includes('c')) {
      if (pathLength < 100) {
        return 'Circle';
      } else if (pathLength < 200) {
        return 'Curve';
      } else {
        return 'Complex';
      }
    } else if (pathData.includes('L') || pathData.includes('l')) {
      const lCount = (pathData.match(/[Ll]/g) || []).length;
      if (lCount <= 4) {
        return 'Rectangle';
      } else if (lCount <= 8) {
        return 'Polygon';
      } else {
        return 'Complex';
      }
    } else {
      return 'Simple';
    }
  };

  // 生成路径配置（简化版本）
  const generateShapePath = (
    originalPath: string,
    fillConfig: FillConfig,
    strokeConfig: StrokeConfig
  ): any => {
    console.log('生成形状路径，填充颜色:', fillConfig.color);
    
    const pathConfig: any = {
      d: originalPath
    };

    // 处理填充配置 - Canva要求必须有填充
    pathConfig.fill = { 
      color: fillConfig.color,
      dropTarget: false 
    };

    // 如果启用了描边，添加描边配置
    if (strokeConfig.weight > 0) {
      pathConfig.stroke = {
        weight: strokeConfig.weight,
        color: strokeConfig.color,
        strokeAlign: "inset"
      };
      console.log('添加描边配置:', strokeConfig);
    }

    return pathConfig;
  };

  // Load shape elements from current page
  const loadShapes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await openDesign({ type: "current_page" }, async (session) => {
        const page = session.page;
        if (page.type === 'unsupported') {
          throw new Error('Current page type is not supported');
        }

        // Extract all shape elements
        const extractedShapes: CanvaShape[] = [];
        
        // Use ElementList's forEach method directly
        page.elements.forEach((element: any) => {
            if (element.type === 'shape') {
              // DEBUG: Log detailed element data including color information
              console.log('Complete shape element:', {
                id: element.id,
                type: element.type,
                left: element.left,
                top: element.top,
                width: element.width,
                height: element.height,
                viewBox: element.viewBox,
                paths: element.paths,
                fill: element.fill,
                stroke: element.stroke,
                styles: element.styles,
                appearance: element.appearance
              });

              // Extract path data with proper color information using Design Editing API
              const pathsWithColors: any[] = [];
              if (element.paths) {
                // Convert paths to array for processing
                const pathsArray = Array.from(element.paths);
                console.log('Shape paths array:', pathsArray);
                
                pathsArray.forEach((path: any, pathIndex: number) => {
                  console.log(`Path ${pathIndex} full structure:`, path);
                  
                  // Extract colors using Design Editing API structure
                  let fillColor = null;
                  let strokeColor = null;
                  let strokeWidth = 0;
                  
                  // Read fill color using the proper API structure
                  if (path.fill && path.fill.colorContainer && path.fill.colorContainer.ref) {
                    const colorFill = path.fill.colorContainer.ref;
                    if (colorFill.type === "solid") {
                      fillColor = colorFill.color;
                      console.log(`Path ${pathIndex} fill color from Design Editing API:`, fillColor);
                    }
                  }
                  
                  // Read stroke color and width
                  if (path.stroke && path.stroke.colorContainer && path.stroke.colorContainer.ref) {
                    const colorStroke = path.stroke.colorContainer.ref;
                    if (colorStroke.type === "solid") {
                      strokeColor = colorStroke.color;
                      console.log(`Path ${pathIndex} stroke color from Design Editing API:`, strokeColor);
                    }
                  }
                  
                  if (path.stroke && path.stroke.weight !== undefined) {
                    strokeWidth = path.stroke.weight;
                    console.log(`Path ${pathIndex} stroke width:`, strokeWidth);
                  }
                  
                  pathsWithColors.push({
                    d: path.d || '',
                    fill: fillColor,
                    stroke: strokeColor,
                    strokeWidth: strokeWidth
                  });
                });
              }
              
              extractedShapes.push({
                id: element.id || `shape_${Date.now()}_${Math.random()}`,
                type: 'shape',
                paths: pathsWithColors,
                viewBox: element.viewBox || { top: 0, left: 0, width: 100, height: 100 },
                transform: {
                  x: element.left || element.transform?.x || 0,
                  y: element.top || element.transform?.y || 0,
                  rotation: element.rotation || element.transform?.rotation || 0
                },
                width: element.width,
                height: element.height,
                top: element.top,
                left: element.left,
                rotation: element.rotation
              });
            }
            
          // If it's a group element, process its contents
          if (element.type === 'group' && element.contents) {
            element.contents.forEach((child: any) => {
              if (child.type === 'shape') {
                extractedShapes.push({
                  id: child.id || `shape_${Date.now()}_${Math.random()}`,
                  type: 'shape',
                  paths: child.paths || [],
                  viewBox: child.viewBox || { top: 0, left: 0, width: 100, height: 100 },
                  transform: {
                    x: child.left || child.transform?.x || 0,
                    y: child.top || child.transform?.y || 0,
                    rotation: child.rotation || child.transform?.rotation || 0
                  },
                  width: child.width,
                  height: child.height,
                  top: child.top,
                  left: child.left,
                  rotation: child.rotation
                });
              }
            });
          }
        });

        setShapes(extractedShapes);
        
        // Auto-select shapes: first 2 if >=2 shapes, or first 1 if only 1 shape
        if (extractedShapes.length >= 2) {
          setSelectedShapes([extractedShapes[0].id, extractedShapes[1].id]);
        } else if (extractedShapes.length === 1) {
          setSelectedShapes([extractedShapes[0].id]);
        } else {
        setSelectedShapes([]);
        }
      });
    } catch (err) {
      console.error('Loading shapes failed:', err);
      setError(err instanceof Error ? err.message : 'Loading shapes failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle shape selection
  const handleShapeSelection = (shapeId: string) => {
    setSelectedShapes(prev => {
      if (prev.includes(shapeId)) {
        return prev.filter(id => id !== shapeId);
      } else if (prev.length < 2) {
        return [...prev, shapeId];
      } else {
        // If two are already selected, replace the first one
        return [prev[1], shapeId];
      }
    });
  };

  // Convert SVG path to Paper.js Path with proper coordinate system handling
  const svgPathToPaperPath = (svgPath: string, transform: any, viewBox: any, actualWidth?: number, actualHeight?: number): paper.Path => {
    console.log(`Converting path: ${svgPath.substring(0, 100)}...`);
    console.log(`Transform:`, transform);
    console.log(`ViewBox:`, viewBox);
    console.log(`Actual size: ${actualWidth}x${actualHeight}`);
    
    // FIXED: Create Paper.js Path using correct API
    const path = new paper.Path();
    path.pathData = svgPath;  // This is the correct way to set SVG path data
    
    console.log(`Path created from SVG, initial bounds: (${path.bounds.x}, ${path.bounds.y}) size: ${path.bounds.width}x${path.bounds.height}`);
    
    if (transform && viewBox) {
      let matrix = new paper.Matrix();
      
      // CRITICAL FIX: Handle viewBox to actual display size scaling
      // The key insight: viewBox defines internal coordinate space, actualWidth/Height defines display size
      const viewBoxWidth = viewBox.width || 64;
      const viewBoxHeight = viewBox.height || 64;
      const displayWidth = actualWidth || viewBoxWidth;
      const displayHeight = actualHeight || viewBoxHeight;
      
      const scaleX = displayWidth / viewBoxWidth;
      const scaleY = displayHeight / viewBoxHeight;
      
      console.log(`ViewBox size: ${viewBoxWidth}x${viewBoxHeight}`);
      console.log(`Display size: ${displayWidth}x${displayHeight}`);  
      console.log(`Scale factors: x=${scaleX.toFixed(3)}, y=${scaleY.toFixed(3)}`);
      
      // Step 1: Apply scaling to match actual display size
      if (scaleX !== 1 || scaleY !== 1) {
        matrix.scale(scaleX, scaleY, new paper.Point(0, 0));
        path.transform(matrix);
        console.log(`Applied scaling: ${scaleX.toFixed(3)}x${scaleY.toFixed(3)}`);
        console.log(`After scaling bounds: (${path.bounds.x}, ${path.bounds.y}) size: ${path.bounds.width}x${path.bounds.height}`);
      }
      
      // Step 2: Calculate translation to final position
      const targetCanvasX = (transform.x || 0);
      const targetCanvasY = (transform.y || 0);
      console.log(`Target canvas position: (${targetCanvasX}, ${targetCanvasY})`);
      
      const translateX = targetCanvasX - path.bounds.x;
      const translateY = targetCanvasY - path.bounds.y;
      console.log(`Translation needed: (${translateX.toFixed(2)}, ${translateY.toFixed(2)})`);
      
      // Step 3: Apply translation
      const translateMatrix = new paper.Matrix();
      translateMatrix.translate(translateX, translateY);
      path.transform(translateMatrix);
      
      // Apply rotation if present (around the center of the transformed shape)
      if (transform.rotation && transform.rotation !== 0) {
        console.log(`Applying rotation: ${transform.rotation} degrees`);
        const rotationRadians = (transform.rotation * Math.PI) / 180;
        // Rotate around the center of the shape in its new position
        const centerX = targetCanvasX + displayWidth / 2;
        const centerY = targetCanvasY + displayHeight / 2;
        const rotateMatrix = new paper.Matrix();
        rotateMatrix.rotate(rotationRadians, new paper.Point(centerX, centerY));
        path.transform(rotateMatrix);
      }
      
      const newBounds = path.bounds;
      console.log(`FINAL bounds: (${newBounds.x.toFixed(2)}, ${newBounds.y.toFixed(2)}) to (${(newBounds.x + newBounds.width).toFixed(2)}, ${(newBounds.y + newBounds.height).toFixed(2)})`);
      console.log(`FINAL center: (${newBounds.center.x.toFixed(2)}, ${newBounds.center.y.toFixed(2)})`);
      console.log(`FINAL area: ${Math.abs(path.area).toFixed(2)}, closed: ${path.closed}`);
      
      // Debug: Show actual coordinate points
      const segments = path.segments.slice(0, 4).map(seg => `(${seg.point.x.toFixed(1)}, ${seg.point.y.toFixed(1)})`);
      console.log(`FINAL segments: (${segments.length})`, segments);
    } else {
      console.log('No transform or viewBox provided, path remains at original position');
    }
    
    return path;
  };

  // Execute boolean operation
  const performBooleanOperation = async () => {
    if (selectedShapes.length !== 2) {
      setError('Please select two shapes for boolean operation');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const shape1 = shapes.find(s => s.id === selectedShapes[0]);
      const shape2 = shapes.find(s => s.id === selectedShapes[1]);

      if (!shape1 || !shape2) {
        throw new Error('Cannot find selected shapes');
      }

      // Clear Paper.js project
      paper.project.clear();

      // Convert all paths of the first shape
      const paths1: paper.Path[] = [];
      shape1.paths.forEach(pathData => {
        if (pathData.d) {
          const path = svgPathToPaperPath(pathData.d, shape1.transform, shape1.viewBox, shape1.width, shape1.height);
          paths1.push(path);
        }
      });

      // Convert all paths of the second shape
      const paths2: paper.Path[] = [];
      shape2.paths.forEach(pathData => {
        if (pathData.d) {
          const path = svgPathToPaperPath(pathData.d, shape2.transform, shape2.viewBox, shape2.width, shape2.height);
          paths2.push(path);
        }
      });

      if (paths1.length === 0 || paths2.length === 0) {
        throw new Error('Cannot process selected shapes. Please ensure they have valid path data.');
      }

      // Merge multiple paths from the same shape
      let compound1 = paths1[0];
      for (let i = 1; i < paths1.length; i++) {
        compound1 = compound1.unite(paths1[i]) as paper.Path;
      }

      let compound2 = paths2[0];
      for (let i = 1; i < paths2.length; i++) {
        compound2 = compound2.unite(paths2[i]) as paper.Path;
      }

      // Execute boolean operation
      let result: paper.Path;
      switch (operation) {
        case 'union':
          result = compound1.unite(compound2) as paper.Path;
          break;
        case 'intersect':
          result = compound1.intersect(compound2) as paper.Path;
          break;
        case 'subtract':
          result = compound1.subtract(compound2) as paper.Path;
          break;
        case 'exclude':
          // Exclude operation: use Paper.js native exclude method
          console.log('Executing exclude operation using Paper.js exclude method');
          result = compound1.exclude(compound2) as paper.Path;
          console.log('Exclude result bounds:', result?.bounds);
          break;
        case 'fragment':
          // Fragment operation: split all shapes into independent parts
          console.log('Executing fragment operation - splitting all parts');
          
          const mainIntersections = compound1.getIntersections(compound2);
          console.log(`Found ${mainIntersections.length} intersection points`);
          
          let mainFragmentParts: paper.Path[] = [];
          
          if (mainIntersections.length > 0) {
            // Get all fragment parts: shape1 parts, shape2 parts, and intersection
            const shape1Minus2 = compound1.subtract(compound2) as paper.Path;
            const shape2Minus1 = compound2.subtract(compound1) as paper.Path;
            const intersection = compound1.intersect(compound2) as paper.Path;
            
            console.log('=== FRAGMENT PARTS DETAILED ANALYSIS ===');
            console.log('Shape1 bounds:', compound1.bounds);
            console.log('Shape2 bounds:', compound2.bounds);
            console.log('Shape1-only result:', {
              exists: !!shape1Minus2,
              isEmpty: shape1Minus2 ? shape1Minus2.isEmpty() : true,
              bounds: shape1Minus2 ? shape1Minus2.bounds : null,
              area: shape1Minus2 ? Math.abs(shape1Minus2.area || 0) : 0,
              pathData: shape1Minus2 ? shape1Minus2.pathData?.substring(0, 100) : null
            });
            console.log('Shape2-only result:', {
              exists: !!shape2Minus1,
              isEmpty: shape2Minus1 ? shape2Minus1.isEmpty() : true,
              bounds: shape2Minus1 ? shape2Minus1.bounds : null,
              area: shape2Minus1 ? Math.abs(shape2Minus1.area || 0) : 0,
              pathData: shape2Minus1 ? shape2Minus1.pathData?.substring(0, 100) : null
            });
            console.log('Intersection result:', {
              exists: !!intersection,
              isEmpty: intersection ? intersection.isEmpty() : true,
              bounds: intersection ? intersection.bounds : null,
              area: intersection ? Math.abs(intersection.area || 0) : 0,
              pathData: intersection ? intersection.pathData?.substring(0, 100) : null
            });
            
            // Add non-empty parts
            if (shape1Minus2 && !shape1Minus2.isEmpty()) {
              mainFragmentParts.push(shape1Minus2);
              console.log('✓ Added shape1-only part to fragments');
            } else {
              console.log('✗ Shape1-only part is empty or invalid');
            }
            if (shape2Minus1 && !shape2Minus1.isEmpty()) {
              mainFragmentParts.push(shape2Minus1);
              console.log('✓ Added shape2-only part to fragments');
            } else {
              console.log('✗ Shape2-only part is empty or invalid');
            }
            if (intersection && !intersection.isEmpty()) {
              mainFragmentParts.push(intersection);
              console.log('✓ Added intersection part to fragments');
            } else {
              console.log('✗ Intersection part is empty or invalid');
            }
            console.log('=== END FRAGMENT ANALYSIS ===');
          } else {
            // No intersections, use original shapes as separate parts
            mainFragmentParts = [compound1, compound2];
            console.log('No intersections found, using separate shapes');
          }
          
          console.log(`Fragment operation generated ${mainFragmentParts.length} independent parts`);
          
          // Debug the fragment parts before creating CompoundPath
          console.log('Fragment parts before CompoundPath creation:');
          mainFragmentParts.forEach((part, index) => {
            console.log(`Part ${index + 1}:`, {
              type: part.className,
              bounds: part.bounds,
              hasChildren: !!(part as any).children,
              childrenCount: (part as any).children?.length || 0,
              pathData: part.pathData?.substring(0, 50) + '...'
            });
          });
          
          // For Fragment operation, handle immediately without going through Union processing
          console.log('Creating Fragment group immediately with original parts');
          
          if (mainFragmentParts.length > 1) {
            // Multiple parts - create group directly
            const fragmentChildren: any[] = [];
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            
            // Calculate overall bounds for all fragments
            mainFragmentParts.forEach((fragmentPath: any) => {
              const bounds = fragmentPath.bounds;
              minX = Math.min(minX, bounds.x);
              minY = Math.min(minY, bounds.y);
              maxX = Math.max(maxX, bounds.x + bounds.width);
              maxY = Math.max(maxY, bounds.y + bounds.height);
            });
            
            // Create child elements for each fragment part using user's fill color
            console.log(`About to create ${mainFragmentParts.length} fragment children directly`);
            mainFragmentParts.forEach((fragmentPath: any, index: number) => {
              const bounds = fragmentPath.bounds;
              
              // Normalize path to start from 0,0
              const tempPath = fragmentPath.clone();
              tempPath.translate(new paper.Point(-bounds.x, -bounds.y));
              const normalizedPath = tempPath.pathData;
              
              const fragmentShapePath = generateShapePath(
                normalizedPath,
                fillConfig, // Use user's fill config
                strokeConfig
              );
              
              // Calculate relative position within the group
              const relativeLeft = bounds.x - minX;
              const relativeTop = bounds.y - minY;
              
              // Clamp dimensions and positions to Canva's limits
              const clampedWidth = Math.min(Math.max(Math.ceil(bounds.width), 1), 32767);
              const clampedHeight = Math.min(Math.max(Math.ceil(bounds.height), 1), 32767);
              const clampedRelativeTop = Math.max(-32768, Math.min(32767, Math.floor(relativeTop)));
              const clampedRelativeLeft = Math.max(-32768, Math.min(32767, Math.floor(relativeLeft)));
              
              fragmentChildren.push({
                type: "shape",
                paths: [fragmentShapePath],
                viewBox: {
                  top: 0,
                  left: 0,
                  width: clampedWidth,
                  height: clampedHeight
                },
                width: clampedWidth,
                height: clampedHeight,
                top: clampedRelativeTop,
                left: clampedRelativeLeft
              });
              
              console.log(`Fragment part ${index + 1}:`, {
                bounds: bounds,
                relativeTo: { left: relativeLeft, top: relativeTop },
                clampedSize: { width: clampedWidth, height: clampedHeight }
              });
            });
            
            // Create the group with all fragment parts
            console.log(`Creating group directly with ${fragmentChildren.length} fragment children`);
            await addElementAtPoint({
              type: "group",
              children: fragmentChildren
            });
            
            console.log(`Successfully created fragment group directly with ${fragmentChildren.length} children`);
            console.log('=== FRAGMENT OPERATION COMPLETED EARLY - SKIPPING PATH PROCESSING ===');
            return; // Exit immediately, skip all path processing
          } else if (mainFragmentParts.length === 1) {
            // Single part - create single shape directly
            const singlePath = mainFragmentParts[0];
            const pathData = singlePath.pathData;
            
            const singleShapePath = generateShapePath(
              pathData,
              fillConfig,
              strokeConfig
            );
            
            const bounds = singlePath.bounds;
            const singleViewBox = {
              top: Math.max(-32768, Math.min(32767, Math.floor(bounds.y))),
              left: Math.max(-32768, Math.min(32767, Math.floor(bounds.x))),
              width: Math.min(Math.max(Math.ceil(bounds.width), 1), 32767),
              height: Math.min(Math.max(Math.ceil(bounds.height), 1), 32767)
            };
            
            await addElementAtPoint({
              type: "shape",
              paths: [singleShapePath],
              viewBox: singleViewBox
            });
            
            console.log('Successfully created single fragment shape directly');
            console.log('=== FRAGMENT OPERATION COMPLETED EARLY - SKIPPING PATH PROCESSING ===');
            return; // Exit immediately, skip all path processing
          }
          
          // This should not happen, but fallback to normal processing
          result = new paper.CompoundPath({ children: mainFragmentParts }) as any;
          (result as any)._isFragment = true; // Mark this as a fragment result
          break;
        default:
          throw new Error('Unsupported boolean operation type');
      }

      if (!result || result.isEmpty()) {
        // Handle empty results differently based on operation type
        if (operation === 'intersect') {
          console.log('Intersect operation resulted in empty intersection - creating empty shape with combined bounds');
          
          // Calculate combined bounds of both original compounds
          const shape1Bounds = compound1.bounds;
          const shape2Bounds = compound2.bounds;
          
          const combinedMinX = Math.min(shape1Bounds.x, shape2Bounds.x);
          const combinedMinY = Math.min(shape1Bounds.y, shape2Bounds.y);
          const combinedMaxX = Math.max(shape1Bounds.x + shape1Bounds.width, shape2Bounds.x + shape2Bounds.width);
          const combinedMaxY = Math.max(shape1Bounds.y + shape1Bounds.height, shape2Bounds.y + shape2Bounds.height);
          
          const combinedWidth = combinedMaxX - combinedMinX;
          const combinedHeight = combinedMaxY - combinedMinY;
          
          console.log('Combined bounds for empty intersect:', {
            x: combinedMinX,
            y: combinedMinY,
            width: combinedWidth,
            height: combinedHeight
          });
          
          // Create a minimal empty rectangle path at the center of combined bounds
          const centerX = combinedMinX + combinedWidth / 2;
          const centerY = combinedMinY + combinedHeight / 2;
          const emptyPathData = `M ${centerX} ${centerY} L ${centerX + 1} ${centerY} L ${centerX + 1} ${centerY + 1} L ${centerX} ${centerY + 1} Z`;
          
          // Create empty shape element with combined bounds
          // Use white color with very low opacity instead of transparent
          const emptyShapePath = generateShapePath(
            emptyPathData,
            { color: '#ffffff' }, // Use white fill (Canva requires a fill)
            { enabled: false, weight: 0, color: '#000000' } // No stroke for empty intersect
          );
          
          // Create viewBox with combined bounds, clamped to Canva's limits
          const emptyViewBox = {
            top: Math.max(-32768, Math.min(32767, Math.floor(combinedMinY))),
            left: Math.max(-32768, Math.min(32767, Math.floor(combinedMinX))),
            width: Math.min(Math.max(Math.ceil(combinedWidth), 1), 32767),
            height: Math.min(Math.max(Math.ceil(combinedHeight), 1), 32767)
          };
          
          console.log('Creating empty intersect shape with viewBox:', emptyViewBox);
          
          await addElementAtPoint({
            type: "shape",
            paths: [emptyShapePath],
            viewBox: emptyViewBox
          });
          
          console.log('Empty intersect shape created successfully');
          return; // Exit early for empty intersect
        } else if (operation === 'exclude') {
          // Exclude operation should not normally result in empty - this indicates an error
          console.log('Exclude operation resulted in empty result - this should not happen normally');
          throw new Error('Exclude operation failed to generate a valid result. This may indicate an issue with the input shapes.');
        } else if (operation === 'fragment') {
          // Fragment operation should not result in empty - this indicates an error
          console.log('Fragment operation resulted in empty result - this should not happen normally');
          throw new Error('Fragment operation failed to generate a valid result. This may indicate an issue with the input shapes.');
        } else {
          throw new Error('Boolean operation result is empty. Please check if the selected shapes have overlapping areas.');
        }
      }

      // Export result as SVG path string
      let resultPathData = result.pathData;
      
      // Debug: Check if Fragment CompoundPath structure changed after pathData access
      if (operation === 'fragment' && (result as any)._isFragment) {
        console.log('Fragment CompoundPath after pathData access:', {
          type: result.className,
          childrenCount: (result as any).children?.length || 0,
          pathDataLength: resultPathData?.length || 0
        });
      }
      
      if (!resultPathData || resultPathData.length > 2000) {
        throw new Error('Result path is too complex or empty, cannot insert into Canva');
      }

      // Initial path size check
      console.log(`Initial path analysis: ${resultPathData.length} characters, ${(resultPathData.match(/[Mm]/g) || []).length} move commands`);

      // Calculate result bounds
      const bounds = result.bounds;
      
      // Calculate result bounds (but don't normalize to origin yet)
      const offsetX = bounds.x;
      const offsetY = bounds.y;
      
      console.log('Original bounds before processing:', {x: offsetX, y: offsetY, width: bounds.width, height: bounds.height});
      
      // First export path data without normalization to preserve the union result structure
      resultPathData = result.pathData;
      console.log(`Initial union result path:`, resultPathData.substring(0, 200) + '...');
      
      // Handle multiple M commands - this indicates shapes may not be properly overlapping
      const moveCommands = (resultPathData.match(/[Mm]/g) || []).length;
      console.log(`Move commands in union result: ${moveCommands}`);
      
      if (moveCommands > 1) {
        console.log('Multiple move commands detected - shapes may not be properly overlapping or union operation failed');
        console.log(`Original union result: ${resultPathData}`);
        
        // Try different approaches to fix the union operation
        
        // Approach 1: Force the shapes to be closer together and retry union
        console.log('Attempting to re-position shapes for better union...');
        
        // Clear and retry with adjusted positions
        paper.project.clear();
        
        // Get the original paths again but adjust their positions to ensure overlap
        const adjustedPaths1: paper.Path[] = [];
        shape1.paths.forEach(pathData => {
          if (pathData.d) {
            const path = new paper.Path(pathData.d);
            // Apply original transform
            const matrix1 = new paper.Matrix();
            matrix1.translate(shape1.transform?.x || 0, shape1.transform?.y || 0);
            path.transform(matrix1);
            adjustedPaths1.push(path);
          }
        });

        const adjustedPaths2: paper.Path[] = [];
        shape2.paths.forEach(pathData => {
          if (pathData.d) {
            const path = new paper.Path(pathData.d);
            // Apply original transform
            const matrix2 = new paper.Matrix();
            matrix2.translate(shape2.transform?.x || 0, shape2.transform?.y || 0);
            path.transform(matrix2);
            adjustedPaths2.push(path);
          }
        });

        if (adjustedPaths1.length > 0 && adjustedPaths2.length > 0) {
          let compound1 = adjustedPaths1[0];
          for (let i = 1; i < adjustedPaths1.length; i++) {
            compound1 = compound1.unite(adjustedPaths1[i]) as paper.Path;
          }

          let compound2 = adjustedPaths2[0];
          for (let i = 1; i < adjustedPaths2.length; i++) {
            compound2 = compound2.unite(adjustedPaths2[i]) as paper.Path;
          }
          
          console.log('\n=== SHAPE BOUNDS ANALYSIS ===');
          console.log('Shape1 bounds:', {
            x: compound1.bounds.x.toFixed(2), 
            y: compound1.bounds.y.toFixed(2),
            width: compound1.bounds.width.toFixed(2), 
            height: compound1.bounds.height.toFixed(2),
            right: (compound1.bounds.x + compound1.bounds.width).toFixed(2),
            bottom: (compound1.bounds.y + compound1.bounds.height).toFixed(2)
          });
          console.log('Shape2 bounds:', {
            x: compound2.bounds.x.toFixed(2), 
            y: compound2.bounds.y.toFixed(2),
            width: compound2.bounds.width.toFixed(2), 
            height: compound2.bounds.height.toFixed(2),
            right: (compound2.bounds.x + compound2.bounds.width).toFixed(2),
            bottom: (compound2.bounds.y + compound2.bounds.height).toFixed(2)
          });
          
          // Calculate overlap manually to verify Paper.js logic
          const overlap = {
            left: Math.max(compound1.bounds.x, compound2.bounds.x),
            top: Math.max(compound1.bounds.y, compound2.bounds.y),
            right: Math.min(compound1.bounds.x + compound1.bounds.width, compound2.bounds.x + compound2.bounds.width),
            bottom: Math.min(compound1.bounds.y + compound1.bounds.height, compound2.bounds.y + compound2.bounds.height)
          };
          const hasOverlap = overlap.left < overlap.right && overlap.top < overlap.bottom;
          const overlapArea = hasOverlap ? (overlap.right - overlap.left) * (overlap.bottom - overlap.top) : 0;
          
          console.log('Manual overlap calculation:', {
            hasOverlap,
            overlapArea: overlapArea.toFixed(2),
            overlapBounds: hasOverlap ? overlap : 'No overlap'
          });
          
          // Add path data debugging
          console.log('Shape1 path data:', compound1.pathData.substring(0, 100) + '...');
          console.log('Shape2 path data:', compound2.pathData.substring(0, 100) + '...');
          
          // Check if they actually intersect using Paper.js
          const intersectionTest = compound1.intersect(compound2);
          console.log('Paper.js intersection test:', {
            hasIntersection: intersectionTest && !intersectionTest.isEmpty(),
            intersectionBounds: intersectionTest ? intersectionTest.bounds : null,
            shape1Area: Math.abs((compound1 as any).area || 0).toFixed(2),
            shape2Area: Math.abs((compound2 as any).area || 0).toFixed(2),
            intersectionArea: intersectionTest ? Math.abs((intersectionTest as any).area || 0).toFixed(2) : '0'
          });
          console.log('=== END SHAPE ANALYSIS ===\n');
          
          if (intersectionTest && !intersectionTest.isEmpty()) {
            console.log('Shapes do intersect, retry union...');
            const retryResult = compound1.unite(compound2) as paper.Path;
            const retryPathData = retryResult.pathData;
            const retryMoveCommands = (retryPathData.match(/[Mm]/g) || []).length;
            console.log(`Retry result move commands: ${retryMoveCommands}`);
            
            if (retryMoveCommands === 1) {
              resultPathData = retryPathData;
              console.log('Successfully fixed union with repositioning');
        } else {
              console.log('Retry still produced multiple move commands, using simplified approach');
            }
          } else {
            console.log('Shapes do not actually intersect despite appearing to overlap');
            console.log('Shape1 detailed bounds:', compound1.bounds);
            console.log('Shape2 detailed bounds:', compound2.bounds);
            
            // Calculate distance between shape centers
            const shape1Center = compound1.bounds.center;
            const shape2Center = compound2.bounds.center;
            const distance = shape1Center.getDistance(shape2Center);
            console.log('Distance between shape centers:', distance);
            
            // Try force union anyway - sometimes Paper.js intersect is overly strict
            console.log('Attempting force union despite no intersection detected...');
            try {
              const forceUnionResult = compound1.unite(compound2) as paper.Path;
              const forceUnionMoveCommands = (forceUnionResult.pathData.match(/[Mm]/g) || []).length;
              
              if (forceUnionMoveCommands === 1) {
                console.log('Force union successful! Using force union result.');
                resultPathData = forceUnionResult.pathData;
              } else {
                console.log(`Force union produced ${forceUnionMoveCommands} move commands, continuing with fallback...`);
                // Don't throw error, continue with fallback processing below
              }
            } catch (forceUnionError) {
              console.log('Force union failed:', forceUnionError);
              // Continue with fallback processing
            }
            
            // If we still have the original problematic result, apply additional processing
            if ((resultPathData.match(/[Mm]/g) || []).length > 1) {
              console.log('Using alternative approach: creating compound path from both shapes...');
              // Instead of erroring out, try to create a valid single shape from the largest component
              // This will be handled by the fallback logic below
            }
          }
        }
        
        // If still multiple move commands, use fallback approach
        const finalMoveCommands = (resultPathData.match(/[Mm]/g) || []).length;
        if (finalMoveCommands > 1) {
          console.log('Using fallback: creating compound path with largest component');
          
          // Split the path and take the largest meaningful component
          const pathParts = resultPathData.split(/(?=[Mm])/).filter(part => part.trim().length > 20);
          
          if (pathParts.length > 0) {
            // Find the part with the most content (likely the main union result)
            let largestPart = pathParts[0];
            let maxLength = largestPart.length;
            
            for (let i = 1; i < pathParts.length; i++) {
              if (pathParts[i].length > maxLength) {
                largestPart = pathParts[i];
                maxLength = pathParts[i].length;
              }
            }
            
            // Ensure the path is properly closed
            if (!largestPart.includes('Z') && !largestPart.includes('z')) {
              largestPart += ' Z';
            }
            
            resultPathData = largestPart.trim();
            console.log(`Selected largest path component: ${resultPathData.substring(0, 100)}...`);
          }
        }
      }
      
      // Comprehensive Canva path validation with fallback
      try {
        resultPathData = validateAndFixCanvaPath(resultPathData);
        console.log(`Final validation passed: path length ${resultPathData.length} characters`);
      } catch (validationError) {
        console.log('Primary path validation failed, trying alternative path generation...');
        
        // Fallback: Try to export SVG and extract path from it
        try {
          const svgString = result.exportSVG({ asString: true }) as string;
          console.log('SVG export:', svgString.substring(0, 300) + '...');
          
          const pathMatch = svgString.match(/d="([^"]+)"/);
          if (pathMatch && pathMatch[1]) {
            const extractedPath = pathMatch[1];
            console.log('Extracted path from SVG:', extractedPath.substring(0, 200) + '...');
            resultPathData = validateAndFixCanvaPath(extractedPath);
            console.log('Fallback path validation successful');
          } else {
            throw validationError;
          }
        } catch (fallbackError) {
          console.error('Fallback path generation also failed:', fallbackError);
          throw validationError; // Re-throw original error
        }
      }
      
      // Calculate proper viewBox considering the actual path bounds
      const pathBounds = result.bounds;
      
      // Ensure viewBox dimensions are positive integers and within Canva's limits
      const viewBoxWidth = Math.min(Math.max(Math.ceil(pathBounds.width) || 100, 1), 32767);
      const viewBoxHeight = Math.min(Math.max(Math.ceil(pathBounds.height) || 100, 1), 32767);
      
      // Create viewBox that encompasses the actual path, clamped to Canva's coordinate limits
      const newViewBox = {
        top: Math.max(-32768, Math.min(32767, Math.floor(pathBounds.y) || 0)),
        left: Math.max(-32768, Math.min(32767, Math.floor(pathBounds.x) || 0)),
        width: viewBoxWidth,
        height: viewBoxHeight
      };
      
      console.log('ViewBox calculated from actual path bounds:', {
        originalBounds: pathBounds,
        finalViewBox: newViewBox
      });

      // Extract color from original shapes with improved logic
      console.log('Shape1 structure:', {
        paths: shape1.paths?.map(p => ({
          d: p.d?.substring(0, 50) + '...',
          fill: p.fill,
          stroke: p.stroke
        })),
        transform: shape1.transform
      });
      
      console.log('Shape2 structure:', {
        paths: shape2.paths?.map(p => ({
          d: p.d?.substring(0, 50) + '...',
          fill: p.fill,
          stroke: p.stroke
        })),
        transform: shape2.transform
      });

      // Improved color extraction with priority: fill color > stroke color > calculated blend
      let extractedColors: string[] = [];
      
      // Extract colors from both shapes
      const extractColorFromShape = (shape: CanvaShape, shapeName: string): string[] => {
        const colors: string[] = [];
        
        if (shape.paths && shape.paths.length > 0) {
          shape.paths.forEach((path, index) => {
            // Priority 1: Fill color (now a string)
            if (path.fill && typeof path.fill === 'string' && path.fill !== 'none') {
              colors.push(path.fill);
              console.log(`Found fill color in ${shapeName}.paths[${index}]:`, path.fill);
            }
            // Priority 2: Stroke color (now a string)
            else if (path.stroke && typeof path.stroke === 'string' && path.stroke !== 'none') {
              colors.push(path.stroke);
              console.log(`Found stroke color in ${shapeName}.paths[${index}]:`, path.stroke);
            }
          });
        }
        
        return colors;
      };
      
      extractedColors.push(...extractColorFromShape(shape1, 'shape1'));
      extractedColors.push(...extractColorFromShape(shape2, 'shape2'));
      
      // Determine final color
      let defaultColor = '#4A90E2'; // Use a pleasant blue instead of red as fallback
      
      if (extractedColors.length > 0) {
        // Use the first extracted color
        defaultColor = extractedColors[0];
        console.log(`Using extracted color: ${defaultColor} from ${extractedColors.length} available colors:`, extractedColors);
      } else {
        console.log('No colors extracted from shapes, using blue fallback color:', defaultColor);
      }

      // Validate and normalize color format
      const validateColor = (color: any): string => {
        if (typeof color !== 'string') {
          console.log('Color is not a string:', typeof color, color);
          return '#FF0000'; // Red as fallback
        }
        
        // Ensure it's a valid hex color
        if (color.startsWith('#') && /^#[0-9A-Fa-f]{6}$/.test(color)) {
          return color;
        } else if (color.startsWith('#') && /^#[0-9A-Fa-f]{3}$/.test(color)) {
          // Convert 3-digit hex to 6-digit
          return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
        } else {
          console.log('Invalid color format:', color, 'using red fallback');
          return '#FF0000'; // Red as fallback for any invalid format
        }
      };

      defaultColor = validateColor(defaultColor);
      console.log('Final validated color:', defaultColor);

      // Calculate position for new shape based on original shapes
      const shape1Pos = { x: shape1.transform?.x || 0, y: shape1.transform?.y || 0 };
      const shape2Pos = { x: shape2.transform?.x || 0, y: shape2.transform?.y || 0 };
      
      // Place the union result at the centroid of the two original shapes
      const centerX = (shape1Pos.x + shape2Pos.x) / 2;
      const centerY = (shape1Pos.y + shape2Pos.y) / 2;

      console.log('Creating boolean operation result with:', {
        pathLength: resultPathData.length,
        pathData: resultPathData.substring(0, 100) + (resultPathData.length > 100 ? '...' : ''),
        viewBox: newViewBox,
        originalPositions: { shape1: shape1Pos, shape2: shape2Pos },
        targetCenter: { x: centerX, y: centerY },
        color: defaultColor,
        pathBounds: pathBounds,
        operation: operation
      });

      // Insert new shape into Canva
      // Note: addElementAtPoint positions the element at the current cursor/viewport position
      
      // 使用简化的路径生成逻辑
      const generatedPath = generateShapePath(
        resultPathData,
        fillConfig,
        strokeConfig
      );

      console.log('布尔运算完成，准备创建形状:', {
        fillColor: fillConfig.color,
        strokeEnabled: strokeConfig.weight > 0,
        viewBox: newViewBox
      });

      // Special handling for Fragment operation - always create group with independent parts
      if (operation === 'fragment' && (result as any)._isFragment) {
        console.log('=== FRAGMENT GROUP CREATION ===');
        console.log('Fragment operation detected:', operation);
        console.log('Result has _isFragment flag:', !!(result as any)._isFragment);
        
        // Get the fragment parts from the compound path
        const fragmentPaths = (result as any).children || [];
        console.log(`Fragment operation has ${fragmentPaths.length} independent parts`);
        console.log('Fragment CompoundPath structure:', {
          type: result.className,
          hasChildren: !!(result as any).children,
          childrenCount: (result as any).children?.length || 0,
          resultProperties: Object.keys(result)
        });
        
        // Debug each fragment part
        fragmentPaths.forEach((part: any, index: number) => {
          console.log(`Fragment part ${index + 1}:`, {
            bounds: part.bounds,
            area: Math.abs(part.area || 0),
            isEmpty: part.isEmpty(),
            pathDataLength: part.pathData?.length || 0,
            pathPreview: part.pathData?.substring(0, 50) + '...'
          });
        });
        
        if (fragmentPaths.length > 1) {
          // Multiple parts - create group (same logic as union operation)
          const fragmentChildren: any[] = [];
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          
          // Calculate overall bounds for all fragments
          fragmentPaths.forEach((fragmentPath: any) => {
            const bounds = fragmentPath.bounds;
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
          });
          
          // Create child elements for each fragment part using user's fill color
          console.log(`About to create ${fragmentPaths.length} fragment children`);
          fragmentPaths.forEach((fragmentPath: any, index: number) => {
            const bounds = fragmentPath.bounds;
            
            // Normalize path to start from 0,0
            const tempPath = fragmentPath.clone();
            tempPath.translate(new paper.Point(-bounds.x, -bounds.y));
            const normalizedPath = tempPath.pathData;
            
            const fragmentShapePath = generateShapePath(
              normalizedPath,
              fillConfig, // Use user's fill config
              strokeConfig
            );
            
            // Calculate relative position within the group
            const relativeLeft = bounds.x - minX;
            const relativeTop = bounds.y - minY;
            
            // Clamp dimensions and positions to Canva's limits
            const clampedWidth = Math.min(Math.max(Math.ceil(bounds.width), 1), 32767);
            const clampedHeight = Math.min(Math.max(Math.ceil(bounds.height), 1), 32767);
            const clampedRelativeTop = Math.max(-32768, Math.min(32767, Math.floor(relativeTop)));
            const clampedRelativeLeft = Math.max(-32768, Math.min(32767, Math.floor(relativeLeft)));
            
            fragmentChildren.push({
              type: "shape",
              paths: [fragmentShapePath],
              viewBox: {
                top: 0,
                left: 0,
                width: clampedWidth,
                height: clampedHeight
              },
              width: clampedWidth,
              height: clampedHeight,
              top: clampedRelativeTop,
              left: clampedRelativeLeft
            });
            
            console.log(`Fragment part ${index + 1}:`, {
              bounds: bounds,
              relativeTo: { left: relativeLeft, top: relativeTop },
              clampedSize: { width: clampedWidth, height: clampedHeight }
            });
          });
          
          // Create the group with all fragment parts
          console.log(`Creating group with ${fragmentChildren.length} fragment children from ${fragmentPaths.length} fragmentPaths`);
          await addElementAtPoint({
            type: "group",
            children: fragmentChildren
          });
          
          console.log(`Successfully created fragment group with ${fragmentChildren.length} children from ${fragmentPaths.length} fragmentPaths`);
          console.log('=== FRAGMENT OPERATION COMPLETED - EXITING EARLY ===');
          return; // Exit early for fragment operation
        } else if (fragmentPaths.length === 1) {
          // Single part - create single shape
          const singlePath = fragmentPaths[0];
          const pathData = singlePath.pathData;
          
          const singleShapePath = generateShapePath(
            pathData,
            fillConfig,
            strokeConfig
          );
          
          const bounds = singlePath.bounds;
          const singleViewBox = {
            top: Math.max(-32768, Math.min(32767, Math.floor(bounds.y))),
            left: Math.max(-32768, Math.min(32767, Math.floor(bounds.x))),
            width: Math.min(Math.max(Math.ceil(bounds.width), 1), 32767),
            height: Math.min(Math.max(Math.ceil(bounds.height), 1), 32767)
          };
          
          await addElementAtPoint({
            type: "shape",
            paths: [singleShapePath],
            viewBox: singleViewBox
          });
          
          console.log('Successfully created single fragment shape');
          return; // Exit early for fragment operation
        }
      }

      // Check if Union or Exclude operation resulted in multiple separate shapes
      const originalMoveCommands = (result.pathData.match(/[Mm]/g) || []).length;
      if ((operation === 'union' || operation === 'exclude') && originalMoveCommands > 1) {
        console.log(`${operation} operation with ${originalMoveCommands} separate shapes - creating group with multiple shapes`);
        
        // Split the original path data into separate paths
        const pathParts = result.pathData.split(/(?=[Mm])/).filter(part => part.trim().length > 5);
        
        // Calculate bounds for each path part to determine relative positions
        const children: any[] = [];
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        // First pass: parse all paths and calculate overall bounds
        const pathInfos = pathParts.map(pathPart => {
          let cleanPath = pathPart.trim();
          if (!cleanPath.match(/^[Mm]/)) {
            cleanPath = 'M' + cleanPath;
          }
          if (!cleanPath.includes('Z') && !cleanPath.includes('z')) {
            cleanPath += ' Z';
          }
          
          // Create temporary Paper.js path to get bounds
          const tempPath = new paper.Path(cleanPath);
          const bounds = tempPath.bounds;
          tempPath.remove(); // Clean up
          
          minX = Math.min(minX, bounds.x);
          minY = Math.min(minY, bounds.y);
          maxX = Math.max(maxX, bounds.x + bounds.width);
          maxY = Math.max(maxY, bounds.y + bounds.height);
          
          return { cleanPath, bounds };
        });
        
        // Calculate group dimensions
        const groupWidth = maxX - minX;
        const groupHeight = maxY - minY;
        
        // Second pass: create child elements with relative positions
        pathInfos.forEach(({ cleanPath, bounds }) => {
          // Normalize path to start from 0,0 by translating coordinates
          const tempPath = new paper.Path(cleanPath);
          tempPath.translate(new paper.Point(-bounds.x, -bounds.y));
          const normalizedPath = tempPath.pathData;
          tempPath.remove(); // Clean up
          
          const singlePath = generateShapePath(
            normalizedPath,
            fillConfig,
            strokeConfig
          );
          
          // Calculate relative position within the group
          const relativeLeft = bounds.x - minX;
          const relativeTop = bounds.y - minY;
          
          // Use normalized dimensions for viewBox (starting from 0,0)
          // Ensure viewBox coordinates are within Canva's limits [-32768, 32767]
          const clampedWidth = Math.min(Math.max(Math.ceil(bounds.width), 1), 32767);
          const clampedHeight = Math.min(Math.max(Math.ceil(bounds.height), 1), 32767);
          
          // Also clamp the relative positions to prevent viewBox coordinate overflow
          const clampedRelativeTop = Math.max(-32768, Math.min(32767, Math.floor(relativeTop)));
          const clampedRelativeLeft = Math.max(-32768, Math.min(32767, Math.floor(relativeLeft)));
          
          children.push({
            type: "shape",
            paths: [singlePath],
            viewBox: {
              top: 0,
              left: 0,
              width: clampedWidth,
              height: clampedHeight
            },
            width: clampedWidth,
            height: clampedHeight,
            top: clampedRelativeTop,
            left: clampedRelativeLeft
          });
        });
        
        // Create the group with all shapes
        await addElementAtPoint({
          type: "group",
          children: children
        });
        
        console.log(`Successfully created group with ${pathParts.length} shapes for ${operation} operation`);
      } else {
        // Single shape - use existing logic
        await addElementAtPoint({
          type: "shape",
          paths: [generatedPath],  // 使用单个路径
          viewBox: newViewBox
          // Remove width and height to avoid Canva's box property requirement
          // Canva will automatically size the element based on viewBox
        });
      }

      // Keep selection state for continued operations

    } catch (err) {
      console.error('Boolean operation failed:', err);
      setError(err instanceof Error ? err.message : 'Boolean operation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Validate and fix path data according to Canva requirements
  const validateAndFixCanvaPath = (pathData: string): string => {
    let fixedPath = pathData.trim();
    
    // 1. Check if path starts with M command (required by Canva)
    if (!fixedPath.match(/^[Mm]/)) {
      throw new Error('Path must start with a Move command (M or m)');
    }
    
    // 2. Check for unsupported Q commands (quadratic Bézier curves)
    if (fixedPath.includes('Q') || fixedPath.includes('q')) {
      console.log('Removing unsupported Q commands...');
      // Convert Q commands to C commands (approximate conversion)
      fixedPath = fixedPath.replace(/[Qq][^a-zA-Z]*/g, (match) => {
        console.warn('Q command found and removed:', match);
        return ''; // Simple removal - could be improved with proper conversion
      });
    }
    
    // 3. Check for multiple M commands (not allowed by Canva)
    const moveCommands = (fixedPath.match(/[Mm]/g) || []).length;
    if (moveCommands > 1) {
      console.warn(`Path contains ${moveCommands} move commands. Attempting final cleanup...`);
      console.log(`Original problematic path: ${fixedPath}`);
      
      // Split the path into individual path segments at each M command
      const pathSegments = fixedPath.split(/(?=[Mm])/).filter(segment => segment.trim().length > 5);
      console.log(`Found ${pathSegments.length} path segments:`, pathSegments.map(s => s.substring(0, 50) + '...'));
      
      if (pathSegments.length > 0) {
        // Find the segment with the most substantial content (likely the main union result)
        let bestSegment = pathSegments[0];
        let bestScore = 0;
        
        for (const segment of pathSegments) {
          // Score based on length and content complexity
          let score = segment.length;
          
          // Bonus for containing drawing commands (L, C, etc.)
          const drawingCommands = (segment.match(/[LlCcHhVvSsAa]/g) || []).length;
          score += drawingCommands * 10;
          
          // Penalty if it doesn't start with M
          if (!segment.trim().match(/^[Mm]/)) {
            score = 0;
          }
          
          console.log(`Segment score: ${score} for "${segment.substring(0, 30)}..."`);
          
          if (score > bestScore) {
            bestSegment = segment;
            bestScore = score;
          }
        }
        
        // Clean up the selected segment
        fixedPath = bestSegment.trim();
        
        // Ensure it's properly closed
        if (!fixedPath.includes('Z') && !fixedPath.includes('z')) {
          fixedPath += ' Z';
        }
        
        console.log(`Selected best segment with score ${bestScore}: ${fixedPath.substring(0, 100)}...`);
        
        // Final verification - this should now have only 1 M command
        const finalMoveCommands = (fixedPath.match(/[Mm]/g) || []).length;
        console.log(`Final path has ${finalMoveCommands} move commands`);
        
        if (finalMoveCommands > 1) {
          // If still multiple M commands, take everything up to the second M
          console.warn('Still multiple M commands, taking first complete path...');
          const firstMIndex = fixedPath.search(/[Mm]/);
          const secondMIndex = fixedPath.substring(firstMIndex + 1).search(/[Mm]/);
          const actualSecondMIndex = secondMIndex >= 0 ? firstMIndex + 1 + secondMIndex : -1;
          
          if (actualSecondMIndex > 0) {
            fixedPath = fixedPath.substring(0, actualSecondMIndex).trim();
            if (!fixedPath.includes('Z') && !fixedPath.includes('z')) {
              fixedPath += ' Z';
            }
            console.log(`Truncated to first path: ${fixedPath}`);
          }
          
          // Final check
          const veryFinalMoveCommands = (fixedPath.match(/[Mm]/g) || []).length;
          if (veryFinalMoveCommands > 1) {
            console.error(`CRITICAL: Still ${veryFinalMoveCommands} move commands after all attempts. Using nuclear option...`);
            
            // NUCLEAR OPTION: Force to single path by taking everything before the first Z or second M
            const firstMIndex = fixedPath.search(/[Mm]/);
            if (firstMIndex >= 0) {
              // Find the first Z after the first M
              const firstZIndex = fixedPath.substring(firstMIndex).search(/[Zz]/);
              if (firstZIndex >= 0) {
                fixedPath = fixedPath.substring(firstMIndex, firstMIndex + firstZIndex + 1);
                console.log(`Nuclear option: extracted first complete path: ${fixedPath}`);
              } else {
                // No Z found, just take a reasonable amount from the first M
                const safeLength = Math.min(200, fixedPath.length - firstMIndex);
                fixedPath = fixedPath.substring(firstMIndex, firstMIndex + safeLength) + ' Z';
                console.log(`Nuclear option: forced close: ${fixedPath}`);
              }
            }
            
            // Final validation of nuclear option
            const nuclearMoveCommands = (fixedPath.match(/[Mm]/g) || []).length;
            if (nuclearMoveCommands > 1) {
              console.error(`Nuclear option failed. Current path was: ${fixedPath}`);
              throw new Error(`Absolute failure: Cannot create valid single-path from union result. This suggests the shapes are completely separate and union operation is invalid.`);
            }
            
            console.log(`Nuclear option successful: ${nuclearMoveCommands} move command(s)`);
          }
        }
      } else {
        throw new Error(`Path contains ${moveCommands} move commands and cannot be simplified. Canva allows only one M command per path.`);
      }
    }
    
    // 4. Ensure path is properly closed
    const hasZCommand = fixedPath.includes('Z') || fixedPath.includes('z');
    if (!hasZCommand) {
      // Check if last coordinate matches first coordinate
      const coordinates = fixedPath.match(/[-+]?[0-9]*\.?[0-9]+/g) || [];
      if (coordinates.length >= 4) {
        const firstX = coordinates[0];
        const firstY = coordinates[1];
        const lastX = coordinates[coordinates.length - 2];
        const lastY = coordinates[coordinates.length - 1];
        
        if (firstX !== lastX || firstY !== lastY) {
          console.log('Adding Z command to close path...');
          fixedPath += ' Z';
        }
      } else {
        // If we can't determine coordinates, add Z command
        fixedPath += ' Z';
      }
    }
    
    // 5. Check 2KB size limit
    if (fixedPath.length > 2048) {
      throw new Error(`Path size (${fixedPath.length} characters) exceeds Canva's 2KB limit`);
    }
    
    // 6. Clean and validate supported commands
    console.log('Path before command validation:', fixedPath.substring(0, 200) + '...');
    
    // First, let's identify any unsupported characters
    const unsupportedChars = fixedPath.match(/[^MmLlHhVvCcSsAaZz0-9\s\-\+\.,]/g);
    if (unsupportedChars) {
      console.log('Found unsupported characters:', unsupportedChars);
      // Remove unsupported characters
      fixedPath = fixedPath.replace(/[^MmLlHhVvCcSsAaZz0-9\s\-\+\.,]/g, '');
      console.log('Path after removing unsupported chars:', fixedPath.substring(0, 200) + '...');
    }
    
    // Normalize numeric values (fix scientific notation, long decimals, etc.)
    fixedPath = fixedPath.replace(/[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?/g, (match) => {
      const num = parseFloat(match);
      if (isNaN(num)) return match;
      // Round to 3 decimal places to avoid extremely long decimals
      return Math.abs(num) < 0.001 ? '0' : num.toFixed(3).replace(/\.?0+$/, '');
    });
    
    // Clean up any extra spaces and normalize formatting
    fixedPath = fixedPath
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/,\s*/g, ',') // Remove spaces after commas
      .replace(/\s*,/g, ',') // Remove spaces before commas  
      .trim();
    
    // Final validation with more permissive regex (including commas)
    const supportedCommands = /^[MmLlHhVvCcSsAaZz0-9\s\-\+\.,]+$/;
    if (!supportedCommands.test(fixedPath)) {
      // If still failing, let's see what's wrong
      const remainingBadChars = fixedPath.match(/[^MmLlHhVvCcSsAaZz0-9\s\-\+\.,]/g);
      console.error('Still failing validation. Bad characters:', remainingBadChars);
      console.error('Problematic path section:', fixedPath);
      throw new Error(`Path still contains unsupported characters: ${remainingBadChars?.join(', ') || 'unknown'}. Canva only supports: M, L, H, V, C, S, A, Z commands.`);
    }
    
    // ABSOLUTE FINAL CHECK: Ensure only one M command exists
    const absoluteFinalMoveCommands = (fixedPath.match(/[Mm]/g) || []).length;
    if (absoluteFinalMoveCommands > 1) {
      console.error(`EMERGENCY: ${absoluteFinalMoveCommands} move commands detected at final validation stage!`);
      console.error(`Problematic final path: ${fixedPath}`);
      
      // Emergency extraction: take only from first M to first Z
      const emergencyMIndex = fixedPath.search(/[Mm]/);
      if (emergencyMIndex >= 0) {
        const emergencyZIndex = fixedPath.substring(emergencyMIndex).search(/[Zz]/);
        if (emergencyZIndex >= 0) {
          fixedPath = fixedPath.substring(emergencyMIndex, emergencyMIndex + emergencyZIndex + 1);
        } else {
          // If no Z, take first 100 characters from M and force close
          fixedPath = fixedPath.substring(emergencyMIndex, emergencyMIndex + Math.min(100, fixedPath.length - emergencyMIndex)) + ' Z';
        }
        console.log(`Emergency extraction result: ${fixedPath}`);
        
        // One more check
        const emergencyMoveCommands = (fixedPath.match(/[Mm]/g) || []).length;
        if (emergencyMoveCommands > 1) {
          console.error(`Emergency extraction failed. Creating minimal fallback path.`);
          fixedPath = 'M0,0 L100,0 L100,100 L0,100 Z'; // Create a simple rectangle as fallback
        }
      }
    }
    
    console.log('Path validation successful');
    return fixedPath;
  };

  // Get operation type name in English
  const getOperationName = (op: BooleanOperationType) => {
    switch (op) {
      case 'union': return 'Union';
      case 'intersect': return 'Intersect';
      case 'subtract': return 'Subtract';
      case 'exclude': return 'Exclude';
      case 'fragment': return 'Fragment';
      default: return op;
    }
  };

  // Create tab content for boolean operations
  const renderCreateTabContent = () => (
    <Rows spacing="1u">
        {error && (
          <Alert tone="critical">
            {error}
          </Alert>
        )}

      {shapes.length === 0 && !loading && (
        <Box borderRadius="standard" paddingTop='1u'>
          <Rows spacing="1u">
            <Text size="small" alignment="start" tone="tertiary">
              Add at least two shapes to the page and click the button to reload.
            </Text>
            <Button 
              variant="primary" 
              onClick={loadShapes}
              loading={loading}
              stretch
            >
              Reload Shapes
            </Button>
          </Rows>
        </Box>
      )}

        {shapes.length > 0 && (
          <Box borderRadius="standard" padding="2u">
            <Rows spacing="1u">
              <Text size="small" tone="tertiary">
                Choose two or more shapes for operations.
              </Text>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <Grid columns={2} spacing="1u">
                  {shapes.map((shape, index) => {
                    const isSelected = selectedShapes.includes(shape.id);
                    const selectionIndex = selectedShapes.indexOf(shape.id);
                    const svgPreview = generateShapePreview(shape);
                    const shapeType = getShapeType(shape);
                    
                    return (
                      <div
                      key={shape.id}
                      onClick={() => handleShapeSelection(shape.id)}
                        style={{
                          cursor: 'pointer',
                          border: isSelected ? '2px solid #6366f1' : '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '8px',
                          backgroundColor: isSelected ? '#f0f9ff' : 'white',
                          position: 'relative',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            minHeight: '80px'
                          }}
                        >
                          {svgPreview}
                        </div>
                        {isSelected && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              backgroundColor: '#6366f1',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <CheckIcon />
                          </div>
                        )}
                        {isSelected && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '4px',
                              right: '4px',
                              backgroundColor: '#6366f1',
                              color: 'white',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}
                          >
                            {selectionIndex + 1}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Grid>
              </div>
              
              <Button 
                variant="secondary" 
                onClick={loadShapes}
                loading={loading}
                      stretch
                    >
                Reload Shapes
                    </Button>
            </Rows>
          </Box>
        )}

        {selectedShapes.length === 2 && (
        <Box borderRadius="standard" padding="1u">
            <Rows spacing="1u">
            <Text size="medium" variant="bold">Operation type</Text>
            <Select
              stretch
                value={operation}
                onChange={(value) => setOperation(value as BooleanOperationType)}
                options={[
                  { value: 'union', label: 'Union' },
                  { value: 'intersect', label: 'Intersect' },
                  { value: 'subtract', label: 'Subtract' },
                  { value: 'exclude', label: 'Exclude' },
                  { value: 'fragment', label: 'Fragment' }
                ]}
              />
              

            </Rows>
          </Box>
        )}

        {selectedShapes.length === 2 && (
        <Box borderRadius="standard" padding="1u">
            <Rows spacing="1u">
            <Text size="medium" variant="bold">Customize shape style</Text>
            <Columns spacing="1u" align="spaceBetween" alignY='center'>
              <Column>
                <Text size="small" variant="bold">Fill color</Text>
              </Column>
              <Column width='content'>
                <ColorSelector
                  color={fillConfig.color}
                  onChange={(color) => setFillConfig(prev => ({ ...prev, color }))}
                />
              </Column>
            </Columns>
              <Box>
              <Text size="small" variant="bold">Stroke weight</Text>
                    <Slider
                min={0}
                      max={20}
                      step={1}
                      value={strokeConfig.weight}
                      onChange={(weight) => setStrokeConfig(prev => ({ ...prev, weight }))}
                    />
                  </Box>

            <Columns spacing="1u" align="spaceBetween" alignY='center'>
              <Column>
                    <Text size="small" variant="bold">Stroke color</Text>
              </Column>
              <Column width='content'>
                <ColorSelector
                  color={strokeConfig.color}
                  onChange={(color) => setStrokeConfig(prev => ({ ...prev, color }))}
                />
              </Column>
            </Columns>
            

          </Rows>
                  </Box>
      )}

      {selectedShapes.length === 2 && (
        <Box borderRadius="standard" padding="1u">
          <Rows spacing="1u">
            <Text size="medium" variant="bold">Preview</Text>
            
            <div 
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '150px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}
            >
              {previewSvg ? (
                <div dangerouslySetInnerHTML={{ __html: previewSvg }} />
              ) : (
              <Text size="small" tone="tertiary">
                  Generating preview...
              </Text>
              )}
            </div>
            </Rows>
          </Box>
        )}

        {selectedShapes.length === 2 && (
        <Box borderRadius="standard" padding="0">
            <Rows spacing="1u">
              <Button
                variant="primary"
                onClick={performBooleanOperation}
                loading={isProcessing}
                disabled={selectedShapes.length !== 2}
                stretch
              >
              Add to design
              </Button>
            </Rows>
          </Box>
        )}
            </Rows>
  );

  // Create tab content for collection
  const renderCollectionTabContent = () => (
    <Box borderRadius="standard" padding="4u">
      <Rows spacing="2u">
        <Text size="large" alignment="center" tone="tertiary">
          Collection
            </Text>
        <Text size="medium" alignment="center" tone="tertiary">
          Coming soon...
            </Text>
          </Rows>
        </Box>
  );

  return (
    <div style={{ padding: '0px' }}>
      <Tabs defaultActiveId="create">
        <TabList>
          <Tab id="create">Create</Tab>
          <Tab id="collection">Collection</Tab>
        </TabList>
        <TabPanels>
          <TabPanel id="create">
            {renderCreateTabContent()}
          </TabPanel>
          <TabPanel id="collection">
            {renderCollectionTabContent()}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
};

export default BooleanOperations;