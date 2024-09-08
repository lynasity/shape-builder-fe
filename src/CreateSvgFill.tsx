import { getToken,setToken } from "./tokenManager";

type coreSvg = {
  url:string,
  viewBoxWidth:number,
  viewBoxHeigh:number,
  iconWidth:number,
  iconHeight:number
};

const createSvgFill = async (
  iconId:number,
  svgUrl: string,
  fillColor: string,
  fillPercentage: number
): Promise<coreSvg> => {
  // Load SVG from URL
  console.log("开始获取 svg="+svgUrl)
  const token = getToken()
  const params = {
    id: iconId.toString()
  };
  const queryString = new URLSearchParams(params).toString();
  const response = await fetch(`http://localhost:3000/api/icon?${queryString}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    mode: "cors", // 启用跨域请求
  });
  const svgText = await response.text(); 
  // Create a temporary div to hold the SVG for size measurement
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.visibility = 'hidden';
  tempDiv.innerHTML = svgText;
  document.body.appendChild(tempDiv);

  // Extract the SVG element and its dimensions using getBBox
  const svgElement = tempDiv.querySelector('svg');
  if (!svgElement) {
    throw new Error('SVG element not found');
  }

  // Create an SVG path element to get its bounding box
  const pathElement = svgElement.querySelector('path');
  if (!pathElement) {
    throw new Error('Path element not found');
  }

  // Get the bounding box of the path element
  const bbox = pathElement.getBBox();
  const width = bbox.width;
  const height = bbox.height;
  const x = bbox.x;
  const y = bbox.y;

  console.log(`BBox - x: ${x}, y: ${y}, width: ${width}, height: ${height}`);

  document.body.removeChild(tempDiv);

  // Encode the SVG text properly
  const encodedSvg = encodeURIComponent(svgText);
  const imageSrc = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
  const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number);
  if (!viewBox || viewBox.length < 4) {
        throw new Error('Invalid viewBox attribute');
  }

    // Extract width and height from viewBox
  const [ , , viewBoxWidth, viewBoxHeight ] = viewBox;
  console.log(`viewBoxWidth: ${viewBoxWidth}, viewBoxHeight: ${viewBoxHeight}`);

  // Create an image from the SVG
  const image = new Image();
  image.src = imageSrc;

  // Create a canvas to draw the SVG
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  canvas.width = viewBoxWidth;
  canvas.height = viewBoxHeight;

  // Draw the SVG on the canvas
  await new Promise<void>((resolve, reject) => {
    image.onload = () => {
      ctx.drawImage(image, 0, 0, viewBoxWidth,viewBoxHeight); // Offset by x and y
      resolve();
    };
    image.onerror = (error) => reject(error);
  });

  // Create a new canvas for the final image with fill
  const finalCanvas = document.createElement('canvas');
  const finalCtx = finalCanvas.getContext('2d');

  if (!finalCtx) {
    throw new Error('Failed to get final canvas context');
  }

  finalCanvas.width = viewBoxWidth;
  finalCanvas.height = viewBoxHeight;

  // Draw the SVG image on the final canvas for masking
  finalCtx.drawImage(canvas, 0, 0);

  // Create a grayscale version of the SVG
  finalCtx.globalCompositeOperation = 'source-in';
  finalCtx.fillStyle = '#dbdbdb'; // Fill with gray to ensure grayscale
  finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

  // Create a gradient for the fill starting from the bottom
  const gradient = finalCtx.createLinearGradient(x, y+height, x, y);
  gradient.addColorStop(0, fillColor);
  gradient.addColorStop(fillPercentage / 100, fillColor);
  gradient.addColorStop(fillPercentage / 100, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  // Apply the gradient on top of the grayscale image
  finalCtx.globalCompositeOperation = 'source-atop';
  finalCtx.fillStyle = gradient;
  finalCtx.fillRect(x, y, width, height);

  const svgResult:coreSvg = {
    url:finalCanvas.toDataURL('image/png'),
    viewBoxHeigh:viewBoxHeight,
    viewBoxWidth:viewBoxWidth,
    iconHeight:height,
    iconWidth:width
  }
  // Return the final image data URL
  return svgResult;
};

export default createSvgFill;