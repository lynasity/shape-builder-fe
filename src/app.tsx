import {
  Button,
  Columns,
  FormField,
  Rows,
  Text,
  Swatch,
  ColorSelector,
  FileInput,
  Grid,
  Box,
  Title,
  Slider,
  Link,
  VideoCard,
  FileInputItem,
  Alert,
  LoadingIndicator,
  Switch,
  ImageCard,
  NumberInput,
  Column,
  OpenInNewIcon,
  RadioGroup,
  PlusIcon,
  TrashIcon,
  PlayFilledIcon,
  SegmentedControl,
} from "@canva/app-ui-kit";
import { openColorSelector,CloseColorSelectorFn } from "@canva/asset";
// import { addNativeElement } from "@canva/design";
import * as React from "react";
//@ts-ignore
import styles from "styles/components.css";
import { useAddElement } from "utils/use_add_element";

import createPercentFill from "./CreatePercentFill";
import createPercentFillV2 from "./CreatePercentFillV2";
import createPercentFillV3 from "./CreatePercentFillV3";

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

const API_BASE_URL = 'http://localhost:3000';

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

  const addSegment = () => {
    const newSegment: segment = {
      name: `Segment ${segments.length + 1}`,
      color: "#000000", // 默认颜色，可以动态修改
      value: 0 ,// 默认百分比值
    };
    setSegments([...segments, newSegment]);
  };

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


  // 删除 segment 的函数
  const removeSegment = (indexToRemove: number) => {
    setSegments((prevSegments) =>
      prevSegments.filter((_, index) => index !== indexToRemove)
    );
  };
 
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
      
      // 手动触发预览更新，确保在图片 URL 设置后执行
      setTimeout(() => setPreviewReady(true), 50);
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
    if (imgPreviewUrl || imgSelectionUrl) {
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
      
      if(currentSelection.count === 1){
        if (removeBackground && removedBgImage) {
          originImage = removedBgImage;
        } else {
          originImage = await getSelectionImage();
          if (!originImage) {
            throw new Error('Failed to get selected image');
          }
        }
      } else {
        if (!file) {
          setSysError({ status: true, type: "noImage", errMsg: "Please upload or select an image" });
          setIsGenerating(false);
          return;
        }
        
        if (removeBackground && removedBgImage) {
          originImage = removedBgImage;
        } else {
          originImage = file as string;
        }
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
      
    } catch (e: any) {
      console.error('Error in startFill:', e);
      setSysError({
        status: true,
        type: 'imageFillError',
        errMsg: e.message || 'Error processing image'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // 定义生成错误提示信息的函
  const setErrorMessage = (e: string) => {
    setIsGenerating(false);
    // 将函数传入的 e 错误信息，set 到变error中
    setError(e);
  };

//定义清除错误提示信息的函数 
  const clearErrorMessage = () => {
    // 通过userState 返回的函数来更新错状态
    setError(false);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    
    const firstWord = text.split(' ')[0];
    if (firstWord.length >= maxLength) {
      return firstWord.slice(0, maxLength) + '...';
    }
    
    return text.slice(0, maxLength).trim() + '...';
  };

  // 在组件中添加图片ref
  const imageRef = React.useRef<HTMLImageElement>(null);

  // 更新移除背景的函数，确保正确处理不同来源的图片
  const processRemoveBackground = async (imageSource: string | null) => {
    try {
      // 设置特定的背景移除加载状态
      setIsRemovingBackground(true);
      
      let imageBase64: string;
      
      // 如果是通过选择方式获取的图片
      if (!imageSource && currentSelection.count === 1) {
        imageBase64 = await getSelectionImage();
        if (!imageBase64) {
          throw new Error('Failed to get selected image');
        }
      } else if (imageSource && typeof imageSource === 'string') {
        // 如果是通过上传方式获取的图片
        imageBase64 = imageSource;
      } else {
        throw new Error('No image available');
      }
      
      // 确保只传递base64部分而不是完整的data URL
      const base64Data = imageBase64.includes('base64,') 
        ? imageBase64.split('base64,')[1] 
        : imageBase64;
      
      const token = await auth.getCanvaUserToken();
      const response = await fetch(`${API_BASE_URL}/api/cutout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          image: base64Data
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove background');
      }
      
      // Convert response to blob then to base64
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setRemovedBgImage(base64data);
        setPreviewReady(true); // Update preview
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error removing background:', error);
      setSysError({
        status: true,
        type: 'backgroundRemoval',
        errMsg: 'Failed to remove background'
      });
      setRemoveBackground(false); // Reset switch if operation fails
    } finally {
      setIsRemovingBackground(false);
    }
  };
  
  // 更新 removeBackground 效果，处理不同来源的图片
  React.useEffect(() => {
    if (removeBackground) {
      if (file && typeof file === 'string') {
        // 处理上传的图片
        processRemoveBackground(file);
      } else if (currentSelection.count === 1) {
        // 处理选中的图片 - 传null让函数内部调用getSelectionImage
        processRemoveBackground(null);
      } else {
        setRemoveBackground(false); // 没有可用图片时重置开关
        setSysError({
          status: true,
          type: 'backgroundRemoval',
          errMsg: 'Please select or upload an image first'
        });
      }
    } else {
      // 重置已移除背景的图像状态，确保使用原图
      setRemovedBgImage(null);
      // 确保预览能刷新显示
      setPreviewReady(false);
      setTimeout(() => setPreviewReady(true), 50);
    }
  }, [removeBackground, file, currentSelection.count]);

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
      {sysError?.status && sysError.type==='imageFillError' && (
        <Alert
          tone="critical"
          onDismiss={() => setSysError({ status: false, type: "", errMsg: "" })}
        >
          {sysError.errMsg}
        </Alert>
      )}
      <Rows spacing="1.5u">
        <>
        {currentSelection.count === 0 && (
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
                  setFile(false); // 将 null 改为 false
                  setFileName('');
                  setSysError({ status: false, type: "", errMsg: "" }); // 清除错误状态
                }}
              />
            )}
          </>
        )}
        </> 
         {/* 如果了多个图片 */}
          {currentSelection && currentSelection.count > 1 && (
            <Alert
            title="Only one image can be processed at a time."
            tone="critical"
            // onDismiss={() => {}}
            >
              Please select a single image in your design.
              </Alert>
            )} 
        {(file || (currentSelection.count === 1)) && !(sysError?.status && sysError.type === "fileSize") && (
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
                {(imgPreviewUrl || imgSelectionUrl) && (
                  <>
                    <img
                      ref={imageRef}
                      src={removeBackground && removedBgImage 
                        ? removedBgImage 
                        : (currentSelection.count === 1 ? imgSelectionUrl! : imgPreviewUrl!)}
                      alt={fileName}
                      onLoad={() => {
                        // Image loaded, trigger preview rendering
                        setPreviewReady(true);
                      }}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                    />
                    
                    {/* 加载遮罩 */}
                    {isRemovingBackground && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          backgroundColor: 'rgba(240, 240, 240, 0.7)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 10,
                          borderRadius: '8px',
                        }}
                      >
                        <LoadingIndicator size="small"/>
                        <Text tone="secondary" size="small">
                          Removing background...
                        </Text>
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
                            : (currentSelection.count === 1 ? imgSelectionUrl! : imgPreviewUrl!)})`,
                          maskSize: '100% 100%',
                          WebkitMaskImage: `url(${removeBackground && removedBgImage 
                            ? removedBgImage 
                            : (currentSelection.count === 1 ? imgSelectionUrl! : imgPreviewUrl!)})`,
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
                            : (currentSelection.count === 1 ? imgSelectionUrl! : imgPreviewUrl!)})`,
                          maskSize: '100% 100%',
                          WebkitMaskImage: `url(${removeBackground && removedBgImage 
                            ? removedBgImage 
                            : (currentSelection.count === 1 ? imgSelectionUrl! : imgPreviewUrl!)})`,
                          WebkitMaskSize: '100% 100%',
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                    
                    {colorMode === 'gradients' && (
                      <GradientDirectionControl
                        colorStops={gradientColors}
                        onChange={setGradientAngle}
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
                            : (currentSelection.count === 1 ? imgSelectionUrl! : imgPreviewUrl!)})`,
                          maskSize: '100% 100%',
                          WebkitMaskImage: `url(${removeBackground && removedBgImage 
                            ? removedBgImage 
                            : (currentSelection.count === 1 ? imgSelectionUrl! : imgPreviewUrl!)})`,
                          WebkitMaskSize: '100% 100%',
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                  </>
                )}
             </div>
             {/* <Columns alignY="center" align="spaceBetween" spacing="1u"> */}
                {/* <Column width="content">
                  <Text><b>Remove image background</b></Text>
                </Column> */}
                {/* <Column width="content"> */}
                <Box paddingBottom="0.5u">
                  <Switch
                    value={removeBackground}
                    label="Remove background"
                    description="Ideal for simple backgrounds and Canva's BG Remover works best for complex images."
                    onChange={(value)=>{
                      setRemoveBackground(value);
                    }}
                  />
                </Box>
                {/* </Column> */}
             {/* </Columns> */}
             <SegmentedControl
                defaultValue="gradients"
                options={[
                  {
                    label: 'Gradients',
                    value: 'gradients'
                  },
                  {
                    label: 'One color',
                    value: 'onecolor'
                  }
                ]}
                onChange={(value)=>{
                  setColorMode(value);  
                }}
            />
            {colorMode === 'gradients' && (
              <>
                <Box paddingY="0">
                  <Text>
                    <b>Gradient colors</b>
                  </Text>
                  <GradientPicker
                    onChange={(colors) => {
                      setGradientColors([...colors]);
                    }}
                  />
                </Box>
                <Box>
                  <Text>
                    <b>Transparency</b>
                  </Text>
                  <Box paddingStart="1.5u">
                    <Slider
                      defaultValue={transparency}
                      max={100}
                      min={0}
                      step={1}
                      onChange={(value) => setTransparency(value)}
                    />
                  </Box>
                </Box>
                <Box>
                  <Text>
                    <b>Noise level</b>
                  </Text>
                  <Box paddingStart="1.5u">
                    <Slider
                      defaultValue={noiseLevel}
                      max={100}
                      min={0}
                      step={1}
                      onChange={(value) => setNoiseLevel(value)}
                    />
                  </Box>
                </Box>
              </>
            )}
           
            {colorMode === 'onecolor' && (
              <Rows spacing="2u">
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
                          // closeColorSelector();
                        }}
                      />
                  </Column>
                </Columns>
                <Box>
                  <Text>
                    <b>Transparency</b>
                  </Text>
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
                </Box>
              </Rows>
            )}
            <Box paddingTop="2u" paddingBottom="1.5u" display="flex" flexDirection="column" alignItems="center">
              <Button
                variant="primary"
                onClick={startFill}
                stretch
                loading={isGenerating ? true : undefined}
                disabled={isGenerating}
              >
                Generate
              </Button>
            </Box>
          </>
        )}
      </Rows>
    </div>
  );
};

