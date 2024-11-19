import {
  Button,
  Columns,
  FormField,
  Rows,
  Select,
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
  SearchInputMenu,
  VideoCard,
  FileInputItem,
  ClearIcon,
  SegmentedControl,
  Alert,
  LoadingIndicator,
  Switch,
  ImageCard,
  NumberInput,
  Column,
  ArrowDownIcon,
  OpenInNewIcon,
  RadioGroup,
  PlusIcon,
  TrashIcon,
} from "@canva/app-ui-kit";
// import { addNativeElement } from "@canva/design";
import * as React from "react";
//@ts-ignore
import styles from "styles/components.css";
import { useAddElement } from "utils/use_add_element";

import createPercentFill from "./CreatePercentFill";
import createLabel from "./CreateLabel";
import createSvgFill from "./CreateSvgFill"
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
import { boolean } from "yargs";

type segment = {
  // 图例颜色，也会用在填充颜色
  name:string;
  color:string;
  // 数值，可控制填充比例
  value:number| undefined;
  opacity:number;
}

interface SvgConfig {
  svgUrl: string;
  name: string;
  color: string;
  value: number | undefined;
  backgroundColor: string; // 添加背景色属性
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
    backgroundColor: "#dbdbdb" // 设置默认背景色
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

// 根节点定义
export const App = () => {
  const addElement = useAddElement();
  // 图片自定义填充时各区域数据
  const [segments,setSegments] = React.useState<segment[]>(defaultSegment)
  // 是否正在进行图片填充
  const [isGenerating, setIsGenerating] = React.useState<boolean>(false);
  // 图片填充模式下的填充方向
  const [fillPattern,setFillPattern] = React.useState<string|null>('vertical');
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
  // 默认获取 icon 的数据
  const [icons, setIcons] = React.useState<icon[]>([]); // 初始化 iconData 状态为空数组
  // 搜索列表
  const [iconsResult, setIconsResult] = React.useState<icon[]>([]); // 初始化 iconData 状态为空数组
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
  // 读取 canva 画布中选中的图片
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

  React.useEffect(() => {
    const platformInfo = getPlatformInfo();
    setCanAcceptPayments(platformInfo.canAcceptPayments);
  }, []); // 空依赖数组表示只在组件挂载时执行一次

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
    setIconsResult(icons)
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
      const result = await createSvgFill(
        svgContent,
        svgConfig.color,
        svgConfig.value ?? 0,
        svgConfig.backgroundColor
      );

      // 设置固定的基准尺寸
    const baseSize = 30; // 基准尺寸
    const aspectRatio = result.viewBoxWidth / result.viewBoxHeigh;
    // 计算实际渲染尺寸，保持宽高比
    let renderWidth, renderHeight;
    if (aspectRatio > 1) {
      renderWidth = baseSize;
      renderHeight = baseSize / aspectRatio;
    } else {
      renderHeight = baseSize;
      renderWidth = baseSize * aspectRatio;
    }
     // 根据 SVG 尺寸计算合适的文字大小
    //  const fontSize = Math.max(8,Math.min(renderWidth, renderHeight) * 0.1); // 文字大小为较短边的 15%
    //  console.log('fontsize='+fontSize);
     // 计算文字位置，使其位于 SVG 下方并居中
     const textTop = renderHeight * 1.1; // 文字距离 SVG 底部 5 个单位
    //  const textLeft = renderWidth / 2 - (fontSize * String(svgConfig.value).length) / 4 ; // 粗略估计文字宽度并居中
      addElementAtPoint({
        type:"group",
        children:[
          {
            type: "image",
            altText:undefined,
            dataUrl: result.url,
            width: renderWidth,
            height: renderHeight,
            top: 0,
            left: 0,
          },
          {
            type: "text",
            width:renderWidth,
            children: [`${svgConfig.value}%`],
            fontSize: 10,
            textAlign: "center",
            top: textTop,
            left: 0,
          }
        ],
      });
      const updatedUser = await subCredits(token,"shapeFill")
      setCredits(updatedUser.shape_fill_credits)
      setUser(prevUser => prevUser ? { ...prevUser, shape_fill_credits: updatedUser.shape_fill_credits } : null);
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
      
      const {imgUrl,imgWidth,imgHeight} = await createPercentFill(originImage,segments,fillPattern as string,removeBackground)
      // 初始化 children 用于存放所有的动态生成的元素
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
            top: imgHeight + spacing + (labelHeight - fontSize) / 2, // 垂直居中对齐文字
            left: leftOffset + labelWidth + spacing,
          });
        }
      });
      await Promise.all(segmentPromises);

      addElementAtPoint({
        type:"group",
        children:children,
      });
      // 扣 credits 逻辑
      const token = await auth.getCanvaUserToken();
      const updatedUser = await subCredits(token, "imageFill");
      setCredits(updatedUser.image_fill_credits);
      setUser(prevUser => prevUser ? { ...prevUser, image_fill_credits: updatedUser.image_fill_credits } : null);
      setIsGenerating(false);
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
    // 通过userState 返回的函数来更新错误状态
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
      setCredits(user?.shape_fill_credits)
    }else{
      setActiveTab('imagefill');
      setCredits(user?.image_fill_credits)
    }
  }


  const processSvg = async () => {
    if (!uploadedSvg) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const svgContent = e.target?.result as string;
      
      // 这里可以直接处理 SVG 内容
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
          <Alert
          title="Payments aren’t available on this device. "
          tone="warn"
          onDismiss={() => {setTipStatus(false)}}
      >
          To upgrade, open this app in a web browser.
      </Alert>
      )}
       {((user?.status=='on-trial'||user?.status=='expired') && tipStatus && isLogined && user?.variant_id !== proMonthID && user?.variant_id !== proAnnualID && (credits ?? 0) <= 0) && activeTab=='shapefill' && (
       <Alert
          title="You don’t have enough PercentFill credits."
          tone="critical"
          onDismiss={() => {setTipStatus(false)}}
       >
          Try again next month, or{" "}  
          <Link
            href={`${proMonthLink}?checkout[custom][user_id]=${user?.userid}`}
            id="id"
            requestOpenExternalUrl={() => directToLs(`${proMonthLink}`)}
            title="PercentFill Pro Plan"
          >
            upgrade to Pro
          </Link>
       </Alert>
    )}
    {(user?.status==='active' &&tipStatus && isLogined && activeTab=='imagefill' && user?.variant_id === proMonthID && (credits ?? 0) <= 0) && (
       <Alert
          title="You don’t have enough PercentFill credits."
          tone="critical"
          onDismiss={() => {setTipStatus(false)}}
       >
          Try again next month, or{" "} 
          <Link
            href={`${proAnnualLink}?checkout[custom][user_id]=${user?.userid}`}
            id="id"
            requestOpenExternalUrl={() => directToLs(`${proAnnualLink}`)}
            title="PercentFill Pro Plan annual membership."
          >
            upgrade to Pro Annual
          </Link>
       </Alert>
    )}
    {currentPage==='main'&&(
      <Tabs onSelect={(id)=>{handleTabChange(id)}}>
        <Rows spacing="2u">
          <TabList>
            <Tab id="shapefill">
              Icon
            </Tab>
            <Tab id="imagefill">
              Image
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel id="shapefill">
              {sysError?.status && sysError.type==='svgFillError' && (
                <Box>
                  <Alert
                    tone="critical"
                    onDismiss={() => setSysError({ status: false, type: "", errMsg: "" })}
                  >
                    {sysError.errMsg}
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
                          columns={6}
                          spacing="1u"
                        >
                          {/* 只展示 12 个元素 */}
                          {icons.slice(0, 12).map((icon, index) => (
                              <ImageCard
                                borderRadius="standard"
                                alt={icon.name}
                                ariaLabel="Select icon to be filled"
                                onClick={() => {handleIconClick(icon)}}
                                selected={selectedIcon === icon.id} // 根据 selectedIcon 状态动态设置
                                selectable
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
                          errMsg: 'File size exceeds 4MB, cannot upload'
                        });
                        return;
                      }
                      const reader = new FileReader(); // 创建FileReader对象
                      reader.onloadend = () => {
                        const base64URL = reader.result; // 获取DataURL（Base64编）
                        // setFile(base64URL as string);
                        setSvgPreviewUrl(base64URL as string); // 设置用于 img 标签的 Data URL
                        setUploadedSvg(uploadedImg)
                      };
                      reader.readAsDataURL(uploadedImg); // 将文件读取为DataURL（Base64编码）
                      // 设置文件名
                      setSvgName(uploadedImg.name);
                      setSysError({ status: false, type: "", errMsg: "" }); // 清除错误状态
                    }}
                  />
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
                          <FormField
                            error={error}
                            label="Fill percentage(%)"
                            control={(props) => (
                              <Box paddingStart="0">
                                {/* <Slider
                                  defaultValue={svgConfig.value}
                                  max={100}
                                  min={0}
                                  step={1}
                                  onChangeComplete={(preValue,newValue)=>{
                                    const updatedSvgConfig ={...svgConfig}
                                    updatedSvgConfig.value = newValue
                                    setSvgConfig(updatedSvgConfig)
                                  }}
                                /> */}
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
                              </Box>
                            )}
                          />
                        </Box>
                        <Box padding="0">
                          <Columns align="spaceBetween" spacing="1u" alignY="center">
                          <Column width="content">
                            <Text>
                                <b>Fill color</b>
                            </Text>
                          </Column>
                          <Column width="content">
                            <ColorSelector
                                onChange={(data) =>       {
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
                                onChange={(data) =>       {
                                  const updatedSvgConfig = {...svgConfig}
                                  updatedSvgConfig.backgroundColor = data
                                  setSvgConfig(updatedSvgConfig)
                                }}
                                color={svgConfig.backgroundColor}
                              />
                            </Column>
                        </Columns>
                        </Box>
                      </Rows>
                      <Box paddingTop="2u" paddingBottom="1.5u"  display="flex" flexDirection="column" alignItems="center">
                        <Button
                          variant="primary"
                          onClick={startSvgFill}
                          stretch
                          loading={isGenerating ? true : undefined} // 条渲染 loading 属性
                          disabled={isGenerating || (user?.variant_id !== proMonthID && user?.variant_id !== proAnnualID && (credits ?? 0) <= 0)}
                          >
                          Generate
                        </Button>
                      </Box> 
                      {(user?.status == 'on-trial' || user?.status == 'expired') && (
                        <>
                        <Box paddingY="0" alignItems="center" display="flex" flexDirection="column">
                          <Text size="small" variant="bold">
                            Use 1 of {credits} PercentFill credits. Renews monthly.{' '}
                          </Text>
                          <Text size="small" variant="regular" tone="tertiary">
                             Get unlimited usage.{' '}
                            { user?.userid && (
                              <Link
                                href={`${proMonthLink}?checkout[custom][user_id]=${user.userid}`}
                                id="id"
                                requestOpenExternalUrl={() => directToLs((`${proMonthLink}`))}
                                title="PercentFill Pro Plan"
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
                            You are using PercentFill Pro Monthly.{''}
                          </Text>
                          <Text size="small" variant="regular" tone="tertiary">
                            { user?.userid && (
                              <Link
                                href={`https://funkersoft.lemonsqueezy.com/billing`}
                                id="id"
                                requestOpenExternalUrl={() => directToLs('https://funkersoft.lemonsqueezy.com/billing')}
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
                      requestOpenExternalUrl={() => directToLs(`${proMonthLink}`)}
                      title="PercentiFill Pro Plan"
                      >
                        upgrade to PercentFill Pro
                      </Link>
                    </Alert>
                  )}
                  <VideoCard
                    borderRadius="none"
                    mimeType="video/mp4"
                    onClick={() => {}}
                    onDragStart={() => {}}
                    thumbnailUrl="https://percentfill.com/imagefillcover.png"
                    videoPreviewUrl="https://percentfill.com/imagefill.mp4"
                  />
                    {/* <Text>Fill images by percentage with PercentFill. Upgrade to the Pro plan to unlock</Text> */}
                    <Button 
                    variant="primary"
                    stretch
                    icon={OpenInNewIcon}
                    onClick={()=>directToLs(`${proMonthLink}`)}
                    >
                      Upgrade
                    </Button>                   
                  </Rows>
                </>
              )}
              {/* 激活状态下，正常展示功能 */}
               {user?.status === 'active' && (
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
                                    errMsg: 'File size exceeds 4MB, cannot upload'
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
                         {/* 如果选了多个图片 */}
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
                            <FormField
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
                            />
                            <Rows spacing="1.5u">
                              {/* <Text variant="bold">Portions</Text> */}
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
                                            defaultValue= {`Segment ${index + 1}`}
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
                                          // <Box paddingStart="1.5u">
                                          //   <Slider
                                          //     defaultValue={segment.value}
                                          //     max={100}
                                          //     min={0}
                                          //     step={1}
                                          //     onChangeComplete={(preValue,newValue)=>{
                                          //       console.log('slider-value='+newValue)
                                          //       const updatedSegments = [...segments];
                                          //       updatedSegments[index].value = newValue;
                                          //       setSegments(updatedSegments);
                                          //     }}
                                          //   />
                                          // </Box>
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
                            <Box paddingTop="2u" paddingBottom="0"  display="flex" flexDirection="column" alignItems="center">
                              <Button
                                variant="primary"
                                onClick={startFill}
                                stretch
                                loading={isGenerating ? true : undefined} // 条件渲染 loading 属性
                                disabled={isGenerating || (user?.variant_id !== proAnnualID && (credits ?? 0) <= 0)}                          >
                                Generate
                              </Button>
                            </Box>
                             {/* 如果是月付计，则会提示额度剩余可用额度,引导升级年会会员 */}
                              {(user?.variant_id == proMonthID) && (
                                  <>
                                  <Box paddingY="0" alignItems="center" display="flex" flexDirection="column">
                                    <Text size="small"  variant="bold">
                                      Use 1 of {credits} PercentFill credits. Renews monthly.{''}
                                    </Text>
                                    <Text>
                                    Get unlimited usage.{' '}
                                      { user?.userid && (
                                        <Link
                                          href={`${proAnnualLink}?checkout[custom][user_id]=${user.userid}`}
                                          id="id"
                                          requestOpenExternalUrl={() => directToLs(`${proAnnualLink}`)}
                                          title="PercentiFill Pro Plan Annual"
                                        >
                                          Upgrade
                                        </Link>
                                      )}
                                    </Text>
                                  </Box>
                                  </>
                                )}
                                {/* 月付计划 */}
                                {(user?.status == 'active' && activeTab=='imagefill' && user?.variant_id === proAnnualID) && (
                                  <>
                                  <Box paddingY="0" alignItems="center" display="flex" flexDirection="column">
                                    <Text size="small" variant="bold">
                                      You are using PercentFill Pro Annual.{' '}
                                    </Text>
                                    <Text size="small" variant="regular" tone="tertiary">
                                      {user?.userid && (
                                        <Link
                                          href={`https://funkersoft.lemonsqueezy.com/billing`}
                                          id="id"
                                          requestOpenExternalUrl={() => directToLs('https://funkersoft.lemonsqueezy.com/billing')}
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
                        selected={selectedIcon === icon.id} // 根据 selectedIcon 状态动态设置
                        selectable
                        thumbnailUrl={icon.url} 
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

