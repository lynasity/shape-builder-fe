import { getToken } from "./tokenManager";
import { blobToBase64 } from './trasfer';
import {auth} from "@canva/user"

type coreImg = {
  imgUrl: string,
  imgWidth: number,
  imgHeight: number
};

type segment = {
  name: string;
  color: string;
  value: number | undefined;
};

function logTime(start: number, label: string) {
  const end = performance.now();
  console.log(`${label}: ${(end - start).toFixed(2)}ms`);
  return end;
}

async function createPercentFill(
  background: string, 
  segments: segment[], 
  fillPattern: string, 
  removeBackground: boolean,
  transparency: number
): Promise<coreImg> {
  let startTime = performance.now();
  let lastTime = startTime;

  try {
    const token = await auth.getCanvaUserToken();

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("无法获取 CanvasRenderingContext2D");
    }
    lastTime = logTime(lastTime, "创建 canvas");

    let imgbase64;

    if (removeBackground) {
      // 只有在需要移除背景时才调用抠图接口
      const response = await fetch("https://percentfill-backend--partfill.us-central1.hosted.app/api/cutout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        mode: "cors",
        body: JSON.stringify({ image: background }),
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const imgBlob = await response.blob();
      lastTime = logTime(lastTime, "获取 Blob");

      imgbase64 = await blobToBase64(imgBlob);
      lastTime = logTime(lastTime, "Blob 转 Base64");
    } else {
      // 如果不需要移除背景，直接使用原始图像
      imgbase64 = background;
    }

    const img = await createImage(imgbase64);
    lastTime = logTime(lastTime, "创建图像");

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    lastTime = logTime(lastTime, "绘制图像到 canvas");

    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const { width: objectWidth, height: objectHeight, top: objectTop, left: objectLeft } = getObjectDimensions(imageData);
    lastTime = logTime(lastTime, "获取对象尺寸");

    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';

    if (fillPattern === 'vertical') {
      fillVertical(ctx, segments, objectHeight, objectTop, canvas.width, transparency);
    } else if (fillPattern === 'horizontal') {
      fillHorizontal(ctx, segments, objectWidth, objectLeft, canvas.height, transparency);
    }
    lastTime = logTime(lastTime, "填充图像");

    ctx.restore();

    const result = {
      imgUrl: canvas.toDataURL(),
      imgWidth: img.width,
      imgHeight: img.height,
    };
    lastTime = logTime(lastTime, "生成结果");

    logTime(startTime, "总耗时");

    return result;
  } catch (error) {
    console.error("Error in createPercentFill:", error);
    throw error;
  }
}

async function createImage(src: string): Promise<HTMLImageElement> {
  const startTime = performance.now();
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      logTime(startTime, "创建图像");
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

function getObjectDimensions(imageData: ImageData): { width: number, height: number, top: number, left: number } {
  const startTime = performance.now();
  const { width, height, data } = imageData;
  let top = height, bottom = 0, left = width, right = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      if (data[index + 3] > 0) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }
  }

  logTime(startTime, "获取对象尺寸");
  return {
    width: right - left,
    height: bottom - top,
    top,
    left,
  };
}

function fillVertical(
  ctx: CanvasRenderingContext2D, 
  segments: segment[], 
  objectHeight: number, 
  objectTop: number, 
  canvasWidth: number,
  transparency: number
) {
  const startTime = performance.now();
  let currentTopOffset = objectTop;
  segments.forEach(segment => {
    const value = segment.value ?? 0;
    const segmentHeight = objectHeight * (value / 100);
    ctx.fillStyle = `${segment.color}${Math.floor((transparency / 100) * 255).toString(16).padStart(2, '0')}`;
    ctx.fillRect(0, currentTopOffset, canvasWidth, segmentHeight);
    currentTopOffset += segmentHeight;
  });
  logTime(startTime, "垂直填充");
}

function fillHorizontal(
  ctx: CanvasRenderingContext2D, 
  segments: segment[], 
  objectWidth: number, 
  objectLeft: number, 
  canvasHeight: number,
  transparency: number
) {
  const startTime = performance.now();
  let currentLeftOffset = objectLeft;
  segments.forEach(segment => {
    const value = segment.value ?? 0;
    const segmentWidth = objectWidth * (value / 100);
    ctx.fillStyle = `${segment.color}${Math.floor((transparency / 100) * 255).toString(16).padStart(2, '0')}`;
    ctx.fillRect(currentLeftOffset, 0, segmentWidth, canvasHeight);
    currentLeftOffset += segmentWidth;
  });
  logTime(startTime, "水平填充");
}

export default createPercentFill;
