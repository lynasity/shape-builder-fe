import {blobToBase64} from './trasfer'
import { getToken,setToken } from "./tokenManager";

type coreImg = {
  imgUrl:string,
  imgWidth:number,
  imgHeight:number
};

type segment = {
  // 图例颜色，也会用在填充颜色
  name:string;
  color:string;
  // 数值，可控制填充比例
  value:number| undefined;
  opacity:number;
}


// 缩放图像到指定的宽度和高度
function resizeImage(img: HTMLImageElement, targetWidth: number, targetHeight: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error("Can't get CanvasRenderingContext2D");
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  return canvas;
}

// 获取图像的实际宽高
function getObjectDimensions(imageData: ImageData): { width: number, height: number,right:number,left:number,top:number,bottom:number } {
  const { width, height, data } = imageData;
  let top = height, bottom = 0, left = width, right = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      if (data[index + 3] > 0) { // 仅检测非透明像素
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }

  return {
    width: right - left,
    height: bottom - top,
    right:right,
    left:left,
    bottom:bottom,
    top:top
  };
}
function createPercentFill(background: string,segments:segment[],fillPattern: string): Promise<coreImg> {
  return new Promise(async (resolve,reject)=>{ 
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Can't get CanvasRenderingContext2D");
    }
    // 获取jwt
    const token = getToken()
    // 获取抠图后的图片
    const response = await fetch(process.env.CANVA_BACKEND_HOST+"/api/cutout",{
      method: "POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":`Bearer ${token}`,
      },
      mode: "cors", // 启用跨域请求
      body: JSON.stringify({image:background}),
    });
    if (response.ok) {
      const imgBlob = await response.blob();
      const imgbase64 = await blobToBase64(imgBlob)
      // 画布绘制
      const img = new Image()
      img.src = imgbase64 as string;
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        console.log("图片尺寸，宽="+img.width+"，高="+img.height)
        ctx.drawImage(img, 0, 0);
        // 获取图像数据并计算实际物体的宽高
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const { width: objectWidth, height: objectHeight,right: obejectRight,left:obejectLeft,top:obejectTop,bottom:objectBottom } = getObjectDimensions(imageData);
        console.log("物体尺寸，宽="+objectWidth+"，高="+objectHeight)
        
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';

        // 填充模式：垂直 or 水平
        let currentTopOffset = obejectTop;
        let currentLeftOffset = obejectLeft;

        if (fillPattern === 'vertical') {
          // 垂直填充：按高度分比例
          segments.forEach(segment => {
            const value = segment.value ?? 0;  // 如果 value 为 undefined，则使用默认值 0
            const segmentHeight = objectHeight * (value/ 100);
            ctx.fillStyle = `${segment.color}${Math.floor((segment.opacity / 100) * 255).toString(16).padStart(2, '0')}`;
            ctx.fillRect(0, currentTopOffset, canvas.width, segmentHeight);
            currentTopOffset += segmentHeight;
          });
        } else if (fillPattern === 'horizontal') {
          // 水平填充：按宽度分比例
          segments.forEach(segment => {
            const value = segment.value ?? 0;  // 如果 value 为 undefined，则使用默认值 0
            const segmentWidth = objectWidth * (value / 100);
            ctx.fillStyle = `${segment.color}${Math.floor((segment.opacity / 100) * 255).toString(16).padStart(2, '0')}`;
            ctx.fillRect(currentLeftOffset, 0, segmentWidth, canvas.height);
            currentLeftOffset += segmentWidth;
          });
        }
        ctx.restore();
        resolve({
          imgUrl: canvas.toDataURL(),
          imgWidth: img.width,
          imgHeight: img.height,
        });
      };
      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };
    } else {
      console.error('Error:', response.statusText);
    }
   });
  }

export default createPercentFill;
