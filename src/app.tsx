import {
  Button,
  Columns,
  FormField,
  Rows,
  Text,
  TextInput,
  ColorSelector,
  FileInput,
  Grid,
  Box,
  Title,
  Slider,
  Link,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  TabPanels,
  ArrowLeftIcon,
  VideoCard,
  FileInputItem,
  SegmentedControl,
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
  Badge,
  LockClosedIcon,
  PlayFilledIcon,
} from "@canva/app-ui-kit";
// import { addNativeElement } from "@canva/design";
import * as React from "react";
//@ts-ignore
import styles from "styles/components.css";
import { useAddElement } from "utils/use_add_element";

import createPercentFill from "./CreatePercentFill";
import createPercentFillV2 from "./CreatePercentFillV2";
import createPercentFillV3 from "./CreatePercentFillV3";
import createLabel from "./CreateLabel";
import createSvgFill from "./CreateSvgFill"
import createSvgFillV2 from "./CreateSvgFillV2"
import createSvgFillV3 from "./CreateSvgFillV3"
import { track, TrackEvents } from "utils/track";

// import { app, analytics } from './firebase'; // 引入 Firebase 配置
import {auth} from "@canva/user"
// import { getToken,setToken } from "./tokenManager";
import {login} from "./account";
import { subCredits } from './account';
import { getPlatformInfo,requestOpenExternalUrl } from "@canva/platform";
// Images, plaintext, and videos
// import { selection } from "@canva/design";
import { getTemporaryUrl } from "@canva/asset";
import { useSelection } from "utils/use_selection_hook";
import { addElementAtPoint, GroupContentAtPoint } from "@canva/design";

type segment = {
  // 图例颜色，也会用在填充颜色
  name:string;
  color:string;
  // 数值，可控制填充比例
  value:number| undefined;
  opacity:number;
}

// 添加类型定义
interface UnitChartConfig {
  totalCount: number;
  defaultColor: string;
  fillCount: number;
  fillColor: string;
  spacing: number;  // 新增
  itemsPerRow: number;  // 新增
}

interface SvgConfig {
  svgUrl: string;
  name: string;
  color: string;
  value: number | undefined;
  backgroundColor: string; // 添加背景色属性
  fillTransparency?:number;
  remainingTransparency?:number;
}

interface liquidfillConfig {
  percentage:number;
  remainingTransparency?:number;
}

// 定义类型
interface ImgConfig {
  value: number;
  color: string;
  backgroundColor: string;
}

type icon = {
  url:string;
  name:string;
  id:number
}

const defaultSegment:segment[] = 
[
  {
    name:"Segment 1",
    color:"#dbdbdb",
    value:0,
    opacity:60
  }
]

const defaultSvgConfig: SvgConfig =
{
    svgUrl:"",
    name:"label",
    color: "#000000",
    value: 0,
    backgroundColor: "#dbdbdb", // 设置默认背景色,
    fillTransparency:100,
    remainingTransparency:40
}
const defaultLiquidfillConfig: liquidfillConfig =
{
    percentage:20,
    remainingTransparency:40
}

type ImageElement = {
  type: "IMAGE";
  dataUrl: string;
  width: number;
  height: number;
  top: number;
  left: number;
};

type TextElement = {
  type: "TEXT";
  children: [string];
  fontSize: number;
  textAlign: "center" | "start" | "end" | undefined;
  top: number;
  left: number;
};

type user = {
  userid:string,
  brandId:string,
  status?:string,
  shape_fill_credits?:number,
  image_fill_credits?:number,
  variant_id?:number,
  productId?:number,
  ends_at?:string
}

type CanvasElement = ImageElement | TextElement;

type error = {
  status:boolean,
  type:string,
  errMsg:string
}

const API_BASE_URL = 'https://percentfill-backend--partfill.us-central1.hosted.app';
// const API_BASE_URL = 'http:localhost:3000';

// 根节点定义
export const App = () => {
  const addElement = useAddElement();
  // 图片自定义填充时各区域数据
  const [segments,setSegments] = React.useState<segment[]>(defaultSegment)
  // 是否正在进行图片填充
  const [isGenerating, setIsGenerating] = React.useState<boolean>(false);
  // 图片填充模式下的填充方向
  const [fillPattern,setFillPattern] = React.useState<string|null>('vertical');
  // icon 填充模式下的编辑模式,color 或 transparency
  const [iconFillMode,setIconFillMode] = React.useState<'color' | 'transparency' | 'stacked' | 'stacked2'|'iconunitchart'|'iconunitchart-transparency'>('color');
  // 图片填充模式下的编辑模式,color 或 transparency
  const [imageFillMode,setImageFillMode] = React.useState<string|null>('stacked');
  const [error, setError] = React.useState<string | boolean>(false);
  // 图片填充模式下上传的文件
  const [file,setFile] = React.useState<string| boolean>(false);
  // 户信息
  const [user, setUser] = React.useState<user | null>(null);
  // 用户可用额度
  const [credits, setCredits] = React.useState<number>();
  // 控制shapefill情况下的一级和二界面
  const [currentPage, setCurrentPage] = React.useState('main'); // 用于跟踪当前页面
  // 创建状态用于跟踪选中的图标
  const [selectedIcon, setSelectedIcon] = React.useState<number | null>(null);
  // 选择的 svg填充模式参数
  const [svgConfig,setSvgConfig] = React.useState<SvgConfig>(defaultSvgConfig);
  const [liquidfillConfig,setLiquidfillConfig] = React.useState<liquidfillConfig>(defaultLiquidfillConfig);
  // 默认获取 icon 的数据
  const [icons, setIcons] = React.useState<icon[]>([]); // 初始化 iconData 状态为空数组
  // 搜索列表
  const [iconsResult, setIconsResult] = React.useState<icon[]>([]); // 初始化 iconData 状态为空数组
  // 在组件顶部添加状态
  const [imgConfig, setImgConfig] = React.useState<ImgConfig>({
  value: 50,                // 默认填充百分比
  color: '#2196F3',        // 默认填充颜色
  backgroundColor: '#E0E0E0'  // 默认背景颜色
});
  // 在组件内部添加新的状态
  const [searchKeyword, setSearchKeyword] = React.useState('');
  const [shouldRefreshData, setShouldRefreshData] = React.useState(true);
  // const [selectedOption, setSelectedOption] = React.useState('select');
  const [selectedIconOption, setSelectedIconOption] = React.useState('library');
  const [activeTab, setActiveTab] = React.useState<'shapefill' | 'imagefill'>('shapefill');
  const [hasSearchResults, setHasSearchResults] = React.useState(true);
  // 添加一个新的状态来存储文件
  const [fileName, setFileName] = React.useState<string>('');
  const [svgName, setSvgName] = React.useState<string>('');
  // 取 canva 画布中选中的图片
  const currentSelection = useSelection("image");
  // 获取用户上传的 svg 图片
  const [uploadedSvg, setUploadedSvg] = React.useState<File | null>(null);
  // 初始化错误信息
  const [sysError,setSysError] = React.useState<error>();
  // 用户状态标识
  const [isOffline, setIsOffline] = React.useState(false);
  const [isLogined, setIsLogined] = React.useState(false);
  const [tipStatus, setTipStatus] = React.useState(true);
  const [removeBackground, setRemoveBackground] = React.useState(false);
  const [svgPreviewUrl, setSvgPreviewUrl] = React.useState<string | null>(null);
  const [imgPreviewUrl, setImgPreviewUrl] = React.useState<string | null>(null);
  const [imgSelectionUrl, setImgSelectionUrl] = React.useState<string | null>(null);
  const [proMonthLink, setProMonthLink] = React.useState('https://funkersoft.lemonsqueezy.com/buy/13434505-1d74-46e7-9d6d-59ee48bbb404');
  const [proAnnualLink, setProAnnualLink] = React.useState('https://funkersoft.lemonsqueezy.com/buy/1e39fbdd-d986-429c-a1a0-1c3b3ea385d2');
  const proMonthID = 524259;
  const proAnnualID = 524260;
  const [canAcceptPayments, setCanAcceptPayments] = React.useState<boolean>(true);
  const [iconSegments, setIconSegments] = React.useState<segment[]>([
    { name: 'Segment 1', color: '#6C5CE7', value: 30, opacity: 100 },
    { name: 'Segment 2', color: '#00B894', value: 40, opacity: 80 },
  ]);
  // 在组件顶部添加状态
  const [unitChartConfig, setUnitChartConfig] = React.useState<UnitChartConfig>({
    totalCount: 10,
    defaultColor: "#A5DEF2",  // 默认浅蓝色
    fillCount: 6,
    fillColor: "#3498DB",      // 默认深蓝色
    spacing: 10,     // 默认间距为 10
    itemsPerRow: 10  // 默认值
  });
  const [liquidFillValue, setLiquidFillValue] = React.useState<number>(0);
  const [liquidFillTransparency, setLiquidFillTransparency] = React.useState<number>(60);

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

  // React.useEffect(() => {
  //   const platformInfo = getPlatformInfo();
  //   setCanAcceptPayments(platformInfo.canAcceptPayments);
  // }, []); // 空依赖数组表示只在组件挂载时执行一次
  // 添加处理 visibility change 的函数
  const handleVisibilityChange = React.useCallback(async () => {
    if (document.visibilityState === 'visible') {
      // 当页面重新可见时，刷新用数据
      try {
        const token = await auth.getCanvaUserToken();
        const userInfo = await login(token);
        setUser(userInfo as any);
        setCredits(userInfo.shape_fill_credits);
        setIsOffline(false);
        setIsLogined(true);
        // 重置提示状态，这样用户可以看到新的提示（如果需要）
        setTipStatus(true);
      } catch (error) {
        console.error('Failed to refresh user info:', error);
      }
    }
  }, []);

  // 添加和移除 visibility change 监听器
  React.useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 清理函数
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  const addSegment = () => {
    const newSegment: segment = {
      name: `Segment ${segments.length + 1}`,
      color: "#000000", // 默认颜色，可以动态修改
      value: 0 ,// 默认百分比值
      opacity:60
    };
    setSegments([...segments, newSegment]);
  };

  const getUserInfo = React.useCallback(async () => {
    try {
      const token = await auth.getCanvaUserToken();
      // setToken(token);
      const userInfo = await login(token);
      setUser(userInfo as any);
      setCredits(userInfo.shape_fill_credits);
      setIsOffline(false); // 重置离线状态
      setIsLogined(true);
      return token;
    } catch (error) {
      // 无法正常获取 token 时，给个空token
      // const token ='';
      console.error('Failed to get user info:', error);
      setIsOffline(true); // 设置离线状态
      setIsLogined(false); // 设置离线状态
      // setToken(null);
      throw error;
    }
  }, []);
  const fetchIconData = React.useCallback(async (token: string) => {
    try {
      const response = await fetch("https://percentfill-backend--partfill.us-central1.hosted.app/api/icons", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        mode: "cors",
      });
      const data = await response.json();
      setIcons(data);
      
      // 如果有图标数据，自动选中第一个
      if (data.length > 0) {
        setSelectedIcon(data[0].id);
        setSvgConfig(prevConfig => ({
          ...prevConfig,
          svgUrl: data[0].url
        }));
      }
    } catch (error) {
      console.error('Error fetching icon data:', error);
    }
  }, []);


  React.useEffect(() => {
    if (shouldRefreshData) {
      const refreshData = async () => {
        const token = await getUserInfo();
        await fetchIconData(token);
        setShouldRefreshData(false);
      };
      refreshData();
    }
  }, [shouldRefreshData, getUserInfo, fetchIconData]);

  React.useEffect(() => {
    if (searchKeyword === '') {
      setIconsResult(icons);
      setHasSearchResults(icons.length > 0);
    }
  }, [searchKeyword, icons]);

  // 删除 segment 的函数
  const removeSegment = (indexToRemove: number) => {
    setSegments((prevSegments) =>
      prevSegments.filter((_, index) => index !== indexToRemove)
    );
  };
  const readSvgFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') {
          // 检查读取的内容是否是有效的 SVG
          if (e.target.result.includes('<svg')) {
            resolve(e.target.result);
          } else {
            reject(new Error('The uploaded file does not appear to be a valid SVG'));
          }
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      reader.onerror = (e) => reject(new Error('Error reading file'));
      reader.readAsText(file); // 使用 readAsText 来读取文件内容
    });
  };
  async function directToLs(url) {
    if (!user?.userid) return; // 防御性检查，确保 userId 存在
    const lsURL = `${url}?checkout[custom][user_id]=${user.userid}`;
    const status = getPlatformInfo().canAcceptPayments;
    setCanAcceptPayments(status);
    if(status){
      const response = await requestOpenExternalUrl({
        url: lsURL,
      });
    }else{
      // 当不能支付时，重新显示提示
      setTipStatus(true);
    }
  }

  const backToShapeFill = () => {
    setCurrentPage('main'); // 返回主页面
  };

  const goToIconList = () => {
    setCurrentPage('icons'); // 切到二级页面
    setIconsResult(icons);
    track({
      eventType: TrackEvents.SEE_ALL_ICONS,
      element: 'iconfill_tab_icons_seeall',
      result: JSON.stringify({
        mode: iconFillMode,
        config: iconFillMode === 'iconunitchart' ? unitChartConfig : svgConfig
      })
    });
  };

  const startSvgFill = async () => {
    setIsGenerating(true);
    setSysError({ status: false, type: "", errMsg: "" }); // 清除错误状态
    // const token = getToken()
    const token = await auth.getCanvaUserToken();
    try {
      let svgContent: string;
      
      if (selectedIconOption === 'library' && selectedIcon !== null) {
        // 从库中选择的 SVG，使用 URL
        const selectedIconData = icons.find(icon => icon.id === selectedIcon);
        if (!selectedIconData) {
          throw new Error('Selected icon not found');
        }
        // 要改为通过后端服务获取
        const params = {
          id: selectedIconData.id.toString()
        };
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`https://percentfill-backend--partfill.us-central1.hosted.app/api/icon?${queryString}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          mode: "cors", // 启用跨域请求
        });
        // const response = await fetch(selectedIconData.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch SVG: ${response.statusText}`);
        }
        svgContent = await response.text();
        console.log('Fetched SVG from URL');
      } else if (selectedIconOption === 'uploadSvg' && uploadedSvg) {
        // 用户上传的 SVG，读取文件内容
        svgContent = await readSvgFile(uploadedSvg);
        console.log('Read uploaded SVG');
      } else {
        throw new Error('No SVG selected or uploaded');
      }
      if (!svgContent.includes('<svg')) {
        throw new Error('Invalid SVG content');
      }
      let result;
      if (iconFillMode === 'iconunitchart'||iconFillMode === 'iconunitchart-transparency') {
        // 创建两个版本的图标：默认颜色和填充颜色
        let defaultColorIcon, fillColorIcon;
        if(iconFillMode === 'iconunitchart'){
          defaultColorIcon = await createSvgFill(
            svgContent,
            unitChartConfig.defaultColor,
            100,
            unitChartConfig.defaultColor
          );
          fillColorIcon = await createSvgFill(
              svgContent,
              unitChartConfig.fillColor,
              100,
              unitChartConfig.fillColor
          );
        }else{
          defaultColorIcon = await createSvgFillV2(
            svgContent,
            0,  // value
            30    // remainingTransparency
          );
          fillColorIcon = await createSvgFillV2(
            svgContent,
            100,  // value
            40    // remainingTransparency
          );
        }
      
        // 计算布局参数
        const spacing = 10;
        // const itemsPerRow = Math.min(10, unitChartConfig.totalCount);
        // 使用配置的每行元素数
        const itemsPerRow = unitChartConfig.itemsPerRow;
        const rows = Math.ceil(unitChartConfig.totalCount / itemsPerRow);
      
        // 准备所有图标元素
        const children: GroupContentAtPoint[] = [];
        
        for (let i = 0; i < unitChartConfig.totalCount; i++) {
          const row = Math.floor(i / itemsPerRow);
          const col = i % itemsPerRow;
          const x = col * (50 + spacing);  // 使用固定宽度 50
          const y = row * (50 + spacing);  // 使用固定高度 50
      
          children.push({
            type: "image",
            altText: undefined,
            dataUrl: i < unitChartConfig.fillCount ? fillColorIcon.url : defaultColorIcon.url,
            width: 50,  // 使用固定宽度
            height: 50, // 使用固定高度
            top: y,
            left: x,
          });
        }

        // 添加元素组到画布
        addElementAtPoint({
          type: "group",
          children: children,
        });
      }else if (iconFillMode === 'stacked' || iconFillMode === 'stacked2') {
          result = await createSvgFillV3(svgContent, iconSegments.map(segment => ({
            ...segment,
          value: segment.value || 0 // Ensure value is never undefined
        })), iconFillMode);
      } else if (iconFillMode === 'color') {
        result = await createSvgFill(
          svgContent,
          svgConfig.color,
          svgConfig.value ?? 0,
          svgConfig.backgroundColor
        );
      } else {
        result = await createSvgFillV2(
          svgContent,
          svgConfig.value ?? 0,
          svgConfig.remainingTransparency ?? 0
        );
      }
    if (iconFillMode !== 'iconunitchart' && iconFillMode !== 'iconunitchart-transparency') {
      // 设置固定的基准尺寸
    const baseSize = 50; // 基准尺寸
    const aspectRatio = result.viewBoxWidth / result.viewBoxHeight;
    // 计算实际渲染尺寸，保持宽高比
    let renderWidth = baseSize, renderHeight = baseSize;
    if (aspectRatio > 1) {
      renderWidth = baseSize;
      renderHeight = baseSize / aspectRatio;
    } else {
      renderHeight = baseSize;
      renderWidth = baseSize * aspectRatio;
    }
     // 计算文字位置，使其位于 SVG 下方并居中
     // 确保宽度不为空
     renderWidth = renderWidth || baseSize;
     renderHeight = renderHeight || baseSize;
     const textTop = renderHeight * 1.1; // 文字距离 SVG 底部 5 个单位
    //  const textLeft = renderWidth / 2 - (fontSize * String(svgConfig.value).length) / 4 ; // 粗�����计文字宽度并居中
      const children: GroupContentAtPoint[] = [
        {
          type: "image",
          altText: undefined,
          dataUrl: result.url,
          width: renderWidth,
          height: renderHeight,
          top: 0,
          left: 0,
        }
      ];

      // 根据不同的填充模式添加不同的文本标签
      if (iconFillMode === 'stacked' || iconFillMode === 'stacked2') {
        // 为每个段落添加标签和文本
        const totalSegments = iconSegments.length;
        const verticalSpacing = 15; // 每行的垂直间距
        const totalLabelsHeight = totalSegments * verticalSpacing; // 总标签区域高度
        // 计算标签区域的起始位置，使其与图标垂直居中
       const startY = (renderHeight - totalLabelsHeight) / 2;
        // 为每个段添加标签
        for (let i = 0; i < iconSegments.length; i++) {
          const segment = iconSegments[i];
          const labelSize = Math.max(10, Math.min(renderWidth, renderHeight) * 0.05);
          const {labelUrl, labelWidth, labelHeight} = await createLabel(segment.color, labelSize, labelSize);
          
        if (fillPattern === 'vertical') {
        // 计算位置
        const spacing = 10; // 水平间距
        const labelLeft = renderWidth + spacing; // 标签位置在图标右侧
        const textLeft = labelLeft + labelWidth + spacing; // 文本位置在标签右侧
        const topOffset = startY + (i * verticalSpacing); // 考虑居中的垂直位置
        
        // 添加颜色标签
        children.push({
          type: "image",
          altText: undefined,
          dataUrl: labelUrl,
          width: labelWidth,
          height: labelHeight,
          top: topOffset,
          left: labelLeft,
        });
        
        // 添加文本
        children.push({
          type: "text",
          children: [`${segment.name}: ${segment.value}%`],
          fontSize: 10, // 调整字体大小
          textAlign: "start", // 左对齐
          width: renderWidth * 2, // 确保文本有足够空间
          top: topOffset,
          left: textLeft,
        });
      }
      
     }
    } else {
        // 原有的单一文本标签
        children.push({
          type: "text",
          width: renderWidth,
          children: [`${svgConfig.value}%`],
          fontSize: 10,
          textAlign: "center",
          top: textTop,
          left: 0,
        });
      }
      addElementAtPoint({
        type: "group",
        children: children,
      });
     }
      const updatedUser = await subCredits(token,"shapeFill")
      setCredits(updatedUser.shape_fill_credits)
      setUser(prevUser => prevUser ? { ...prevUser, shape_fill_credits: updatedUser.shape_fill_credits } : null);
      setIsGenerating(false);
      track({
        eventType: TrackEvents.GENERATE_ICON,
        element: 'iconfill_tab_generate_button',
        result: JSON.stringify({
          mode: iconFillMode,
          config: iconFillMode === 'iconunitchart' ? unitChartConfig : svgConfig
        })
      });
      if (iconFillMode !== 'iconunitchart' && iconFillMode !== 'iconunitchart-transparency') {
        const requestData = {
          resultUrl:result.url
         }
         const response = await fetch(`${API_BASE_URL}/api/record`, {
           method: "POST",
           headers: {
             "Content-Type": "application/json",
             "Authorization": `Bearer ${token}`,
           },
           mode: "cors", // 启用跨域请求
           body: JSON.stringify(requestData),
         });
      }
    } catch (error) {
      console.error('Error in startSvgFill:', error);
      // 已知错误
      if (error instanceof Error) {
        setSysError({status:true,type: 'svgFillError',errMsg: error.message, });
        // 未知错误
      } else {
        setSysError({status:true,type: 'svgFillError',errMsg: 'An unexpected error occurred' }
        );
      }
    } finally {
      setIsGenerating(false);
    }
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
    } catch (error) {
      console.log(error);
    }
  }

  // 在组件加载时或选择更改时调用 getSelectionImageUrl
  React.useEffect(() => {
    if (currentSelection.count === 1) {
      getSelectionImageUrl();
    }
  }, [currentSelection]);

  const startFill = async ()=>{
    setIsGenerating(true);
    setSysError({ status: false, type: "", errMsg: "" }); // 清除错误状态
    // const token = getToken()
    if(!fillPattern){
      setSysError({ status: true, type: "datanull", errMsg: "pleast select fill direction" })
      setIsGenerating(false);
      return;
    }
    try {
      // 获取抠图+比例填充后的图像、和对应的高和宽
      let originImage:string
      // 执行下读取 canva 图片元素的操作,执行前确保用户只选择了 1 张图片
      if(currentSelection.count>1){
        // setSysError({status: true, type: "imageError", errMsg: "lease select only one image"});
        return;
      }
      if(currentSelection.count==1){
        originImage = await getSelectionImage()
        // 判断能否成功读取用户选择的文件
        if (!originImage) {
          throw new Error('Failed to get selected image');
        }
      }else{
        originImage = file as string
      }  
      let imgUrl, imgWidth, imgHeight;
      if (imageFillMode === 'unitchart2') {
        // 创建两个版本的图片：填充和未填充
        const defaultColorImg = await createPercentFillV2(
          originImage,
          0,               // percentage 为 0
          40,              // transparency 为 40
          removeBackground
        );
        
        const fillColorImg = await createPercentFillV2(
          originImage,
          100,             // percentage 为 100
          40,              // transparency 为 40
          removeBackground
        );
      
        // 计算布局参数
        const spacing = unitChartConfig.spacing;
        const itemsPerRow = unitChartConfig.itemsPerRow;
        const rows = Math.ceil(unitChartConfig.totalCount / itemsPerRow);
      
        // 准备所有图标元素
        const children: GroupContentAtPoint[] = [];
        
        for (let i = 0; i < unitChartConfig.totalCount; i++) {
          const row = Math.floor(i / itemsPerRow);
          const col = i % itemsPerRow;
          const x = col * (defaultColorImg.imgWidth + spacing);
          const y = row * (defaultColorImg.imgHeight + spacing);
      
          children.push({
            type: "image",
            altText: undefined,
            dataUrl: i < unitChartConfig.fillCount ? fillColorImg.imgUrl : defaultColorImg.imgUrl,
            width: defaultColorImg.imgWidth,
            height: defaultColorImg.imgHeight,
            top: y,
            left: x,
          });
        }
      
        // 添加元素组到画布
        addElementAtPoint({
          type: "group",
          children: children,
        });
      }
      if(imageFillMode === 'unitchart'){
          // 创建两个版本的图片：默认颜色和填充颜色
          const defaultColorImg = await createPercentFillV3(
            originImage, 
            unitChartConfig.defaultColor, 
            100, // 完全不透明
            removeBackground
          );
          
          const fillColorImg = await createPercentFillV3(
            originImage, 
            unitChartConfig.fillColor, 
            100, // 完全不透明
            removeBackground
          );

          // 使用配置中的 spacing 值，而不是硬编码的 10
          const spacing = unitChartConfig.spacing;
          // const itemsPerRow = Math.min(10, unitChartConfig.totalCount);
          const itemsPerRow = unitChartConfig.itemsPerRow;
          const rows = Math.ceil(unitChartConfig.totalCount / itemsPerRow);

          // 准备所有图标元素
          const children: GroupContentAtPoint[] = [];
          
          for (let i = 0; i < unitChartConfig.totalCount; i++) {
            const row = Math.floor(i / itemsPerRow);
            const col = i % itemsPerRow;
            const x = col * (defaultColorImg.imgWidth + spacing);
            const y = row * (defaultColorImg.imgHeight + spacing);

            children.push({
              type: "image",
              altText: undefined,
              dataUrl: i < unitChartConfig.fillCount ? fillColorImg.imgUrl : defaultColorImg.imgUrl,
              width: defaultColorImg.imgWidth,
              height: defaultColorImg.imgHeight,
              top: y,
              left: x,
            });
          }

          // 添加元素组到画布
          addElementAtPoint({
            type: "group",
            children: children,
          });
      } else if(imageFillMode === 'stacked' || imageFillMode === 'stacked2') {
        ({ imgUrl, imgWidth, imgHeight } = await createPercentFill(originImage, segments, fillPattern as string, removeBackground));
      } else if(imageFillMode === 'liquidfill'){
        ({ imgUrl, imgWidth, imgHeight } = await createPercentFillV2(originImage, liquidFillValue, liquidFillTransparency as number, removeBackground));
      } else if(imageFillMode === 'simplepictorial'){
        ({ imgUrl, imgWidth, imgHeight } = await createPercentFillV3(originImage, simplePictorialConfig.color,simplePictorialConfig.transparency, removeBackground));
      }
      if (imageFillMode === 'imgpictorial1') {
        // 创建两段填充：底部是填充颜色，顶部是背景颜色
        const segments = [      
          {
            name: 'Background',
            color: imgConfig.backgroundColor,
            value: 100 - imgConfig.value,  // 剩余部分
            opacity: 100
          },
          {
            name: 'Fill',
            color: imgConfig.color,
            value: imgConfig.value,
            opacity: 100
          },
        ];
      
        // 使用 createPercentFill 进行两段式填充
         ({ imgUrl, imgWidth, imgHeight } = await createPercentFill(
          originImage,
          segments,
          'vertical',  // 垂直方向填充
          removeBackground
        ));
      
        // 直接添加处理后的图片
        addElementAtPoint({
          type: "image",
          altText: undefined,
          dataUrl: imgUrl,
        });
      }
      // 初始化 children 用于存放所有的动态生成元素
      if(imageFillMode === 'stacked' || imageFillMode === 'stacked2'){
        const children: GroupContentAtPoint[] = [];
        children.push(
          {
            type: "image",
            altText:undefined,
            dataUrl: imgUrl,
            width:imgWidth,
            height:imgHeight,
            top:0,
            left:0,
          }
        )
        const segmentPromises = segments.map(async (segment, index) => {
          const labelSize = Math.max(30, Math.min(imgWidth, imgHeight) * 0.05); // 动态计算标签大小
          const {labelUrl,labelWidth,labelHeight} = await createLabel(segment.color,labelSize,labelSize)
          
          if(fillPattern === 'verticle'){
            const topOffset = imgHeight / 2 - 40 + index * 70;
            children.push({
              type: "image",
              altText:undefined,
              dataUrl: labelUrl,
              width: labelWidth,
              height: labelHeight,
              top: topOffset + (90 - labelHeight) / 2,
              left: imgWidth + 5,
            });
            // 推送 TEXT 元素
            children.push({
              type: "text",
              children: [`${segment.name}: ${segment.value}%`],
              fontSize: 64,
              textAlign: "center",
              top: topOffset,
              left: imgWidth + labelWidth + 14,
            });
          } else {
            // 水平填充时的布局逻辑
            const totalSegments = segments.length;
            const spacing = Math.max(10, imgWidth * 0.01); // 动态计算间距
            const fontSize = Math.max(16, Math.min(imgWidth, imgHeight) * 0.08); // 动态计算字体大小
            const labelTextWidth = fontSize * 10; // 估计的标签文字宽度
            const elementWidth = labelWidth + labelTextWidth + spacing;
            const totalWidth = elementWidth * totalSegments;
            
            // 计算起始位置，使元素居中
            const startX = (imgWidth - totalWidth) / 2;
            
            // 计每个元素的位置
            const leftOffset = startX + index * elementWidth;
            
            // 添加标签图像
            children.push({
              type: "image",
              altText:undefined,
              dataUrl: labelUrl,
              width: labelWidth,
              height: labelHeight,
              top: imgHeight + spacing,
              left: leftOffset,
            });
            
            // 添加文字
            children.push({
              type: "text",
              children: [`${segment.name}: ${segment.value}%`],
              fontSize: fontSize,
              textAlign: "start",
              top: imgHeight + spacing + (labelHeight - fontSize) / 2, // 直居中对齐文字
              left: leftOffset + labelWidth + spacing,
            });
          }
        });
        await Promise.all(segmentPromises);
  
        addElementAtPoint({
          type:"group",
          children:children,
        });
      }else if(imageFillMode === 'simplepictorial' || imageFillMode === 'liquidfill'){
        addElementAtPoint({
            type: "image",
            altText:undefined,
            dataUrl: imgUrl,
        })
      }
      // 扣 credits 逻辑
      const token = await auth.getCanvaUserToken();
      const updatedUser = await subCredits(token, "imageFill");
      setCredits(updatedUser.image_fill_credits);
      setUser(prevUser => prevUser ? { ...prevUser, image_fill_credits: updatedUser.image_fill_credits } : null);
      setIsGenerating(false);
      track({
        eventType: TrackEvents.GENERATE_IMAGE,
        element: 'imagefill_tab_generate_button',
        result: JSON.stringify({
          mode: fillPattern,
          config: segments
        })
      })
      if(imageFillMode !== 'unitchart'){
        const requestData = {
        resultUrl:imgUrl
        }
        const response = await fetch(`${API_BASE_URL}/api/record`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          mode: "cors", // 启用跨域请求
          body: JSON.stringify(requestData),
        });
      }
    } catch (e: any) {
      console.error('Error in startFill:', e); 
      setSysError({
        status:true,
        type:'imageFillError',
        errMsg:e
      });   
      // setErrorMessage(
      //   `error`
      // );
    }finally{
      setIsGenerating(false);
    }
  }

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
  // 处理icon的选中状态
  const handleIconClick = (icon:icon) => {
    setSelectedIcon(icon.id);
    setSvgConfig(prevConfig => ({
      ...prevConfig,
      svgUrl: icon.url
    }));
  }

  const handleIconClickInList = (icon:icon) => {
    const index = icons.findIndex((i) => i.id === icon.id);
    if (index > -1 && index !== 0) {
      const updatedIcons = [icon, ...icons.filter(i => i.id !== icon.id)];
      setIcons(updatedIcons);
    }
    
    setSelectedIcon(icon.id);
    setSvgConfig(prevConfig => ({
      ...prevConfig,
      svgUrl: icon.url
    }));

    setCurrentPage('main');
  }

  async function searchIcons(token:string,keyword: string) {
    try {
      const params = {
        keyword: keyword
      };
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`https://percentfill-backend--partfill.us-central1.hosted.app/api/iconsearch?${queryString}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        mode: "cors", // 启用跨域请求
      });
      const data = await response.json(); // 假设返回的是 JSON 格式的数据
      setIconsResult(data)
      setHasSearchResults(data.length > 0)
    } catch (error) {
      console.error('Error fetching icon data:', error); // 处理请求错误
      setHasSearchResults(false)
    }
}

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    
    const firstWord = text.split(' ')[0];
    if (firstWord.length >= maxLength) {
      return firstWord.slice(0, maxLength) + '...';
    }
    
    return text.slice(0, maxLength).trim() + '...';
  };

  function handleTabChange(id: string) {
    if(id==='shapefill'){
      setActiveTab('shapefill');
      setCredits(user?.shape_fill_credits);
      if(activeTab !== 'shapefill') {
        track({
          eventType: TrackEvents.SHOW_ICONTAB,
          element: 'iconfill_tab',
          result: ''
        })
      }
    }else{
      setActiveTab('imagefill');
      setCredits(user?.image_fill_credits);
      if(activeTab !== 'imagefill') {
        track({
          eventType: TrackEvents.SHOW_IMAGETAB,
          element: 'imagefill_tab',
          result: ''
        })
      }
    }
  }


  const processSvg = async () => {
    if (!uploadedSvg) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const svgContent = e.target?.result as string;
      
      // 这里可以直接处 SVG 内
      // 例如，可以更新 svgConfig 状态
      setSvgConfig(prevConfig => ({
        ...prevConfig,
        svgUrl: svgContent,
        name: uploadedSvg.name
      }));

      // 清除上传的文件
      setUploadedSvg(null);
    };
    reader.readAsDataURL(uploadedSvg);
  };


  const addIconSegment = () => {
    setIconSegments([
      ...iconSegments,
      { name: `Segment ${iconSegments.length + 1}`, color: '#0000FF', value: 30, opacity: 100 }
    ]);
  };

  const removeIconSegment = (index: number) => {
    setIconSegments(iconSegments.filter((_, i) => i !== index));
  };

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
// FormField组件的control属性，需要传1个可返回组件的函数，比如下文的Select就是返回的组件，组件中固定写...props，用于获取上层formfield组件的所有属性
// setInput((i) => ({ ...i, format: BarcodeFormat[value] }))，i 指代的是当前对象，..i指代当前对象的所有属性，通过后续的format赋值实现重写
  return (
    <div className={styles.scrollContainer}>
      {!canAcceptPayments && tipStatus &&(
        <Box paddingBottom="2u">
          <Alert
          title="Payments aren't available on this device. "
          tone="warn"
          onDismiss={() => {setTipStatus(false)}}
          >
          To upgrade, open this app in a web browser.
          </Alert>
        </Box>
      )}
       {((user?.status=='on-trial'||user?.status=='expired') && tipStatus && isLogined && user?.variant_id !== proMonthID && user?.variant_id !== proAnnualID && (credits ?? 0) <= 0) && activeTab=='shapefill' && (
       <Alert
          title="You don't have enough Pictogram Maker credits."
          tone="critical"
          onDismiss={() => {setTipStatus(false)}}
       >
          Try again next month, or{" "}  
          <Link
            href={`${proMonthLink}?checkout[custom][user_id]=${user?.userid}`}
            id="id"
            requestOpenExternalUrl={() => {
              Promise.all([
                directToLs(`${proMonthLink}`),
                track({
                  eventType: TrackEvents.CLICK_UPGRADE,
                  element: 'iconfill_credits0_upgrade_monthly',
                  result: canAcceptPayments ? 'redirect' : 'failed_no_payment'
                })
              ]).catch(error => {
                console.error('Error in upgrade click:', error);
              });
            }}
            title="Pictogram Maker Pro Plan"
          >
            upgrade to Pro
          </Link>
       </Alert>
    )}
    {/* {(user?.status==='active' &&tipStatus && isLogined && activeTab=='imagefill' && user?.variant_id === proMonthID && (credits ?? 0) <= 0) && (
       <Alert
          title="You don't have enough Pictogram Maker credits."
          tone="critical"
          onDismiss={() => {setTipStatus(false)}}
       >
          Try again next month, or{" "} 
          <Link
            href={`${proAnnualLink}?checkout[custom][user_id]=${user?.userid}`}
            id="id"
            requestOpenExternalUrl={() => {
              Promise.all([
                directToLs(`${proAnnualLink}`),
                track({
                  eventType: TrackEvents.CLICK_UPGRADE,
                  element: 'imagefill_credit0_upgrade_annual',
                  result: canAcceptPayments ? 'redirect' : 'failed_no_payment'
                })
              ]).catch(error => {
                console.error('Error in upgrade click:', error);
              });
            }}
            title="Pictogram Maker Pro Plan annual membership."
          >
            upgrade to Pro Annual
          </Link>
       </Alert>
    )} */}
    {currentPage==='main'&&(
      <Tabs 
        activeId={activeTab} 
        onSelect={(id)=>{
          handleTabChange(id);
      }}>
        <Rows spacing="2u">
          <TabList>
            <Tab id="shapefill" onClick={()=>{
              handleTabChange('shapefill');
            }}>
              Icon
            </Tab>
            <Tab id="imagefill" onClick={()=>{
              handleTabChange('imagefill');
            }}>
              Image
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel id="shapefill">
              {sysError?.status && sysError.type==='svgFillError' && (
                <Box paddingBottom="1u">
                  <Alert
                    tone="critical"
                    onDismiss={() => setSysError({ status: false, type: "", errMsg: "" })}
                  >
                    Sorry, we had trouble creating your pictogram. You can try again another file or contact support.
                     {/* {sysError.errMsg} */}
                  </Alert>
                </Box>
              )}
              <SegmentedControl
                defaultValue="library"
                options={[
                  {
                    label: 'Library',
                    value: 'library'
                  },
                  {
                    label: 'Upload',
                    value: 'uploadSvg'
                  }
                ]}
                onChange={(value)=>{
                  setSelectedIconOption(value);  
                  if(value==='uploadSvg'){
                    track({
                      eventType: TrackEvents.CLICK_UPLOAD_ICON,
                      element: 'iconfill_upload_tab',
                      result: ''
                    })
                  }
                  if(value==='library'){
                    track({
                      eventType: TrackEvents.CLICK_ICON_LIBRARY,
                      element: 'iconfill_library_tab',
                      result: ''
                    })
                  }
                }}
              />
              {selectedIconOption === 'library' && (
                <>
                <Box display='flex' justifyContent='spaceBetween' paddingY="1u" paddingEnd="0">
                    <Text tone='primary' variant='bold'>Select icon</Text>
                    <Text tone='secondary' size='small'>
                        <div className={styles.seeAll} onClick={() => goToIconList()}>
                            See all
                        </div>
                    </Text>
                </Box>
                  <Rows spacing="3u">
                    <Rows spacing="2u">
                     <Box paddingY="1u">
                      {icons.length === 0 &&(
                          <LoadingIndicator size="medium" />
                      )}
                      {icons.length > 0 && (
                        <Grid
                          alignY="center"
                          columns={5}
                          spacing="1u"
                        >
                          {/* 只展示 12 个元素 */}
                          {icons.slice(0, 10).map((icon, index) => (
                              <ImageCard
                                borderRadius="standard"
                                alt={icon.name}
                                ariaLabel="Select icon to be filled"
                                onClick={() => {handleIconClick(icon)}}
                                selected={selectedIcon === icon.id} // 根据 selectedIcon 状态动态设置
                                selectable
                                thumbnailPadding="1u"
                                // thumbnailHeight={50}
                                thumbnailUrl={icon.url} 
                                // thumbnailAspectRatio={1}
                              />   
                          ))}
                        </Grid>
                      )}
                     </Box>
                    </Rows>
                  </Rows> 
                 </>
                )}
                {selectedIconOption === 'uploadSvg' && (
                <Box paddingY="1.5u">
                  <FileInput
                    stretchButton
                    accept={[
                      'image/svg+xml'
                    ]}
                    onDropAcceptedFiles={(files: File[]) => {
                      const uploadedImg = files[0];
                      const maxSizeInBytes = 4 * 1024 * 1024; // 4MB
                      if (uploadedImg.size > maxSizeInBytes) {
                        setSysError({
                          status: true,
                          type: "fileSize",
                          errMsg: 'File must be 4MB or smaller to continue.'
                        });
                        return;
                      }
                      const reader = new FileReader(); // 创建FileReader对象
                      reader.onloadend = () => {
                        const base64URL = reader.result; // 获取DataURL（Base64编）
                        // setFile(base64URL as string);
                        setSvgPreviewUrl(base64URL as string); // 置用于 img 标签的 Data URL
                        setUploadedSvg(uploadedImg)
                      };
                      reader.readAsDataURL(uploadedImg); // 将文件读取为DataURL（Base64编码）
                      // 设置文件名
                      setSvgName(uploadedImg.name);
                      setSysError({ status: false, type: "", errMsg: "" }); // 清除错误状态
                    }}
                  />
                  {/* 添加错误提示的展示逻辑 */}
                  {sysError?.status && sysError.type === "fileSize" && (
                    <Box paddingY="1u">
                      <Alert
                        title="Unable to upload file."
                        tone="critical"
                        onDismiss={() => setSysError({ status: false, type: "", errMsg: "" })}
                      >
                        {sysError.errMsg}
                      </Alert>
                    </Box>
                  )}
                  {!uploadedSvg && !sysError?.status && (
                    <Box paddingY="1u">
                      <Text size="small" variant="regular" tone="tertiary">Maximum file size: 4MB. Accepted file formats: SVG.</Text>
                    </Box>
                  )}
                  {svgName && !(sysError?.status && sysError?.type === "fileSize") &&(
                    <>
                      <FileInputItem
                        label={svgName}
                        onDeleteClick={()=>{
                          setUploadedSvg(null); // 将 null 改为 false
                          setSvgName('');
                          setSysError({ status: false, type: "", errMsg: "" }); // 清除错误状态 
                        }}
                      />
                      {uploadedSvg && (
                        <div
                          style={{
                            width: "100%",
                            height: "72px",
                            borderRadius: "8px", // 设置圆角为 8px
                            background: "var(--ui-kit-color-neutral-low)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginTop: "12px"
                          }}
                        >
                          {svgPreviewUrl && (
                          <img
                            src={svgPreviewUrl}
                            alt={svgName}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '100%',
                              objectFit: 'contain',
                            }}
                          />
                        )}
                        </div>
                      )}
                    </>
                  )}
                </Box>
              )}
                  {((selectedIconOption === 'library' && selectedIcon !== null) || (selectedIconOption === 'uploadSvg' && uploadedSvg)) && (
                    <>
                      <Rows spacing="2u">
                        <Box paddingTop="1u">
                          <Text>
                            <b>Style</b>
                          </Text>
                        </Box>
                        <Grid
                          alignY="center"
                          columns={3}
                          spacing="1u"
                        >
                          <Rows spacing="1u">
                          <ImageCard
                            alt="Custom color mode"
                            ariaLabel="Custom color mode"
                            borderRadius="standard"
                            onClick={() => {
                              setIconFillMode('color');
                            }}
                            thumbnailUrl="https://percentfill.com/imageChartMaker/icon-single-color.png"                                
                            selected={iconFillMode === 'color'}
                            selectable
                            thumbnailHeight={90}
                          />
                          <Box>
                            <Text size="xsmall">
                              Color fraction
                            </Text>
                             {/* <Text
                                  size="small"
                                  tone="secondary"
                                >
                              By color control
                            </Text> */}
                          </Box>
                        </Rows>
                        <Rows spacing="1u">
                          <ImageCard
                            alt="Original color mode"
                            ariaLabel="Original color mode"
                            borderRadius="standard"
                            onClick={() => {
                              setIconFillMode('transparency');
                            }}
                            thumbnailUrl="https://percentfill.com/imageChartMaker/icon-single-transparency.png"
                            selected={iconFillMode === 'transparency'}
                            selectable
                            thumbnailHeight={90}
                          />
                          <Box>
                            <Text size="xsmall">
                              Opacity fraction
                            </Text>
                            {/* <Text
                                  size="small"
                                  tone="secondary"
                                >
                              By transparency control
                            </Text> */}
                          </Box>
                        </Rows>
                        <Rows spacing="1u">
                            <ImageCard
                              alt="Pictorial Stacked Chart"
                              ariaLabel="Pictorial Stacked Chart"
                              borderRadius="standard"
                              onClick={() => {
                                setIconFillMode('stacked');
                              }}
                              thumbnailUrl="https://percentfill.com/imageChartMaker/icon-stacked-verticle-2.png"
                              selected={iconFillMode === 'stacked'}
                              selectable
                              thumbnailHeight={90}
                            />
                            <Box>
                              <Text size="xsmall">
                                Vertical stacked
                              </Text>
                              {/* <Text
                                  size="small"
                                  tone="secondary"
                                >
                              By Vertical Stacking
                            </Text> */}
                            </Box>
                          </Rows>
                          <Rows spacing="1u">
                            <ImageCard
                              alt="Pictorial Stacked Chart"
                              ariaLabel="Pictorial Stacked Chart"
                              borderRadius="standard"
                              onClick={() => {
                                setIconFillMode('stacked2');
                              }}
                              thumbnailUrl="https://percentfill.com/imageChartMaker/icon-stacked-horizan-2.png"
                              selected={iconFillMode === 'stacked2'}
                              selectable
                              thumbnailHeight={90}
                            />
                            <Box>
                              <Text size="xsmall">
                                Horizontal stacked
                              </Text>
                              {/* <Text
                                  size="small"
                                  tone="secondary"
                                >
                              By Horizontal Stacking
                            </Text> */}
                            </Box>
                          </Rows>
                          <Rows spacing="1u">
                          <ImageCard
                            alt="Pictorial Unit Chart"
                            ariaLabel="Pictorial Unit Chart"
                            borderRadius="standard"
                            onClick={() => {
                              setIconFillMode('iconunitchart');
                            }}
                            thumbnailUrl="https://percentfill.com/imageChartMaker/icon-unitchart-color.png"                                
                            selected={iconFillMode === 'iconunitchart'}
                            selectable
                            thumbnailHeight={90}
                          />
                          <Box>
                            <Text size="xsmall">
                            Color dist
                            </Text>
                             {/* <Text
                                  size="small"
                                  tone="secondary"
                                >
                              By color control
                            </Text> */}
                          </Box>
                        </Rows>
                        <Rows spacing="1u">
                          <ImageCard
                            alt="Pictorial Unit Chart"
                            ariaLabel="Pictorial Unit Chart"
                            borderRadius="standard"
                            onClick={() => {
                              setIconFillMode('iconunitchart-transparency');
                            }}
                            thumbnailUrl="https://percentfill.com/imageChartMaker/icon-unichart-transparency.png"                                
                            selected={iconFillMode === 'iconunitchart-transparency'}
                            selectable
                            thumbnailHeight={90}
                          />
                          <Box>
                            <Text size="xsmall">
                            Opacity dist
                            </Text>
                             {/* <Text
                                  size="small"
                                  tone="secondary"
                                >
                              By transparency control
                            </Text> */}
                          </Box>
                        </Rows>
                        {(user?.status === 'on-trial' || user?.status === 'expired') && (
                        <Rows spacing="1u">
                            <ImageCard
                              alt="More style"
                              ariaLabel="More style"
                              borderRadius="standard"
                              onClick={() => {
                                handleTabChange('imagefill');  // 使用已有的 handleTabChange 函数
                              }}
                              thumbnailUrl="https://percentfill.com/imageChartMaker/ImageChart%20Maker%20UI-morestyle-2.png"
                              selectable
                              thumbnailHeight={90}
                              // bottomEnd={<LockClosedIcon />}
                            />
                            <Box>
                              <Text size="xsmall">
                              More Style
                              </Text>
                              {/* <Text
                                  size="small"
                                  tone="secondary"
                                >
                              By color control
                            </Text> */}
                            </Box>
                          </Rows>
                        )}
                        </Grid>
                        {iconFillMode === 'iconunitchart'  && (
                          <Rows spacing="2u">
                            <FormField
                              label="Total count"
                              control={(props) => (
                                <Slider
                                  value={unitChartConfig.totalCount}
                                  max={20}
                                  min={1}
                                  step={1}
                                  onChange={(value) => {
                                    setUnitChartConfig(prev => ({
                                      ...prev,
                                      totalCount: value,
                                      fillCount: Math.min(value, prev.fillCount)
                                    }));
                                  }}
                                />
                              )}
                            />

                            <FormField
                              label="Fill count"
                              control={(props) => (
                                <Slider
                                  value={unitChartConfig.fillCount}
                                  max={unitChartConfig.totalCount}
                                  min={0}
                                  step={1}
                                  onChange={(value) => {
                                    setUnitChartConfig(prev => ({
                                      ...prev,
                                      fillCount: value
                                    }));
                                  }}
                                />
                              )}
                            />
                             <FormField
                              label="Items per row"
                              control={(props) => (
                                <Slider
                                  value={unitChartConfig.itemsPerRow}
                                  max={20}
                                  min={1}
                                  step={1}
                                  onChange={(value) => {
                                    setUnitChartConfig(prev => ({
                                      ...prev,
                                      itemsPerRow: value
                                    }));
                                  }}
                                />
                              )}
                            />
                            <FormField
                              label="Default color"
                              control={(props) => (
                                <ColorSelector
                                  onChange={(color) => {
                                    setUnitChartConfig(prev => ({
                                      ...prev,
                                      defaultColor: color
                                    }));
                                  }}
                                  color={unitChartConfig.defaultColor}
                                />
                              )}
                            />

                            <FormField
                              label="Fill color"
                              control={(props) => (
                                <ColorSelector
                                  onChange={(color) => {
                                    setUnitChartConfig(prev => ({
                                      ...prev,
                                      fillColor: color
                                    }));
                                  }}
                                  color={unitChartConfig.fillColor}
                                />
                              )}
                            />
                          </Rows>
                        )}
                      {iconFillMode === 'iconunitchart-transparency' && (
                        <Rows spacing="2u">
                          <FormField
                            label="Total count"
                            control={(props) => (
                              <Slider
                                value={unitChartConfig.totalCount}
                                max={20}
                                min={1}
                                step={1}
                                onChange={(value) => {
                                  setUnitChartConfig(prev => ({
                                    ...prev,
                                    totalCount: value,
                                    fillCount: Math.min(value, prev.fillCount)
                                  }));
                                }}
                              />
                            )}
                          />

                          <FormField
                            label="Fill count"
                            control={(props) => (
                              <Slider
                                value={unitChartConfig.fillCount}
                                max={unitChartConfig.totalCount}
                                min={0}
                                step={1}
                                onChange={(value) => {
                                  setUnitChartConfig(prev => ({
                                    ...prev,
                                    fillCount: value
                                  }));
                                }}
                              />
                            )}
                          />
                          <FormField
                              label="Items per row"
                              control={(props) => (
                                <Slider
                                  value={unitChartConfig.itemsPerRow}
                                  max={20}
                                  min={1}
                                  step={1}
                                  onChange={(value) => {
                                    setUnitChartConfig(prev => ({
                                      ...prev,
                                      itemsPerRow: value
                                    }));
                                  }}
                                />
                              )}
                            />
                        </Rows>
                      )}
                      {/* 添加 segments 设置界面 */}
                        {(iconFillMode === 'stacked' || iconFillMode === 'stacked2') && (
                          <Rows spacing="1.5u">
                            {iconSegments.map((segment, index) => (
                              <Box
                                key={index}
                                background="neutralLow"
                                borderRadius="large"
                                paddingX="1.5u"
                                paddingTop="1u"
                                paddingBottom="1.5u"
                              > 
                                <Box paddingBottom="1u">
                                  <Title size="small" alignment="start">
                                    Segment {index + 1}
                                  </Title>
                                </Box>
                                <Rows spacing="1.5u">
                                  <Grid alignX="stretch" alignY="stretch" columns={1} spacing="2u">
                                    <FormField
                                      error={error}
                                      label="Label (optional)"
                                      control={(props) => (
                                        <TextInput
                                          type="text"
                                          name="label"
                                          defaultValue={segment.name || `Segment ${index + 1}`}
                                          placeholder="input label name"
                                          onChange={(data) => {
                                            const updatedSegments = [...iconSegments];
                                            updatedSegments[index].name = data;
                                            setIconSegments(updatedSegments);
                                          }}
                                        />
                                      )}
                                    />
                                    <FormField
                                      error={error}
                                      label="Fill percentage(%)"
                                      control={(props) => (
                                        <NumberInput
                                          decrementAriaLabel="Decrement example number"
                                          defaultValue={segment.value}
                                          maximumFractionDigits={0}
                                          hasSpinButtons
                                          incrementAriaLabel="Increment example number"
                                          step={1}
                                          pattern="^(100|[1-9]?[0-9])$"
                                          onChangeComplete={(newValue)=>{
                                            const updatedSegments = [...iconSegments];
                                            updatedSegments[index].value = newValue;
                                            setIconSegments(updatedSegments);
                                          }}
                                          max={100}
                                          min={0}
                                        />
                                      )}
                                    />
                                    <Columns align="spaceBetween" spacing="1u" alignY="baseline">
                                      <Column width="content">
                                        <Text>
                                          <b>Fill color</b>
                                        </Text>
                                      </Column>
                                      <Column width="content">
                                        <ColorSelector
                                          onChange={(data) => {
                                            const updatedSegments = [...iconSegments];
                                            updatedSegments[index].color = data;
                                            setIconSegments(updatedSegments);
                                          }}
                                          color={segment.color}
                                        />
                                      </Column>  
                                    </Columns>
                                    <Box>
                                      <Text>
                                        <b>Transparency</b>
                                      </Text>
                                      <Box paddingStart="1.5u">
                                        <Slider
                                          defaultValue={segment.opacity}
                                          max={100}
                                          min={0}
                                          step={1}
                                          onChange={(data) => {
                                            const updatedSegments = [...iconSegments];
                                            updatedSegments[index].opacity = data;
                                            setIconSegments(updatedSegments);
                                          }}
                                        />
                                      </Box>
                                    </Box>   
                                    {index !== 0 && (            
                                      <Button
                                        alignment="center"
                                        icon={TrashIcon}
                                        onClick={() => removeIconSegment(index)}
                                        variant="tertiary"
                                      >
                                        Delete
                                      </Button>                                    
                                    )}
                                  </Grid>
                                </Rows>
                              </Box>
                            ))}
                            <Button
                              variant="secondary"
                              icon={PlusIcon}
                              onClick={addIconSegment}
                              stretch
                              disabled={isGenerating}
                            >
                              Add segment
                            </Button>
                          </Rows>
                        )}
                        {iconFillMode === 'transparency'&& (
                          <>
                            <FormField
                                error={error}
                                label="Fill percentage(%)"
                                control={(props) => (
                                    <NumberInput
                                      decrementAriaLabel="Decrement example number"
                                      defaultValue={svgConfig.value}
                                      maximumFractionDigits={0}
                                      hasSpinButtons
                                      incrementAriaLabel="Increment example number"
                                      step={1}
                                      pattern="^(100|[1-9]?[0-9])$"
                                      onChangeComplete={(newValue)=>{
                                        const updatedSvgConfig ={...svgConfig}
                                        updatedSvgConfig.value = newValue
                                        setSvgConfig(updatedSvgConfig)
                                      }}
                                      max={100}
                                      min={0}
                                    />
                                )}
                              />
                            <Box>
                              <Text>
                                <b>Unfilled area transparency</b>
                              </Text>
                              <Box paddingStart="1.5u">
                                <Slider
                                  defaultValue={svgConfig.remainingTransparency}
                                  max={100}
                                  min={0}
                                  step={1}
                                  onChange={(data) => {
                                    const updatedSvgConfig = {...svgConfig};
                                    updatedSvgConfig.remainingTransparency = data;
                                    setSvgConfig(updatedSvgConfig);
                                  }}
                                />
                              </Box>
                            </Box>    
                          </>
                        )}
                        {iconFillMode === 'color' && (
                          <>
                                <FormField
                              error={error}
                              label="Fill percentage(%)"
                              control={(props) => (
                                  <NumberInput
                                    decrementAriaLabel="Decrement example number"
                                    defaultValue={svgConfig.value}
                                    maximumFractionDigits={0}
                                    hasSpinButtons
                                    incrementAriaLabel="Increment example number"
                                    step={1}
                                    pattern="^(100|[1-9]?[0-9])$"
                                    onChangeComplete={(newValue)=>{
                                      const updatedSvgConfig ={...svgConfig}
                                      updatedSvgConfig.value = newValue
                                      setSvgConfig(updatedSvgConfig)
                                    }}
                                    max={100}
                                    min={0}
                                  />
                              )}
                            />
                            <Box padding="0">
                              <Columns align="spaceBetween" spacing="1u" alignY="center">
                                <Column width="content">
                                  <Text>
                                    <b>Fill color</b>
                                  </Text>
                                </Column>
                                <Column width="content">
                                  <ColorSelector
                                    onChange={(data) => {
                                      const updatedSvgConfig = {...svgConfig}
                                      updatedSvgConfig.color = data
                                      setSvgConfig(updatedSvgConfig)
                                    }}
                                    color={svgConfig.color}
                                  />
                                </Column>
                              </Columns>
                            </Box>
                            <Box padding="0">
                              <Columns align="spaceBetween" spacing="1u" alignY="center">
                                <Column width="content">
                                  <Text>
                                    <b>Background color</b>
                                  </Text>
                                </Column>
                                <Column width="content">
                                  <ColorSelector
                                    onChange={(data) => {
                                      const updatedSvgConfig = {...svgConfig}
                                      updatedSvgConfig.backgroundColor = data
                                      setSvgConfig(updatedSvgConfig)
                                    }}
                                    color={svgConfig.backgroundColor}
                                  />
                                </Column>
                              </Columns>
                            </Box>
                          </>
                        )}
                      </Rows>
                      <Box paddingTop="2u" paddingBottom="1.5u"  display="flex" flexDirection="column" alignItems="center">
                        <Button
                          variant="primary"
                          onClick={startSvgFill}
                          stretch
                          loading={isGenerating ? true : undefined} // 条渲染 loading 属性
                          disabled={isGenerating || ((user?.status === 'on-trial' || user?.status === 'expired') && (credits ?? 0) <= 0)}
                          >
                          Generate
                        </Button>
                      </Box> 
                      {(user?.status == 'on-trial' || user?.status == 'expired') && (
                        <>
                        <Box paddingY="0" alignItems="center" display="flex" flexDirection="column">
                          <Text size="small" variant="bold">
                            Use 1 of {credits} Pictogram Maker credits. Renews monthly.{' '}
                          </Text>
                          <Text size="small" variant="regular" tone="tertiary">
                             Get unlimited usage.{' '}
                            { user?.userid && (
                              <Link
                                href={`${proMonthLink}?checkout[custom][user_id]=${user.userid}`}
                                id="id"
                                requestOpenExternalUrl={() => {
                                  Promise.all([
                                    directToLs(`${proMonthLink}`),
                                    track({
                                      eventType: TrackEvents.CLICK_UPGRADE,
                                      element: 'iconfill_ontrial_getunlimited_upgrade_monthly',
                                      result: canAcceptPayments ? 'redirect' : 'failed_no_payment'
                                    })
                                  ]).catch(error => {
                                    console.error('Error in upgrade click:', error);
                                  });
                              }}
                                title="Pictogram Maker Pro Plan"
                              >
                                Upgrade
                               </Link>
                            )}
                          </Text>
                        </Box>
                        </>
                      )}
                      {/* 月付计划 */}
                      {(user?.status == 'active' && activeTab=='shapefill' && user?.variant_id === proMonthID) && (
                        <>
                        <Box paddingY="0" alignItems="center" display="flex" flexDirection="column">
                          <Text size="small" variant="bold">
                            You are using Pictogram Maker Pro Monthly.{''}
                          </Text>
                          <Text size="small" variant="regular" tone="tertiary">
                            { user?.userid && (
                              <Link
                                href={`https://funkersoft.lemonsqueezy.com/billing`}
                                id="id"
                                requestOpenExternalUrl={() => {
                                  Promise.all([
                                    directToLs('https://funkersoft.lemonsqueezy.com/billing'),
                                    track({
                                      eventType: TrackEvents.CLICK_BILLING,
                                      element: 'manage_subscription_entrance',
                                      result: ''
                                    })
                                  ]).catch(error => {
                                    console.error('Error in upgrade click:', error);
                                  });
                                }}
                                title="Manage subscription"
                              >
                                Manage subscription
                               </Link>
                            )}
                          </Text>
                        </Box>
                        </>
                      )}
                    </>
                  )}
            </TabPanel>
            <TabPanel id="imagefill">
              {sysError?.status && sysError.type==='imageFillError' && (
                <Alert
                  tone="critical"
                  onDismiss={() => setSysError({ status: false, type: "", errMsg: "" })}
                >
                  {sysError.errMsg}
                </Alert>
              )}
              {/* 试用期或过期状态下，展示付费引导信息 */}
              {( user?.status === 'on-trial' || user?.status === 'expired') && (
                <>
                <Rows spacing="2u">
                  {canAcceptPayments && (
                    <Alert tone="info">
                      To access this feature,{' '}
                      <Link
                      href={`${proMonthLink}?checkout[custom][user_id]=${user.userid}`}
                      id="id"
                      requestOpenExternalUrl={() => {
                        Promise.all([
                          directToLs(`${proMonthLink}`),
                          track({
                            eventType: TrackEvents.CLICK_UPGRADE,
                            element: 'imagefill_ontrial_tab_tips_upgrade_entrance',
                            result: canAcceptPayments ? 'redirect' : 'failed_no_payment'
                          })
                        ]).catch(error => {
                          console.error('Error in upgrade click:', error);
                        });
                      }}
                      title="Pictogram Maker Pro Plan"
                      >
                        upgrade to Pictogram Maker Pro
                      </Link>
                    </Alert>
                  )}
                  <VideoCard
                    borderRadius="standard"
                    mimeType="video/mp4"
                    onClick={() => {
                      track({
                        eventType: TrackEvents.SEE_VIDEO,
                        element: 'imagefill_tab_ontrial_videocard',
                        result: ''
                      });
                    }}
                    thumbnailAspectRatio={1}
                    thumbnailHeight={300}
                    thumbnailUrl="https://percentfill.com/imageChartMaker/ImageChart%20Maker-video-cover.png"
                    videoPreviewUrl="https://percentfill.com/imageChartMaker/ImageChartMaker%20-%20upgrade-video.mp4"
                    bottomEnd={<PlayFilledIcon />}
                    bottomEndVisibility="always"
                  />
                    {/* <Text>Fill images by percentage with PercentFill. Upgrade to the Pro plan to unlock</Text> */}
                    <Button 
                    variant="primary"
                    stretch
                    icon={OpenInNewIcon}
                    onClick={()=>{
                      Promise.all([
                        directToLs(`${proMonthLink}`),
                        track({
                          eventType: TrackEvents.CLICK_UPGRADE,
                          element: 'imagefill_ontrial_tab_upgrade_button',
                          result: canAcceptPayments ? 'redirect' : 'failed_no_payment'
                        })
                      ]).catch(error => {
                        console.error('Error in upgrade click:', error);
                      });
                    }}
                    >
                      Upgrade
                    </Button>                   
                  </Rows>
                </>
              )}
              {/* 激活状态下，正常展示功能 */}
               {(user?.status === 'active' || (user?.status === 'cancelled' && user?.ends_at && new Date(user.ends_at) > new Date())) && (
                <>
                  <Rows spacing="1.5u">
                  {/* <SegmentedControl
                    defaultValue="select"
                    options={[
                      {
                        label: 'Select from design',
                        value: 'select'
                      },
                      {
                        label: 'Upload',
                        value: 'upload'
                      }
                    ]}
                    onChange={(value)=>{
                      setSelectedOption(value);  
                    }}
                  /> */}
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
                              <b>Upload or select image</b>
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
                                const maxSizeInBytes = 4 * 1024 * 1024; // 4MB

                                if (uploadedImg.size > maxSizeInBytes) {
                                  setSysError({
                                    status: true,
                                    type: "fileSize",
                                    errMsg: 'File must be 4MB or smaller to continue.'
                                  });
                                  return;
                                }

                                const reader = new FileReader(); // 创建FileReader对象
                                reader.onloadend = () => {
                                  const base64URL = reader.result; // 获取DataURL（Base64编码）
                                  setImgPreviewUrl(base64URL as string); // 更新 imgPreviewUrl 状态
                                  setFile(base64URL as string);
                                };
                                reader.readAsDataURL(uploadedImg); // 将文件读取为DataURL（Base64编码）
                                // 设置文件名
                                setFileName(uploadedImg.name);
                                setSysError({ status: false, type: "", errMsg: "" }); // 清除错误状态
                              }}
                            />
                            {!file && !sysError?.status && (
                              <Text size="small" variant="regular" tone="tertiary">Maximum file size: 4MB. Accepted file formats: JPEG, PNG</Text>
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
                             <div
                                style={{
                                  width: "100%",
                                  height: "144px",
                                  borderRadius: "8px", // 设置圆角为 8px
                                  background: "var(--ui-kit-color-neutral-low)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  // marginTop: "8px",
                                  marginBottom: "12px"
                                }}
                              >
                                {(imgPreviewUrl || imgSelectionUrl) && (
                                  <img
                                    src={currentSelection.count === 1 ? imgSelectionUrl! : imgPreviewUrl!}
                                    alt={fileName}
                                    style={{
                                      maxWidth: '100%',
                                      maxHeight: '100%',
                                      objectFit: 'contain',
                                    }}
                                  />
                                )}
                             </div>
                             <Columns alignY="center" align="spaceBetween" spacing="1u">
                                <Column width="content">
                                  <Text><b>Remove image background</b></Text>
                                </Column>
                                <Column width="content">
                                  <Switch
                                    value={removeBackground}
                                    // label="Remove image background"
                                    // description="Enable to remove the background. No need to toggle if your image has no background. "
                                    onChange={(value)=>{
                                      setRemoveBackground(value);
                                    }}
                                  />
                                </Column>
                             </Columns>
                             <Text>
                              <b>Style</b>
                            </Text>
                            <Grid
                              alignY="center"
                              columns={3}
                              spacing="1u"
                            >
                              <Rows spacing="1u">
                              <ImageCard
                                alt="Percent stacked chart"
                                ariaLabel="Percent stacked chart"
                                borderRadius="standard"
                                onClick={() => {
                                  setImageFillMode('stacked');
                                  setFillPattern('vertical');
                                }}
                                thumbnailUrl="https://percentfill.com/imageChartMaker/img-stacked-verticle.png"                                
                                selected={imageFillMode === 'stacked'}
                                selectable
                                thumbnailHeight={90}
                              />
                              <Box>
                                <Text size="xsmall">
                                Vertical stacked
                                </Text>
                                {/* <Text
                                  size="small"
                                  tone="secondary"
                                >
                                  By Vertical Stacking
                                </Text> */}
                              </Box>
                            </Rows>
                            <Rows spacing="1u">
                              <ImageCard
                                alt="Percent stacked chart"
                                ariaLabel="Percent stacked chart"
                                borderRadius="standard"
                                onClick={() => {
                                  setImageFillMode('stacked2');
                                  setFillPattern('horizontal');
                                }}
                                thumbnailUrl="https://percentfill.com/imageChartMaker/img-stacked-horizan.png"                                
                                selected={imageFillMode === 'stacked2'}
                                selectable
                                thumbnailHeight={90}
                              />
                              <Box>
                                <Text size="xsmall">
                                Horizontal stacked
                                </Text>
                                {/* <Text
                                  size="small"
                                  tone="secondary"
                                >
                                  By Horizontal Stacking
                                </Text> */}
                              </Box>
                            </Rows>
                            <Rows spacing="1u">
                              <ImageCard
                                alt="Simple Pictorial chart"
                                ariaLabel="Simple Pictorial chart"
                                borderRadius="standard"
                                onClick={() => {
                                  setImageFillMode('imgpictorial1');
                                }}
                                thumbnailUrl="https://percentfill.com/imageChartMaker/img-single-color.png"
                                selected={imageFillMode === 'imgpictorial1'}
                                selectable
                                thumbnailHeight={90}
                              />
                              <Box>
                                <Text size="xsmall">
                                Color fraction
                                </Text>
                                {/* <Text
                                  size="small"
                                  tone="secondary"
                                >
                                  An image of some
                                </Text> */}
                              </Box>
                            </Rows>
                            <Rows spacing="1u">
                              <ImageCard
                                alt="Simple Pictorial chart"
                                ariaLabel="Simple Pictorial chart"
                                borderRadius="standard"
                                onClick={() => {
                                  setImageFillMode('simplepictorial');
                                }}
                                thumbnailUrl="https://percentfill.com/imageChartMaker/img-single.png"
                                selected={imageFillMode === 'simplepictorial'}
                                selectable
                                thumbnailHeight={90}
                              />
                              <Box>
                                <Text size="xsmall">
                                Color fill
                                </Text>
                                {/* <Text
                                  size="small"
                                  tone="secondary"
                                >
                                  An image of some
                                </Text> */}
                              </Box>
                            </Rows>
                            <Rows spacing="1u">
                              <ImageCard
                                alt="Pictorial Unit Chart"
                                ariaLabel="Pictorial Unit Chart"
                                borderRadius="standard"
                                onClick={() => {
                                  setImageFillMode('unitchart');
                                }}
                                thumbnailUrl="https://percentfill.com/imageChartMaker/img-unichart-color.png"                                
                                selected={imageFillMode === 'unitchart'}
                                selectable
                                thumbnailHeight={90}
                              />
                              <Box>
                                <Text size="xsmall">
                                  Color dist
                                </Text>
                                {/* <Text
                                      size="small"
                                      tone="secondary"
                                    >
                                  By color control
                                </Text> */}
                              </Box>
                            </Rows>
                            <Rows spacing="1u">
                              <ImageCard
                                alt="Liquidfill chart"
                                ariaLabel="Liquidfill chart"
                                borderRadius="standard"
                                onClick={() => {
                                  setImageFillMode('liquidfill');
                                }}
                                thumbnailUrl="https://percentfill.com/imageChartMaker/img-single-transparency.png"
                                selected={imageFillMode === 'liquidfill'}
                                selectable
                                thumbnailHeight={90}
                              />
                              <Box>
                                <Text size="xsmall">
                                Opacity fraction
                                </Text>
                                {/* <Text
                                  size="small"
                                  tone="secondary"
                                >
                                  By transparent control
                                </Text> */}
                              </Box>
                            </Rows>
                            
                            <Rows spacing="1u">
                              <ImageCard
                                alt="Pictorial Unit Chart"
                                ariaLabel="Pictorial Unit Chart"
                                borderRadius="standard"
                                onClick={() => {
                                  setImageFillMode('unitchart2');
                                }}
                                thumbnailUrl="https://percentfill.com/imageChartMaker/img-unitchart-transparency.png"                                
                                selected={imageFillMode === 'unitchart2'}
                                selectable
                                thumbnailHeight={90}
                              />
                              <Box>
                                <Text size="xsmall">
                                  Opacity dist
                                </Text>
                                {/* <Text
                                      size="small"
                                      tone="secondary"
                                    >
                                  By color control
                                </Text> */}
                              </Box>
                            </Rows>
                            </Grid>
                            {imageFillMode === 'imgpictorial1' && (
                              <Rows spacing="2u">
                                <FormField
                                  error={error}
                                  label="Fill percentage(%)"
                                  control={(props) => (
                                    <NumberInput
                                      decrementAriaLabel="Decrement example number"
                                      defaultValue={imgConfig.value}
                                      maximumFractionDigits={0}
                                      hasSpinButtons
                                      incrementAriaLabel="Increment example number"
                                      step={1}
                                      pattern="^(100|[1-9]?[0-9])$"
                                      onChangeComplete={(newValue)=>{
                                        const updatedImgConfig = {...imgConfig}
                                        updatedImgConfig.value = newValue ?? 0
                                        setImgConfig(updatedImgConfig)
                                      }}
                                      max={100}
                                      min={0}
                                    />
                                  )}
                                />

                                <Box padding="0">
                                  <Columns align="spaceBetween" spacing="1u" alignY="center">
                                    <Column width="content">
                                      <Text>
                                        <b>Fill color</b>
                                      </Text>
                                    </Column>
                                    <Column width="content">
                                      <ColorSelector
                                        onChange={(data) => {
                                          const updatedImgConfig = {...imgConfig}
                                          updatedImgConfig.color = data
                                          setImgConfig(updatedImgConfig)
                                        }}
                                        color={imgConfig.color}
                                      />
                                    </Column>
                                  </Columns>
                                </Box>

                                <Box padding="0">
                                  <Columns align="spaceBetween" spacing="1u" alignY="center">
                                    <Column width="content">
                                      <Text>
                                        <b>Background color</b>
                                      </Text>
                                    </Column>
                                    <Column width="content">
                                      <ColorSelector
                                        onChange={(data) => {
                                          const updatedImgConfig = {...imgConfig}
                                          updatedImgConfig.backgroundColor = data
                                          setImgConfig(updatedImgConfig)
                                        }}
                                        color={imgConfig.backgroundColor}
                                      />
                                    </Column>
                                  </Columns>
                                </Box>
                              </Rows>
                            )}
                            {(imageFillMode === 'stacked' || imageFillMode === 'stacked2') && (
                              <>
                                {/* <FormField
                                  label="Fill direction"
                                  error={sysError?.errMsg}
                                  control={(props) => (
                                    <RadioGroup
                                      {...props}
                                      defaultValue={fillPattern}
                                      options={[
                                        {
                                          label: 'Vertical',
                                          value: 'vertical'
                                        },
                                        {
                                          label: 'Horizontal',
                                          value: 'horizontal'
                                        },
                                      ]}
                                      onChange={(value) => {
                                        setFillPattern(value);
                                        setSysError({ status: false, type: "", errMsg: "" })
                                      }}
                                    />
                                  )}
                                /> */}
                                <Rows spacing="1.5u">
                                  {segments.map((segment, index) => (
                                    <Box
                                      key={index}
                                      background="neutralLow"
                                      borderRadius="large"
                                      paddingX="1.5u"
                                      paddingTop="1u"
                                      paddingBottom="1.5u"
                                    > 
                                    <Box paddingBottom="1u">
                                      <Title size="small" alignment="start">
                                        Segment {index + 1}
                                      </Title>
                                    </Box>
                                      <Rows spacing="1.5u">
                                        <Grid alignX="stretch" alignY="stretch" columns={1} spacing="2u">
                                          <FormField
                                            error={error}
                                            label="Label (optional)"
                                            control={(props) => (
                                              <TextInput
                                                type="text"
                                                name="label"
                                                defaultValue={segment.name || `Segment ${index + 1}`}
                                                placeholder="input label name"
                                                onChange={(data) => {
                                                  const updatedSegments = [...segments];
                                                  updatedSegments[index].name = data;
                                                  setSegments(updatedSegments);
                                                }}
                                              />
                                            )}
                                          />
                                          <FormField
                                            error={error}
                                            label="Fill percentage(%)"
                                            control={(props) => (
                                              <NumberInput
                                                decrementAriaLabel="Decrement example number"
                                                defaultValue={segment.value}
                                                maximumFractionDigits={0}
                                                hasSpinButtons
                                                incrementAriaLabel="Increment example number"
                                                step={1}
                                                pattern="^(100|[1-9]?[0-9])$"
                                                onChangeComplete={(newValue)=>{
                                                  const updatedSegments = [...segments];
                                                  updatedSegments[index].value = newValue;
                                                  setSegments(updatedSegments);
                                                }}
                                                max={100}
                                                min={0}
                                              />
                                            )}
                                          />
                                          <Columns align="spaceBetween" spacing="1u" alignY="baseline">
                                            <Column width="content">
                                              <Text>
                                              <b>Fill color</b>
                                              </Text>
                                            </Column>
                                          <Column width="content">
                                            <ColorSelector
                                              onChange={(data) => {
                                                const updatedSegments = [...segments];
                                                updatedSegments[index].color = data;
                                                setSegments(updatedSegments);
                                              }}
                                              color={segment.color}
                                            />
                                          </Column>  
                                          </Columns>
                                          <Box>
                                            <Text>
                                              <b>Transparency</b>
                                            </Text>
                                            <Box paddingStart="1.5u">
                                              <Slider
                                                defaultValue={segment.opacity}
                                                max={100}
                                                min={0}
                                                step={1}
                                                onChange={(data) => {
                                                  const updatedSegments = [...segments];
                                                  updatedSegments[index].opacity = data;
                                                  setSegments(updatedSegments);
                                                }}
                                              />
                                            </Box>
                                          </Box>   
                                          {index !== 0 && (            
                                              <Button
                                                alignment="center"
                                                icon={TrashIcon}
                                                onClick={() => removeSegment(index)}
                                                variant="tertiary"
                                              >
                                                Delete
                                              </Button>                                    
                                          )}
                                        </Grid>
                                      </Rows>
                                    </Box>
                                  ))}
                                </Rows>
                                <Button
                                  variant="secondary"
                                  icon={PlusIcon}
                                  onClick={addSegment}
                                  stretch
                                  disabled={isGenerating}
                                >
                                  Add segment
                                </Button>
                              </>
                            )}
                            {imageFillMode === 'liquidfill' && (
                              <Rows spacing="2u">
                                <FormField
                                  error={error}
                                  label="Fill percentage(%)"
                                  control={(props) => (
                                    <NumberInput
                                      decrementAriaLabel="Decrement example number"
                                      defaultValue={liquidFillValue}
                                      maximumFractionDigits={0}
                                      hasSpinButtons
                                      incrementAriaLabel="Increment example number"
                                      step={1}
                                      pattern="^(100|[1-9]?[0-9])$"
                                      onChangeComplete={(newValue)=>{
                                        setLiquidFillValue(newValue ?? 0);
                                      }}
                                      max={100}
                                      min={0}
                                    />
                                  )}
                                />
                                
                                <Box>
                                  <Text>
                                    <b>Transparency</b>
                                  </Text>
                                  <Box paddingStart="1.5u">
                                    <Slider
                                      defaultValue={liquidFillTransparency}
                                      max={100}
                                      min={0}
                                      step={1}
                                      onChange={(data) => {
                                        setLiquidFillTransparency(data);
                                      }}
                                    />
                                  </Box>
                                </Box>
                              </Rows>
                            )}
                            {imageFillMode === 'simplepictorial' && (
                              <Rows spacing="2u">
                                <Columns align="spaceBetween" spacing="1u" alignY="baseline">
                                  <Column width="content">
                                    <Text>
                                      <b>Fill color</b>
                                    </Text>
                                  </Column>
                                  <Column width="content">
                                    <ColorSelector
                                      onChange={(color) => {
                                        setSimplePictorialConfig(prev => ({
                                          ...prev,
                                          color: color
                                        }));
                                      }}
                                      color={simplePictorialConfig.color}
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
                            {imageFillMode === 'unitchart' && (
                              <Rows spacing="2u">
                                <FormField
                                  label="Total count"
                                  control={(props) => (
                                    <Slider
                                      value={unitChartConfig.totalCount}
                                      max={20}
                                      min={1}
                                      step={1}
                                      onChange={(value) => {
                                        setUnitChartConfig(prev => ({
                                          ...prev,
                                          totalCount: value,
                                          fillCount: Math.min(value, prev.fillCount)
                                        }));
                                      }}
                                    />
                                  )}
                                />

                                <FormField
                                  label="Fill count"
                                  control={(props) => (
                                    <Slider
                                      value={unitChartConfig.fillCount}
                                      max={unitChartConfig.totalCount}
                                      min={0}
                                      step={1}
                                      onChange={(value) => {
                                        setUnitChartConfig(prev => ({
                                          ...prev,
                                          fillCount: value
                                        }));
                                      }}
                                    />
                                  )}
                                />
                                <FormField
                                    label="Items per row"
                                    control={(props) => (
                                      <Slider
                                        value={unitChartConfig.itemsPerRow}
                                        max={20}
                                        min={1}
                                        step={1}
                                        onChange={(value) => {
                                          setUnitChartConfig(prev => ({
                                            ...prev,
                                            itemsPerRow: value
                                          }));
                                        }}
                                      />
                                    )}
                                  />
                                <FormField
                                  label="Default color"
                                  control={(props) => (
                                    <ColorSelector
                                      onChange={(color) => {
                                        setUnitChartConfig(prev => ({
                                          ...prev,
                                          defaultColor: color
                                        }));
                                      }}
                                      color={unitChartConfig.defaultColor}
                                    />
                                  )}
                                />

                                <FormField
                                  label="Fill color"
                                  control={(props) => (
                                    <ColorSelector
                                      onChange={(color) => {
                                        setUnitChartConfig(prev => ({
                                          ...prev,
                                          fillColor: color
                                        }));
                                      }}
                                      color={unitChartConfig.fillColor}
                                    />
                                  )}
                                />
                                {/* <FormField
                                  label="Spacing"
                                  control={(props) => (
                                    <Slider
                                      value={unitChartConfig.spacing}
                                      max={50}
                                      min={0}
                                      step={1}
                                      onChange={(value) => {
                                        setUnitChartConfig(prev => ({
                                          ...prev,
                                          spacing: value
                                        }));
                                      }}
                                    />
                                  )}
                                /> */}
                              </Rows>
                            )}
                             {imageFillMode === 'unitchart2' && (
                              <Rows spacing="2u">
                                <FormField
                                  label="Total count"
                                  control={(props) => (
                                    <Slider
                                      value={unitChartConfig.totalCount}
                                      max={20}
                                      min={1}
                                      step={1}
                                      onChange={(value) => {
                                        setUnitChartConfig(prev => ({
                                          ...prev,
                                          totalCount: value,
                                          fillCount: Math.min(value, prev.fillCount)
                                        }));
                                      }}
                                    />
                                  )}
                                />

                                <FormField
                                  label="Fill count"
                                  control={(props) => (
                                    <Slider
                                      value={unitChartConfig.fillCount}
                                      max={unitChartConfig.totalCount}
                                      min={0}
                                      step={1}
                                      onChange={(value) => {
                                        setUnitChartConfig(prev => ({
                                          ...prev,
                                          fillCount: value
                                        }));
                                      }}
                                    />
                                  )}
                                />
                                <FormField
                                    label="Items per row"
                                    control={(props) => (
                                      <Slider
                                        value={unitChartConfig.itemsPerRow}
                                        max={20}
                                        min={1}
                                        step={1}
                                        onChange={(value) => {
                                          setUnitChartConfig(prev => ({
                                            ...prev,
                                            itemsPerRow: value
                                          }));
                                        }}
                                      />
                                    )}
                                  />
                              </Rows>
                            )}
                            <Box paddingTop="2u" paddingBottom="1.5u" display="flex" flexDirection="column" alignItems="center">
                              <Button
                                variant="primary"
                                onClick={startFill}
                                stretch
                                loading={isGenerating ? true : undefined}
                                // disabled={isGenerating || ((user?.variant_id !== proMonthID && user?.variant_id !== proAnnualID) && (user?.status === 'cancelled' || user?.status === 'active') && (user?.credits ?? 0) <= 0)}
                                disabled={isGenerating}
                              >
                                Generate
                              </Button>
                            </Box>
                          </>
                        )}
                  </Rows>
                </>
               )}
            </TabPanel>
          </TabPanels>
        </Rows>
      </Tabs>
    )}
      {currentPage === 'icons' && (
        <>
          <Columns spacing="0" align="start" alignY="center">
            <Button
                type="button"
                variant="tertiary"
                icon={ArrowLeftIcon}
                ariaLabel="ariaLabel"
                size="small"
                onClick={backToShapeFill}
              />
            <Box paddingStart="1u">
              <Title size="xsmall">Icons</Title>  
            </Box>
          </Columns>
          <Rows spacing="2u">
            {/* <Box paddingTop="2u">
              <SearchInputMenu
                  name="iconname"
                  placeholder="Search Icons"
                  value={searchKeyword}
                  onChange={(value) => setSearchKeyword(value)}
                  onChangeComplete={async (keyword)=>{
                    // const token = getToken()
                    const token = await auth.getCanvaUserToken();
                    searchIcons(token as string,keyword) 
                  }}
                />
            </Box>  */}
            <Box paddingY="2u">
              <Rows spacing="2u">  
                {iconsResult.length > 0 ? (
                  <Grid
                    alignY="center"
                    columns={6}
                    spacing="1u"
                  >
                    {iconsResult.map((icon, index) => (
                      <ImageCard
                        borderRadius="standard"
                        alt={icon.name}
                        ariaLabel="Select icon to be filled"
                        onClick={() => {handleIconClickInList(icon)}}
                        selected={selectedIcon === icon.id} // 根 selectedIcon 状态动态设置
                        selectable
                        thumbnailUrl={icon.url} 
                        thumbnailPadding="1u"
                        // thumbnailAspectRatio={1}
                      />
                    ))}
                  </Grid>
                ) : searchKeyword !== '' ? (
                      <Text alignment="center" size="small">
                        No results found for "{searchKeyword}". Try searching for a different term.
                      </Text>
                ) : null}
              </Rows>
            </Box>
          </Rows>
        </>
      )}
    </div>
  );
};

