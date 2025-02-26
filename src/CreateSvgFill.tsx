// import { getToken,setToken } from "./tokenManager";
// import { performance } from 'perf_hooks';

type coreSvg = {
  url:string,
  viewBoxWidth:number,
  viewBoxHeigh:number,
  iconWidth:number,
  iconHeight:number
};

const createSvgFill = async (
  // iconId:number,
  svgContent: string,
  fillColor: string,
  fillPercentage: number,
  backgroundColor: string // 新增背景色参数
): Promise<coreSvg> => {
  // Create temporary div
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.visibility = 'hidden';
  tempDiv.innerHTML = svgContent;
  document.body.appendChild(tempDiv);

  // Get SVG element
  const svgElement = tempDiv.querySelector('svg');
  if (!svgElement) {
    document.body.removeChild(tempDiv);
    throw new Error('SVG element not found');
  }

  // Get path element
  const pathElement = svgElement.querySelector('path');
  if (!pathElement) {
    document.body.removeChild(tempDiv);
    throw new Error('Path element not found');
  }

  // Get SVG dimensions
  const svgOriginalWidth = parseFloat(svgElement.getAttribute('width') || '0');
  const svgOriginalHeight = parseFloat(svgElement.getAttribute('height') || '0');

  // Get or create viewBox
  let viewBoxWidth, viewBoxHeight;
  const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number);
  if (viewBox && viewBox.length === 4) {
    [, , viewBoxWidth, viewBoxHeight] = viewBox;
  } else {
    viewBoxWidth = Number.isFinite(svgOriginalWidth) ? svgOriginalWidth : 100;
    viewBoxHeight = Number.isFinite(svgOriginalHeight) ? svgOriginalHeight : 100;
    svgElement.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`);
  }

  // Get path bounding box
  const bbox = pathElement.getBBox();
  const width = bbox.width;
  const height = bbox.height;
  const x = bbox.x;
  const y = bbox.y;

  // Now we can remove the temporary div
  document.body.removeChild(tempDiv);

  // Create image from SVG
  const encodedSvg = encodeURIComponent(svgContent);
  const imageSrc = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
  const image = new Image();
  image.src = imageSrc;

  // Create initial canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Set canvas size to viewBox dimensions
  canvas.width = viewBoxWidth;
  canvas.height = viewBoxHeight;

  // Draw SVG on canvas
  await new Promise<void>((resolve, reject) => {
    image.onload = () => {
      ctx.drawImage(image, 0, 0, viewBoxWidth, viewBoxHeight);
      resolve();
    };
    image.onerror = reject;
  });

  // Create final canvas
  const finalCanvas = document.createElement('canvas');
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) {
    throw new Error('Failed to get final canvas context');
  }

  finalCanvas.width = viewBoxWidth;
  finalCanvas.height = viewBoxHeight;

  // Draw background
  finalCtx.drawImage(canvas, 0, 0);
  finalCtx.globalCompositeOperation = 'source-in';
  finalCtx.fillStyle = backgroundColor;
  finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

  // Create and apply gradient
  const gradient = finalCtx.createLinearGradient(0, finalCanvas.height, 0, 0);
  gradient.addColorStop(0, fillColor);
  gradient.addColorStop(fillPercentage / 100, fillColor);
  gradient.addColorStop(fillPercentage / 100, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  finalCtx.globalCompositeOperation = 'source-atop';
  finalCtx.fillStyle = gradient;
  finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

  const svgResult:coreSvg = {
    url: finalCanvas.toDataURL('image/png'),
    viewBoxHeigh: viewBoxHeight,
    viewBoxWidth: viewBoxWidth,
    iconHeight: height,
    iconWidth: width
  }
  // Return the final image data URL
  return svgResult;
};

export default createSvgFill;