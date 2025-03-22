import {
  Button,
  Columns,
  FormField,
  Rows,
  Text,
  Swatch,
  FileInput,
  Box,
  Title,
  Slider,
  FileInputItem,
  Alert,
  LoadingIndicator,
  Column,
  ReloadIcon,
  TrashIcon,
  SegmentedControl,
  BackgroundIcon,
  UndoIcon,
} from "@canva/app-ui-kit";
import { openColorSelector,CloseColorSelectorFn } from "@canva/asset";
import * as React from "react";
//@ts-ignore
import styles from "styles/components.css";
import { useAddElement } from "utils/use_add_element";
import { upload } from "@canva/asset";

import {auth} from "@canva/user"
import {login} from "./account";
import { getPlatformInfo,requestOpenExternalUrl } from "@canva/platform";
import { getTemporaryUrl } from "@canva/asset";
import { useSelection } from "utils/use_selection_hook";
import { addElementAtPoint, GroupContentAtPoint } from "@canva/design";
import { GradientPicker, ColorStop } from "./components/GradientPicker";
import { GradientDirectionControl } from "./components/GradientDirectionControl";

type segment = {
  name:string;
  color:string;
  value:number| undefined;
}

// 定义类型
interface ImgConfig {
  value: number;
  color: string;
  backgroundColor: string;
}

const defaultSegment:segment[] = 
[
  {
    name:"Segment 1",
    color:"#dbdbdb",
    value:0,
  }
]

type ImageElement = {
  type: "IMAGE";
  dataUrl: string;
  width: number;
  height: number;
  top: number;
  left: number;
};

type user = {
  userid: string,
  brandId: string
}

type CanvasElement = ImageElement;

// 在 error type 定义后添加
type sysError = {
  status: boolean;
  type: string;
  errMsg: string;
}

// const API_BASE_URL = 'http://localhost:3000';
const API_BASE_URL = 'https://image-colorizer--imagecolorizer-1096c.us-central1.hosted.app';


// 添加一个生成噪声纹理的辅助函数
const generateNoiseTexture = (width: number, height: number, noiseLevel: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  // 生成噪声
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  // 噪声强度 - 匹配预览中的效果
  const intensity = noiseLevel * 2.55; // 将0-100转换为0-255范围
  
  for (let i = 0; i < data.length; i += 4) {
    // 随机噪声值
    const noise = Math.random() * 255;
    
    // 设置透明度，以匹配预览中的混合模式
    const alpha = Math.random() < (noiseLevel / 100) ? (noiseLevel / 100) * 128 : 0;
    
    // 设置像素值 - 黑白噪声
    data[i] = noise;     // R
    data[i + 1] = noise; // G
    data[i + 2] = noise; // B
    data[i + 3] = alpha; // Alpha
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

// 根节点定义
export const App = () => {
  const addElement = useAddElement();
  // Add with other state declarations
  const [colorMode, setColorMode] = React.useState<string>('gradients');
  const [closeColorSelector, setCloseColorSelector] = React.useState<CloseColorSelectorFn>();
  const [oneColor, setOneColor] = React.useState<string>("#ff0099");
  const [gradientColors, setGradientColors] = React.useState<ColorStop[]>([
    { color: "#ff0099", position: 0, id: "start" },
    { color: "#6600ff", position: 100, id: "end" }
  ]);
  // 删除 icon 相关的状态
  const [segments,setSegments] = React.useState<segment[]>(defaultSegment)
  const [isGenerating, setIsGenerating] = React.useState<boolean>(false);
  const [fillPattern,setFillPattern] = React.useState<string|null>('vertical');
  const [error, setError] = React.useState<string | boolean>(false);
  const [file,setFile] = React.useState<string| boolean>(false);
  const [user, setUser] = React.useState<user | null>(null);
  const [isOffline, setIsOffline] = React.useState(false);
  const [isLogined, setIsLogined] = React.useState(false);
  const [tipStatus, setTipStatus] = React.useState(true);
  const [removeBackground, setRemoveBackground] = React.useState(false);
  const [imgPreviewUrl, setImgPreviewUrl] = React.useState<string | null>(null);
  const [imgSelectionUrl, setImgSelectionUrl] = React.useState<string | null>(null);
  const [canAcceptPayments, setCanAcceptPayments] = React.useState<boolean>(true);
  const currentSelection = useSelection("image");
  const [gradientType, setGradientType] = React.useState<string>('linear');
  const [sysError, setSysError] = React.useState<sysError>({ 
    status: false, 
    type: "", 
    errMsg: "" 
  });
  // 1. 添加类型定义
  interface SimplePictorialConfig {
    color: string;
    transparency: number;
  }

  // 2. 修改状态声明
  const [simplePictorialConfig, setSimplePictorialConfig] = React.useState<SimplePictorialConfig>({
    color: "#EF5353",
    transparency: 100
  });

  const [fileName, setFileName] = React.useState<string>('');

  const [imgConfig, setImgConfig] = React.useState<ImgConfig>({
    value: 50,
    color: "#000000",
    backgroundColor: "#ffffff"
  });

  const [transparency, setTransparency] = React.useState<number>(60);

  const [gradientAngle, setGradientAngle] = React.useState<number>(45);

  const [previewReady, setPreviewReady] = React.useState(false);

  const [selectionChangeCounter, setSelectionChangeCounter] = React.useState(0);

  // 添加噪声级别状态
  const [noiseLevel, setNoiseLevel] = React.useState<number>(0);

  // Add state for background-removed image
  const [removedBgImage, setRemovedBgImage] = React.useState<string | null>(null);

  const [showTip, setShowTip] = React.useState(true);

  // 添加背景移除处理状态
  const [isRemovingBackground, setIsRemovingBackground] = React.useState(false);

  const [isImageLocked, setIsImageLocked] = React.useState(false);
  const [lockedImageUrl, setLockedImageUrl] = React.useState<string | null>(null);
  const [lockedImageBase64, setLockedImageBase64] = React.useState<string | null>(null);

  // 在state声明部分添加一个标志位，表示用户是否手动点击了抠图按钮
  const [manualRemoveBackground, setManualRemoveBackground] = React.useState(false);

  // 在其他状态声明旁边添加
  const [controlReset, setControlReset] = React.useState(0);

  const getUserInfo = React.useCallback(async () => {
    try {
      const token = await auth.getCanvaUserToken();
      const userInfo = await login(token);
      setUser(userInfo as any);
      setIsOffline(false);
      setIsLogined(true);
      return token;
    } catch (error) {
      console.error('Failed to get user info:', error);
      setIsOffline(true);
      setIsLogined(false);
      throw error;
    }
  }, []);

  React.useEffect(() => {
      const refreshData = async () => {
        const token = await getUserInfo();
      };
      refreshData();
  
  }, [getUserInfo]);

 
  async function getSelectionImage(): Promise<string> {
    const draft = await currentSelection.read();
    const isMultiple = draft.contents.length > 1;
    if (isMultiple) return ''
    const content = draft.contents[0];
    if (!content) {
      return ''
    }
    try {
      const { url } = await getTemporaryUrl({
        type: "image",
        ref: content.ref,
      });
      const response = await fetch(url);
      const blob = await response.blob();
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result?.toString() || '';
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.log(error)
      // setNoticeError('Something went wrong. Please try again later.')
      return ''
    }
  }

  async function getSelectionImageUrl(): Promise<void> {
    // 先重置预览状态，确保选择新图片时会触发更新
    setPreviewReady(false);
    
    const draft = await currentSelection.read();
    const isMultiple = draft.contents.length > 1;
    if (isMultiple) return;
    const content = draft.contents[0];
    if (!content) {
      return;
    }
    try {
      const { url } = await getTemporaryUrl({
        type: "image",
        ref: content.ref,
      });
      setImgSelectionUrl(url); // 更新 imgSelectionUrl 状态
      
      // 如果图片尚未锁定，则锁定当前选择的图片
      if (!isImageLocked) {
        setLockedImageUrl(url);
        setIsImageLocked(true);
        
        // 同时获取Base64数据用于背景移除等操作
        const imageBase64 = await getSelectionImage();
        if (imageBase64) {
          setLockedImageBase64(imageBase64);
        }
      }
      
      // 手动触发预览更新，确保在图片 URL 设置后执行
      setTimeout(() => setPreviewReady(true));
    } catch (error) {
      console.log(error);
    }
  }

  // 修改监听选择变化的useEffect
  React.useEffect(() => {
    // 增加计数器，确保每次选择变化都被捕获
    setSelectionChangeCounter(prev => prev + 1);
    
    if (currentSelection.count === 1) {
      getSelectionImageUrl();
    } else {
      // 当取消选择时，清除选择图片URL
      setImgSelectionUrl(null);
    }
  }, [currentSelection]); // 只监听currentSelection对象本身

  // 修改预览更新的useEffect，添加新的依赖项
  React.useEffect(() => {
    // 当任何一个与预览相关的参数变化时，更新预览
    if ((imgPreviewUrl || imgSelectionUrl) && !previewReady) {
      setPreviewReady(true);
    }
  }, [
    imgPreviewUrl, 
    imgSelectionUrl,
    colorMode,
    oneColor,
    gradientColors,
    transparency,
    simplePictorialConfig,
    gradientAngle,
    file,
    selectionChangeCounter // 添加选择变化计数器作为依赖项
  ]);

  // 修改file状态变化处理，确保清除旧预览并准备新预览
  const handleFileChange = (base64URL: string, fileName: string) => {
    // 先重置预览状态
    setPreviewReady(false);
    // 然后设置新文件
    setImgPreviewUrl(base64URL);
    setFile(base64URL);
    setFileName(fileName);
    
    // 锁定上传的图片
    setIsImageLocked(true);
    setLockedImageUrl(base64URL);
    setLockedImageBase64(base64URL);
    
    // 预览会通过上面的useEffect自动更新
  };

  // 使用叠加噪声方法，确保保留渐变效果
  const startFill = async () => {
    setIsGenerating(true);
    setSysError({ status: false, type: "", errMsg: "" });
    
    try {
      let originImage: string;
      
      // Determine source image
      if(currentSelection.count > 1){
        setSysError({ status: true, type: "multipleSelection", errMsg: "Only one image can be processed at a time." });
        setIsGenerating(false);
        return;
      }
      
      // 优先使用已移除背景的图片（如果存在）
      if (removeBackground && removedBgImage) {
        console.log("Using background-removed image for processing");
        originImage = removedBgImage;
      }
      // 然后检查是否有锁定的图片
      else if (isImageLocked && lockedImageBase64) {
        console.log("Using locked image for processing");
        originImage = lockedImageBase64;
      }
      else if(currentSelection.count === 1){
        console.log("Using selection image for processing");
        originImage = await getSelectionImage();
        if (!originImage) {
          throw new Error('Failed to get selected image');
        }
      } else {
        if (!file) {
          setSysError({ status: true, type: "noImage", errMsg: "Please upload or select an image" });
          setIsGenerating(false);
          return;
        }
        
        console.log("Using uploaded file for processing");
        originImage = file as string;
      }
      
      // 创建一个Canvas来合成图像与效果
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = originImage;
      });
      
      // 创建画布，确保支持透明度
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { alpha: true });
      
      if (!ctx) {
        throw new Error('Could not create canvas context');
      }
      
      // 首先绘制原始图像，保留其透明度信息
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // 保存原始图像数据用作遮罩
      const originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const originalAlphaData = new Uint8ClampedArray(originalImageData.data.length / 4);
      
      // 提取原始图像的alpha通道
      for (let i = 0; i < originalImageData.data.length; i += 4) {
        originalAlphaData[i/4] = originalImageData.data[i + 3];
      }
      
      // 应用效果（渐变或单色）
      if (colorMode === 'gradients') {
        // 修复渐变角度计算以匹配CSS渐变行为
        // CSS中0度是向上，而Canvas中0弧度是向右，所以需要偏移90度
        const cssAngleInRadians = ((gradientAngle - 90) * Math.PI) / 180;
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.max(canvas.width, canvas.height);
        
        // 从中心向外计算渐变的起点和终点
        const startX = centerX - Math.cos(cssAngleInRadians) * radius;
        const startY = centerY - Math.sin(cssAngleInRadians) * radius;
        const endX = centerX + Math.cos(cssAngleInRadians) * radius;
        const endY = centerY + Math.sin(cssAngleInRadians) * radius;
        
        // 创建渐变
        const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
        
        // 添加渐变颜色点
        const sortedStops = [...gradientColors].sort((a, b) => a.position - b.position);
        sortedStops.forEach(stop => {
          gradient.addColorStop(stop.position / 100, stop.color);
        });
        
        // 设置渐变应用模式
        ctx.globalCompositeOperation = 'source-atop';
        ctx.globalAlpha = transparency / 100;
        
        // 填充渐变
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 重置复合模式和透明度
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
      } 
      else if (colorMode === 'onecolor') {
        // 单色填充模式
        ctx.globalCompositeOperation = 'source-atop';
        ctx.globalAlpha = simplePictorialConfig.transparency / 100;
        ctx.fillStyle = oneColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 重置复合模式和透明度
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
      }
      
      // 应用噪声效果 - 更加简化和稳定的实现
      if (noiseLevel > 0) {
        console.log("Applying simple noise with level:", noiseLevel);
        
        ctx.save();
        
        try {
          // 确保只在非透明区域应用
          ctx.globalCompositeOperation = 'source-atop';
          
          // 获取像素数据
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // 根据噪声水平调整参数 - 尝试更好地匹配预览效果
          const factor = noiseLevel <= 30 ? 0.7 : 
                         noiseLevel <= 70 ? 0.5 : 0.35;
          
          const adjustedStrength = noiseLevel * factor;
          
          // 应用噪声
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) { // 只处理非透明像素
              
              // 为每个通道使用一致的噪声值 - 产生灰度噪声效果
              // 这更接近SVG噪声滤镜的效果
              const noiseValue = Math.random() * 2 - 1;
              const noise = noiseValue * adjustedStrength;
              
              for (let j = 0; j < 3; j++) {
                data[i + j] = Math.max(0, Math.min(255, data[i + j] + noise));
              }
            }
          }
          
          ctx.putImageData(imageData, 0, 0);
          console.log("Noise successfully applied with adjusted parameters");
        } catch (error) {
          console.error("Error applying noise:", error);
        } finally {
          ctx.restore();
        }
      }
      
      // 获取处理后的图像数据
      const processedImageURL = canvas.toDataURL('image/png');
      
      // 添加到设计中
      addElement({
        type: "image",
        dataUrl: processedImageURL,
        altText: undefined
      });
      // // 2. 同时上传到Canva资源库 (新增功能)
      // try {
      //   const uploadResult = await upload({
      //     type: "image",
      //     mimeType: "image/png",
      //     url: processedImageURL,
      //     thumbnailUrl: processedImageURL,
      //     aiDisclosure: "none"
      //   });
        
      //   // 等待上传完成并记录成功信息
      //   await uploadResult.whenUploaded();
      //   console.log("Image successfully uploaded to Canva library:", uploadResult);
      // } catch (uploadError) {
      //   // 上传失败不影响主流程，只记录错误
      //   console.error("Failed to upload image to library:", uploadError);
      // }
    } catch (e: any) {
      console.error('Error in startFill:', e);
      setSysError({
        status: true,
        type: 'imageFillError',
        errMsg: e.message || 'Error processing image'
      });
    } finally {
      // setIsGenerating(false);
      // 使用setTimeout确保状态更新和UI渲染顺序正确
      setTimeout(() => {
        setIsGenerating(false);
      }, 50);
    }
  };

  // 在组件中添加图片ref
  const imageRef = React.useRef<HTMLImageElement>(null);

  // 简化版的背景移除错误处理
  const processRemoveBackground = async (imageSource: string | null) => {
    try {
      // 开始前清除之前的错误
      setSysError({ status: false, type: "", errMsg: "" });
      
      // 设置背景移除加载状态
      setIsRemovingBackground(true);
      
      let imageBase64: string;
      
      // 获取图像数据
      if (!imageSource && currentSelection.count === 1) {
        imageBase64 = await getSelectionImage();
        if (!imageBase64) {
          throw new Error('Failed to get selected image');
        }
      } else if (imageSource && typeof imageSource === 'string') {
        imageBase64 = imageSource;
      } else {
        throw new Error('No image available');
      }
      
      // 确保只传递base64部分
      const base64Data = imageBase64.includes('base64,') 
        ? imageBase64.split('base64,')[1] 
        : imageBase64;
      
      // 获取认证令牌 - 可能出现网络错误
      let token;
      try {
        token = await auth.getCanvaUserToken();
      } catch (authError) {
        // 网络连接/认证错误
        throw { isNetworkError: true };
      }
      
      // 调用API - 可能出现网络错误
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/api/cutout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            image: base64Data
          })
        });
      } catch (networkError) {
        // API调用网络错误
        throw { isNetworkError: true };
      }
      
      // 检查响应状态
      if (!response.ok) {
        // 所有API错误使用一个通用错误
        throw new Error('API error');
      }
      
      // 处理响应
      const blob = await response.blob();
      const reader = new FileReader();
      
      // 读取响应数据
      await new Promise((resolve, reject) => {
        reader.onloadend = () => {
          try {
            const base64data = reader.result as string;
            setRemovedBgImage(base64data);
            setPreviewReady(true);
            resolve(base64data);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      // 操作成功，清除错误
      setSysError({ status: false, type: "", errMsg: "" });
      
    } catch (error: any) {
      console.error('Error removing background:', error);
      
      // 简化为两种错误情况
      if (error && error.isNetworkError) {
        // 网络连接错误
        setSysError({
          status: true,
          type: 'backgroundRemoval-network',
          errMsg: "We couldn't remove the image's background. Check that you're connected to the internet, then try again."
        });
      } else {
        // 通用错误 - 包括所有其他情况
        setSysError({
          status: true,
          type: 'backgroundRemoval',
          errMsg: "We couldn't remove the image's background. Wait a few moments, then try again."
        });
      }
      
      // 重置背景移除状态
      setRemoveBackground(false);
    } finally {
      // 重置加载状态
      setIsRemovingBackground(false);
    }
  };
  
  // 修改背景移除的useEffect，让它只在用户手动点击按钮时触发抠图
  React.useEffect(() => {
    if (removeBackground && manualRemoveBackground) {
      if (isImageLocked && lockedImageBase64) {
        // 处理锁定的图片
        processRemoveBackground(lockedImageBase64);
      }
      else if (file && typeof file === 'string') {
        // 处理上传的图片
        processRemoveBackground(file);
      } else if (currentSelection.count === 1) {
        // 处理选中的图片 - 传null让函数内部调用getSelectionImage
        processRemoveBackground(null);
      } else {
        setRemoveBackground(false); // 没有可用图片时重置开关
        setManualRemoveBackground(false); // 重置手动标志
        setSysError({
          status: true,
          type: 'backgroundRemoval',
          errMsg: 'Please select or upload an image first'
        });
      }
      // 抠图操作完成后重置手动标志
      setManualRemoveBackground(false);
    } else if (!removeBackground) {
      // 重置已移除背景的图像状态，确保使用原图
      setRemovedBgImage(null);
      // 确保预览能刷新显示
      setPreviewReady(false);
      setTimeout(() => setPreviewReady(true), 50);
    }
  }, [removeBackground, file, currentSelection.count, isImageLocked, lockedImageBase64, manualRemoveBackground]);

  // 更新 removeBackground 效果，确保状态变化时预览正确更新
  React.useEffect(() => {
    // 确保预览更新以反映状态变化
    if (!previewReady) {
      setTimeout(() => setPreviewReady(true), 10);
    }
  }, [removeBackground, previewReady]);

  if (isOffline) {
    return (
      <Box className={styles.fullHeight} display="flex" alignItems="center">
        <Rows spacing="2u">
          <Text variant="bold" size="large" alignment="center">
            It looks like you're offline
          </Text>
          <Text alignment="center">Try checking your internet connection and refresh</Text>
        </Rows>
      </Box>
    );
  }

  return (
    <div className={styles.scrollContainer}>
      {/* 背景移除错误信息 */}
      {sysError?.status && (sysError.type === 'backgroundRemoval' || sysError.type === 'backgroundRemoval-network') && (
        <Alert
          tone="critical"
          onDismiss={() => setSysError({ status: false, type: "", errMsg: "" })}
        >
          {sysError.errMsg}
        </Alert>
      )}
      
      {/* 现有的其他错误 */}
      {sysError?.status && sysError.type === 'imageFillError' && (
        <Alert
          tone="critical"
          onDismiss={() => setSysError({ status: false, type: "", errMsg: "" })}
        >
          {sysError.errMsg}
        </Alert>
      )}
      <Rows spacing="1u">
        <>
        {(!isImageLocked) && (
          <>
            {sysError?.status && sysError.type === "fileSize" && (
              <Alert
                title="Unable to upload file."
                onDismiss={() => setSysError({ status: false, type: "", errMsg: "" })}
                tone="warn"
              >
                {sysError.errMsg}
              </Alert>
            )}
            <Text>
              Upload or select image from your design to colorize
            </Text>
            <FileInput
              stretchButton
              accept={[
                'image/png',
                'image/jpeg',
                'image/jpg'
              ]}
              onDropAcceptedFiles={(files: File[]) => {
                const uploadedImg = files[0];
                const reader = new FileReader();
                reader.onloadend = () => {
                  const base64URL = reader.result as string;
                  handleFileChange(base64URL, uploadedImg.name);
                  setSysError({ status: false, type: "", errMsg: "" });
                };
                reader.readAsDataURL(uploadedImg);
              }}
            />
            {!file && !sysError?.status && (
              <Text size="small" variant="regular" tone="tertiary">Accepted file formats: JPEG, JPG, PNG</Text>
            )}
            {fileName && !(sysError?.status && sysError?.type === "fileSize") && (
              <FileInputItem 
                label={fileName}
                onDeleteClick={() => {
                  // 重置所有与图片相关的状态
                  setFile(false);
                  setFileName('');
                  setImgPreviewUrl(null);
                  
                  // 清除背景移除状态
                  setRemoveBackground(false);
                  setRemovedBgImage(null);
                  
                  // 解除图片锁定
                  setIsImageLocked(false);
                  setLockedImageUrl(null);
                  setLockedImageBase64(null);
                  
                  setSysError({ status: false, type: "", errMsg: "" });
                  console.log("Image deleted, resetting states");
                }}
              />
            )}
          </>
        )}
        </> 
         {/* 如果了多个图片 */}
          {!isImageLocked && currentSelection && currentSelection.count > 1 && (
            <Alert
            title="Only one image can be processed at a time."
            tone="critical"
            // onDismiss={() => {}}
            >
              Please select a single image in your design.
              </Alert>
            )} 
        {(file || isImageLocked) && !(sysError?.status && sysError.type === "fileSize") && (
          <>
            {/* {showTip && (
              <Alert
                tone="info"
                onDismiss={() => setShowTip(false)}
              >
                Better to use an image with a transparent background.
              </Alert>
            )} */}
            <Text>
              <b>Preview</b>
            </Text>
            {/* <Text>
             Image with transparent BG recommended.
             </Text> */}
             <div
                style={{
                  width: "100%",
                  height: "250px",
                  borderRadius: "8px",
                  background: "var(--ui-kit-color-neutral-low)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "12px",
                  position: "relative",
                }}
              >
                {/* 添加右上角按钮组 - 修改样式为深灰色透明的圆角背景 */}
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    zIndex: 20,
                    display: 'flex',
                    gap: '8px' // 增加按钮间距
                  }}
                >
                  {/* 重置渐变方向按钮 */}
                  <div
                    style={{
                      width: '36px', // 固定宽度
                      height: '36px', // 固定高度
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Button
                      ariaLabel="Reset position"
                      icon={ReloadIcon}
                      size="medium"
                      type="button"
                      variant="contrast"
                      onClick={() => {
                        // 重置渐变角度到初始值
                        setGradientAngle(45);
                        
                        // 递增重置计数器，强制控制杆组件重新挂载
                        setControlReset(prev => prev + 1);
                      }}
                    />
                  </div>
                  
                  {/* 重新选择图片按钮 */}
                  <div
                    style={{
                      width: '36px', // 固定宽度
                      height: '36px', // 固定高度
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Button
                      ariaLabel="Remove"
                      icon={TrashIcon}
                      size="medium"
                      type="button"
                      variant="contrast"
                      onClick={() => {
                        console.log("Start over button clicked, resetting states");
                        
                        // 首先重置file状态，这是触发上传界面显示的关键
                        setFile(false);
                        setFileName('');
                        setIsImageLocked(false);

                        // 使用setTimeout确保状态更新的顺序性
                        setTimeout(() => {
                          // 接着重置其他状态
                          setImgPreviewUrl(null);
                          setRemoveBackground(false);
                          setRemovedBgImage(null);
                          setLockedImageUrl(null);
                          setLockedImageBase64(null);
                          setImgSelectionUrl(null);
                          setPreviewReady(false);
                          setSysError({ status: false, type: "", errMsg: "" });
                          console.log("All states reset complete");
                        }, 2);
                      }}
                    />
                  </div>
                </div>
                
                {(isImageLocked || imgPreviewUrl || imgSelectionUrl) && (
                  <>
                    <img
                      ref={imageRef}
                      src={removeBackground && removedBgImage 
                        ? removedBgImage 
                        : (isImageLocked && lockedImageUrl 
                           ? lockedImageUrl 
                           : (currentSelection.count === 1 ? imgSelectionUrl! : imgPreviewUrl!))}
                      alt={fileName}
                      onLoad={() => {
                        // Image loaded, trigger preview rendering
                        setPreviewReady(true);
                      }}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        // 添加硬件加速以提高渲染性能
                        transform: 'translateZ(0)',
                      }}
                    />
                    
                    {/* 加载遮罩 - 更新为使用标准overlay颜色和dark类 */}
                    {isRemovingBackground && (
                      <div 
                        className="dark"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          backgroundColor: 'var(--ui-kit-color-overlay)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 10,
                          borderRadius: '8px',
                        }}
                      >
                        <LoadingIndicator size="medium"/>
                        <Box paddingTop="1u">
                          <Text tone="secondary" size="small">
                            Removing background...
                          </Text>
                        </Box>
                      </div>
                    )}
                    
                    {/* Color overlay - only covers non-transparent parts of the image */}
                    {colorMode === 'gradients' && imageRef.current && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: imageRef.current.offsetTop,
                          left: imageRef.current.offsetLeft,
                          width: imageRef.current.offsetWidth,
                          height: imageRef.current.offsetHeight,
                          background: `linear-gradient(${gradientAngle}deg, ${
                            gradientColors
                              .sort((a, b) => a.position - b.position)
                              .map(stop => `${stop.color} ${stop.position}%`)
                              .join(', ')
                          })`,
                          opacity: transparency / 100,
                          maskImage: `url(${removeBackground && removedBgImage 
                            ? removedBgImage 
                            : (isImageLocked && lockedImageUrl 
                               ? lockedImageUrl 
                               : (currentSelection.count === 1 ? imgSelectionUrl! : imgPreviewUrl!))})`,
                          maskSize: '100% 100%',
                          WebkitMaskImage: `url(${removeBackground && removedBgImage 
                            ? removedBgImage 
                            : (isImageLocked && lockedImageUrl 
                               ? lockedImageUrl 
                               : (currentSelection.count === 1 ? imgSelectionUrl! : imgPreviewUrl!))})`,
                          WebkitMaskSize: '100% 100%',
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                    
                    {/* 单色遮罩层 - 只覆盖图片的非透明部分 */}
                    {colorMode === 'onecolor' && imageRef.current && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: imageRef.current.offsetTop,
                          left: imageRef.current.offsetLeft,
                          width: imageRef.current.offsetWidth,
                          height: imageRef.current.offsetHeight,
                          backgroundColor: oneColor,
                          opacity: simplePictorialConfig.transparency / 100,
                          maskImage: `url(${removeBackground && removedBgImage 
                            ? removedBgImage 
                            : (isImageLocked && lockedImageUrl 
                               ? lockedImageUrl 
                               : (currentSelection.count === 1 ? imgSelectionUrl! : imgPreviewUrl!))})`,
                          maskSize: '100% 100%',
                          WebkitMaskImage: `url(${removeBackground && removedBgImage 
                            ? removedBgImage 
                            : (isImageLocked && lockedImageUrl 
                               ? lockedImageUrl 
                               : (currentSelection.count === 1 ? imgSelectionUrl! : imgPreviewUrl!))})`,
                          WebkitMaskSize: '100% 100%',
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                    
                    {colorMode === 'gradients' && (
                      <GradientDirectionControl
                        colorStops={gradientColors}
                        onChange={setGradientAngle}
                        key={`gradient-control-${controlReset}`}
                      />
                    )}

                    {/* 增强预览噪声效果 */}
                    {noiseLevel > 0 && imageRef.current && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: imageRef.current.offsetTop,
                          left: imageRef.current.offsetLeft,
                          width: imageRef.current.offsetWidth,
                          height: imageRef.current.offsetHeight,
                          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noisy'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${0.4 + (noiseLevel/100) * 0.6}' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noisy)'/%3E%3C/svg%3E")`,
                          opacity: noiseLevel / 100, // 将透明度从 /200 改为 /100
                          mixBlendMode: noiseLevel > 50 ? 'hard-light' : 'overlay', // 根据噪声级别调整混合模式
                          maskImage: `url(${removeBackground && removedBgImage 
                            ? removedBgImage 
                            : (isImageLocked && lockedImageUrl 
                               ? lockedImageUrl 
                               : (currentSelection.count === 1 ? imgSelectionUrl! : imgPreviewUrl!))})`,
                          maskSize: '100% 100%',
                          WebkitMaskImage: `url(${removeBackground && removedBgImage 
                            ? removedBgImage 
                            : (isImageLocked && lockedImageUrl 
                               ? lockedImageUrl 
                               : (currentSelection.count === 1 ? imgSelectionUrl! : imgPreviewUrl!))})`,
                          WebkitMaskSize: '100% 100%',
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                  </>
                )}
             </div>
             <Rows spacing="3u">
             <Box paddingBottom="0.5u" paddingTop="0.5u">
               <Button
                 stretch
                 icon={removeBackground && removedBgImage ? UndoIcon : BackgroundIcon}
                 variant="secondary"
                 loading={isRemovingBackground ? true : undefined}
                 disabled={isRemovingBackground}
                 onClick={() => {
                   // 只有当有图片可用且未在抠图过程中时才执行
                   if (!isRemovingBackground && ((file && typeof file === 'string') || currentSelection.count === 1 || (isImageLocked && lockedImageBase64))) {
                     if (!removeBackground) {
                       // 先设置状态，然后触发处理
                       setRemoveBackground(true);
                       setManualRemoveBackground(true); // 设置手动触发标志
                       
                       // 不需要在这里直接调用processRemoveBackground，由useEffect处理
                     } else {
                       // 如果已经是移除背景状态，设置为false，恢复原图
                       setRemoveBackground(false);
                       setRemovedBgImage(null);
                       // 确保预览能刷新显示
                       setPreviewReady(false);
                       setTimeout(() => setPreviewReady(true), 50);
                     }
                   } else if (!isRemovingBackground) {
                     // 没有可用图片时显示错误
                     setSysError({
                       status: true,
                       type: 'backgroundRemoval',
                       errMsg: 'Please select or upload an image first'
                     });
                   }
                 }}
               >
                 {isRemovingBackground 
                   ? "Removing background..." 
                   : (removeBackground && removedBgImage ? "Restore background" : "Remove background")}
               </Button>
             </Box>
             {/* 添加取消按钮 - 仅在抠图过程中显示 */}
             {isRemovingBackground && (
               <Box paddingBottom="0.5u">
                 <Button
                   stretch
                   variant="secondary"
                   onClick={() => {
                     // 立即重置移除背景状态
                     setIsRemovingBackground(false);
                     setRemoveBackground(false);
                     setManualRemoveBackground(false);
                     
                     // 清除可能存在的错误状态
                     setSysError({ 
                       status: false, 
                       type: "", 
                       errMsg: "" 
                     });
                   }}
                 >
                   Cancel
                 </Button>
               </Box>
             )}
             <Box>
               <FormField
                 label="Colorize"
                 description={colorMode === 'gradients' ? "Tap or click on the gradient strip to add a color" : undefined}
                 control={(props) => (
                   <SegmentedControl
                     defaultValue="gradients"
                     options={[
                       {
                         label: 'Gradient',
                         value: 'gradients'
                       },
                       {
                         label: 'Solid color',
                         value: 'onecolor'
                       }
                     ]}
                     onChange={(value)=>{
                       setColorMode(value);  
                     }}
                   />
                 )}
               />

               {/* 根据colorMode显示不同的颜色选择组件 */}
               {colorMode === 'gradients' ? (
                 <Box paddingTop="1u">
                   <GradientPicker
                     colors={gradientColors}
                     onChange={(colors) => {
                       setGradientColors([...colors]);
                     }}
                   />
                 </Box>
               ) : (
                 <Box paddingTop="1u">
                   <Columns align="spaceBetween" spacing="1u" alignY="baseline">
                     <Column width="content">
                       <Text>
                         <b>Fill color</b>
                       </Text>
                     </Column>
                     <Column width="content">
                       <Swatch
                         fill={[oneColor]}
                         onClick={async (event) => {
                           const anchor = event.currentTarget.getBoundingClientRect();
                           const closeColorSelector = await openColorSelector(anchor, {
                             scopes: ["solid"],
                             selectedColor: oneColor
                             ? {
                                 type: "solid",
                                 hexString: oneColor,
                               }
                             : undefined,
                             onColorSelect: (event) => {
                               if (event.selection.type === "solid") {
                                 setOneColor(event.selection.hexString);
                               } 
                             },
                           });
                         }}
                       />
                     </Column>
                   </Columns>
                 </Box>
               )}
             </Box>
          
            {/* 控制选项 - 根据colorMode动态显示 */}
            {colorMode === 'gradients' ? (
              <>
                <Box paddingTop="0" paddingBottom="0">
                  <FormField
                    label="Transparency"
                    control={(props) => (
                      <Box paddingStart="1.5u">
                        <Slider
                          defaultValue={transparency}
                          max={100}
                          min={0}
                          step={1}
                          onChange={(value) => setTransparency(value)}
                        />
                      </Box>
                    )}
                  />
                </Box>  
                <Box>
                  <FormField
                    label="Noise level"
                    control={(props) => (
                      <Box paddingStart="1.5u">
                        <Slider
                          defaultValue={noiseLevel}
                          max={100}
                          min={0}
                          step={1}
                          onChange={(value) => setNoiseLevel(value)}
                        />
                      </Box>
                    )}
                  />
                </Box>  
              </>
            ) : (
              <Box>
                <FormField
                  label="Transparency"
                  control={(props) => (
                    <Box paddingStart="1.5u">
                      <Slider
                        defaultValue={simplePictorialConfig.transparency}
                        max={100}
                        min={0}
                        step={1}
                        onChange={(value) => {
                          setSimplePictorialConfig(prev => ({
                            ...prev,
                            transparency: value
                          }));
                        }}
                      />
                    </Box>
                  )}
                />
              </Box>
            )}
            </Rows>  
            <Box paddingTop="2u" paddingBottom="0" display="flex" flexDirection="column" alignItems="center">
              <Button
                variant="primary"
                onClick={startFill}
                stretch
                loading={isGenerating ? true : undefined}
                // disabled={isGenerating}
              >
                Add to design
              </Button>
            </Box>
          </>
        )}
      </Rows>
    </div>
  );
};

