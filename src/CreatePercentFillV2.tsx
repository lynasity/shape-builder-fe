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
  opacity: number;
};

function logTime(start: number, label: string) {
  const end = performance.now();
  console.log(`${label}: ${(end - start).toFixed(2)}ms`);
  return end;
}

async function createPercentFillV2(background: string, percentage: number, transparency: number, removeBackground: boolean): Promise<coreImg> {
  let startTime = performance.now();
  let lastTime = startTime;
  console.log('percentage', percentage);
  try {
    const token = await auth.getCanvaUserToken();

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

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("无法获取 CanvasRenderingContext2D");
    }
    lastTime = logTime(lastTime, "创建 canvas");

    // 创建图像
    const img = await createImage(imgbase64);
    lastTime = logTime(lastTime, "创建图像");

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    lastTime = logTime(lastTime, "绘制图像到 canvas");

    // 获取图像数据
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // 获取实际对象的尺寸和位置
    const { width: objectWidth, height: objectHeight, top: objectTop, left: objectLeft } = getObjectDimensions(imageData);
    lastTime = logTime(lastTime, "获取对象尺寸");

    const pixels = imageData.data;
    
    // 计算分界线位置（从下往上percentage%的位置）
    // 使用实际对象的位置和高度来计算
    const dividerY = objectTop + Math.floor(objectHeight * (1 - percentage / 100));
    
    // 计算透明度值（0-255）
    const alpha = Math.floor((transparency / 100) * 255);

    // 修改图像数据
    for (let y = objectTop; y < objectTop + objectHeight; y++) {
      // 只处理分界线以上的部分
      if (y < dividerY) {
        for (let x = objectLeft; x < objectLeft + objectWidth; x++) {
          const index = (y * canvas.width + x) * 4;
          // 只修改透明度通道（Alpha通道）
          if (pixels[index + 3] > 0) { // 只处理非完全透明的像素
            pixels[index + 3] = alpha;
          }
        }
      }
    }

    // 将修改后的图像数据放回canvas
    ctx.putImageData(imageData, 0, 0);
    lastTime = logTime(lastTime, "处理图像数据");

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

export default createPercentFillV2;
