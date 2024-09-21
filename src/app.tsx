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
} from "@canva/app-ui-kit";
import { addNativeElement } from "@canva/design";
import * as React from "react";
//@ts-ignore
import styles from "styles/components.css";


import createPercentFill from "./CreatePercentFill";
import createLabel from "./CreateLabel";
import createSvgFill from "./CreateSvgFill"
// import { app, analytics } from './firebase'; // 引入 Firebase 配置
import {auth} from "@canva/user"
import { getToken,setToken } from "./tokenManager";
import {login} from "./account";
import { subCredits } from './account';
import { requestOpenExternalUrl } from "@canva/platform";
// Images, plaintext, and videos
// import { selection } from "@canva/design";
import { getTemporaryUrl } from "@canva/asset";
import { useSelection } from "utils/use_selection_hook";

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
    name:"label1",
    color:"#000000",
    value:40,
    opacity:0.4
  }
]

const defaultSvgConfig: SvgConfig =
{
    svgUrl:"",
    name:"label",
    color: "#000000",
    value: 40,
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
  // 图片自定义填充时各区域数据
  const [segments,setSegments] = React.useState<segment[]>(defaultSegment)
  // 是否正在进行图片填充
  const [isGenerating, setIsGenerating] = React.useState<boolean>(false);
  // 图片填充模式下的填充方向
  const [fillPattern,setFillPattern] = React.useState<string>("verticle");
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
  const [selectedOption, setSelectedOption] = React.useState('select');
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
  const [removeBackground, setRemoveBackground] = React.useState(false);
  
  const addSegment = () => {
    const newSegment: segment = {
      name: "label",
      color: "#000000", // 默认颜色，可以动态修改
      value: 0 ,// 默认百分比值
      opacity:0.4
    };
    setSegments([...segments, newSegment]);
  };

  const getUserInfo = React.useCallback(async () => {
    try {
      const token = await auth.getCanvaUserToken();
      setToken(token);
      const userInfo = await login(token);
      setUser(userInfo as any);
      setCredits(userInfo.shape_fill_credits);
      setIsOffline(false); // 重置离线状态
      return token;
    } catch (error) {
      // 无法正常获取 token 时，给个空token
      const token ='';
      setToken(token);
      console.error('Failed to get user info:', error);
      setIsOffline(true); // 设置离线状态
      return token;
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
    const response = await requestOpenExternalUrl({
      url: lsURL,
    });
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
    const token = getToken()
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
        const response = await fetch(`https://percentfill-backend--partfill.us-central1.hosted.app/api/icon?${queryString}`);
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

      addNativeElement({
        type:"GROUP",
        children:[
          {
            type: "IMAGE",
            dataUrl: result.url,
            width: result.viewBoxWidth / 12,
            height: result.viewBoxHeigh / 12,
            top: 0,
            left: 0,
          },
          {
            type: "TEXT",
            children: [`${svgConfig.value}%`],
            fontSize: 16,
            textAlign: "center",
            top: result.viewBoxHeigh / 12 + 5,
            left: result.viewBoxWidth / 12 / 2 - 14,
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
        type: "IMAGE",
        ref: content.ref,
      });

      const response = await fetch(url);
      const blob = await response.blob();
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result?.toString() || '');
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.log(error)
      // setNoticeError('Something went wrong. Please try again later.')
      return ''
    }

  }
  const startFill = async ()=>{
    setIsGenerating(true);
    setSysError({ status: false, type: "", errMsg: "" }); // 清除错误状态
    const token = getToken()
    try {
      // 获取抠图+比例填充后的图像、和对应的高和宽
      let originImage:string
      if(selectedOption === 'upload'){
        // 获取用户上传文件前，确认文件是否正常获取到
        if (!file) {
          throw new Error('No image file selected');
        }
        originImage = file as string
      }else{
        // 执行下读取 canva 图片元素的操作,执行前确保用户只选择了 1 张图片
        if(currentSelection.count>1){
          throw new Error('Please select only one image');
        }
        originImage = await getSelectionImage()
        // 判断能否成功读取用户选择的文件
        if (!originImage) {
          throw new Error('Failed to get selected image');
        }
      }
      const {imgUrl,imgWidth,imgHeight} = await createPercentFill(originImage,segments,fillPattern,removeBackground)
      // 初始化 children 用于存放所有的动态生成的元素
      const children: CanvasElement[] = [];
      children.push(
        {
          type: "IMAGE",
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
            type: "IMAGE",
            dataUrl: labelUrl,
            width: labelWidth,
            height: labelHeight,
            top: topOffset + (90 - labelHeight) / 2,
            left: imgWidth + 5,
          });
          // 推送 TEXT 元素
          children.push({
            type: "TEXT",
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
            type: "IMAGE",
            dataUrl: labelUrl,
            width: labelWidth,
            height: labelHeight,
            top: imgHeight + spacing,
            left: leftOffset,
          });
          
          // 添加文字
          children.push({
            type: "TEXT",
            children: [`${segment.name}: ${segment.value}%`],
            fontSize: fontSize,
            textAlign: "start",
            top: imgHeight + spacing + (labelHeight - fontSize) / 2, // 垂直居中对齐文字
            left: leftOffset + labelWidth + spacing,
          });
        }
      });
      await Promise.all(segmentPromises);

      addNativeElement({
        type:"GROUP",
        children:children,
      });
      // 扣 credits 逻辑
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

  // 定义生成错误提示信息的函数
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
    {currentPage==='main'&&(
      <Tabs onSelect={(id)=>{handleTabChange(id)}}>
        <Rows spacing="1u">
          <TabList>
            <Tab id="shapefill">
              Fill icon
            </Tab>
            <Tab id="imagefill">
              Fill image
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel id="shapefill">
              {sysError?.status && sysError.type==='svgFillError' && (
                <Alert
                  tone="critical"
                  onDismiss={() => setSysError({ status: false, type: "", errMsg: "" })}
                >
                  {sysError.errMsg}
                </Alert>
              )}
              <SegmentedControl
                defaultValue="library"
                options={[
                  {
                    label: 'Select from library',
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
                <Box display='flex' justifyContent='spaceBetween' paddingY="2u" paddingEnd="2u">
                    <Text tone='primary' variant='bold'>Icons</Text>
                    <Text tone='secondary' size='small'>
                        <div className={styles.seeAll} onClick={() => goToIconList()}>
                            See all
                        </div>
                    </Text>
                </Box>
                  <Rows spacing="3u">
                    <Rows spacing="2u">
                     <Box padding="1u">
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
                            <Rows key={index} align="center" spacing="1u">
                              <div
                                onClick={()=>{handleIconClick(icon)}}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column', // 让 icon 和 Text 垂直排列
                                  alignItems: 'center', // 水平居中对齐
                                  cursor: 'pointer',
                                  border: selectedIcon === icon.id ? '1px solid #A570FF' : '1px solid transparent', // 选中时边框加重显示颜色
                                  padding: '8px', // 添加一些内边距，让边框效果更明显
                                  borderRadius: '4px', // 添加圆角边框
                                }}
                                role="button" // 使 div 拥有按钮的特性
                              >
                                <img src={icon.url} width="32" height="32" alt={icon.name}></img>
                                <Text>{icon.name}</Text>
                              </div>
                            </Rows>
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
                        setUploadedSvg(uploadedImg)
                      };
                      reader.readAsDataURL(uploadedImg); // 将文件读取为DataURL（Base64编码）
                      // 设置文件名
                      setSvgName(uploadedImg.name);
                      setSysError({ status: false, type: "", errMsg: "" }); // 清除错误状态
                    }}
                  />
                  {!sysError?.status && (
                      <Box paddingY="1u">
                        <Text size="small">Maximum file size: 4MB</Text>
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
                    </>
                  )}
                </Box>
              )}
                  {((selectedIconOption === 'library' && selectedIcon !== null) || (selectedIconOption === 'uploadSvg' && uploadedSvg)) && (
                    <>
                      <Rows spacing="1.5u">
                        <Box paddingBottom="1u">
                          <FormField
                            error={error}
                            label="Percentage"
                            control={(props) => (
                              <Box paddingStart="1.5u">
                                <Slider
                                  defaultValue={0}
                                  max={100}
                                  min={0}
                                  step={1}
                                  onChangeComplete={(preValue,newValue)=>{
                                    const updatedSvgConfig ={...svgConfig}
                                    updatedSvgConfig.value = newValue
                                    setSvgConfig(updatedSvgConfig)
                                  }}
                                />
                              </Box>
                            )}
                          />
                        </Box>
                        <Box padding="0">
                          <Rows spacing="1u">
                            <Text>
                              <b>Background color</b>
                            </Text>
                            <ColorSelector
                                onChange={(data) =>       {
                                  const updatedSvgConfig = {...svgConfig}
                                  updatedSvgConfig.backgroundColor = data
                                  setSvgConfig(updatedSvgConfig)
                                }}
                                color={svgConfig.backgroundColor}
                              />
                          </Rows>
                        </Box>
                        <Box padding="0">
                          <Rows spacing="1u">
                            <Text>
                              <b>Fill color</b>
                            </Text>
                            <ColorSelector
                                onChange={(data) =>       {
                                  const updatedSvgConfig = {...svgConfig}
                                  updatedSvgConfig.color = data
                                  setSvgConfig(updatedSvgConfig)
                                }}
                                color={svgConfig.color}
                              />
                          </Rows>
                        </Box>
                      </Rows>
                      <Box paddingY="2u">
                        <Button
                          variant="primary"
                          onClick={startSvgFill}
                          stretch
                          loading={isGenerating ? true : undefined} // 条渲染 loading 属性
                          disabled={isGenerating || (user?.variant_id !== 493905 && user?.variant_id !== 496415 && (credits ?? 0) <= 0)}
                          >
                          Generate
                        </Button>
                      </Box> 
                      {(user?.status == 'on-trial' || user?.status == 'expired') && (
                        <>
                        <Box paddingY="0">
                          <Text>
                            The credits you can use to fill Icons remaining {credits} in this month. Get unlimited usage by{' '}
                            {user?.userid && (
                              <Link
                                href={`https://funkersoft.lemonsqueezy.com/buy/b101d5b7-f59c-4067-a7bd-65ca83b976c8?checkout[custom][user_id]=${user.userid}`}
                                id="id"
                                requestOpenExternalUrl={() => directToLs('https://manysoft.lemonsqueezy.com/buy/b101d5b7-f59c-4067-a7bd-65ca83b976c8')}
                                title="PartiFill Pro Plan"
                              >
                                upgrading to a membership
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
              {(user?.status === 'on-trial' || user?.status === 'expired') && (
                <>
                <Rows spacing="2u">
                  <VideoCard
                    borderRadius="none"
                    mimeType="video/mp4"
                    onClick={() => {}}
                    onDragStart={() => {}}
                    thumbnailUrl="https://percentfill.com/%E5%B0%81%E9%9D%A2%E5%9B%BE.png"
                    videoPreviewUrl="https://percentfill.com/imagefill.mp4"
                  />
                    <Text>Fill images by percentage with PercentFill. Upgrade to the Pro plan to unlock</Text>
                    <Button 
                    variant="primary"
                    stretch
                    onClick={()=>directToLs('https://manysoft.lemonsqueezy.com/buy/b101d5b7-f59c-4067-a7bd-65ca83b976c8')}
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
                  <SegmentedControl
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
                  />
                  {selectedOption === 'upload' ?(
                        <>
                        {sysError?.status && sysError.type === "fileSize" && (
                          <Alert
                            onDismiss={() => setSysError({ status: false, type: "", errMsg: "" })}
                            tone="warn"
                          >
                            {sysError.errMsg}
                          </Alert>
                        )}
                        <FileInput
                          // {...props}
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
                              const base64URL = reader.result; // 获取DataURL（Base64编）
                              setFile(base64URL as string);
                            };
                            reader.readAsDataURL(uploadedImg); // 将文件读取为DataURL（Base64编码）
                            // 设置文件名
                            setFileName(uploadedImg.name);
                            setSysError({ status: false, type: "", errMsg: "" }); // 清除错误状态
                          }}
                        />
                        {!sysError?.status && (
                          <Text size="small">Maximum file size: 4MB</Text>
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
                      ):(
                        <Alert tone="info">
                            Select an image in your design to fill by percent
                        </Alert>                  
                      )}
                        {((selectedOption === 'upload' && file) || (selectedOption === 'select' && currentSelection.count > 0)) && !(sysError?.status && sysError.type === "fileSize") && (
                          <>
                             <FormField
                              label="Image adjustments"
                              control={() => (
                                <Switch
                                  value={removeBackground}
                                  label="Remove background"
                                  description="Enable to remove the background. No need to toggle if your image has no background. "
                                  onChange={(value)=>{
                                    setRemoveBackground(value);
                                  }}
                                />
                              )}
                            />
                            <FormField
                              label="Fill direction"
                              control={(props) => (
                                <Select
                                  {...props}
                                  stretch
                                  options={[
                                    { value: "vertical", label: "Vertical" },
                                    { value: "horizontal", label: "Horizontal" },
                                  ]}
                                  onChange={(value) =>
                                    setFillPattern(value)
                                  }
                                />
                              )}
                            />
                            <Rows spacing="1.5u">
                              <Text variant="bold">Portions</Text>
                              {segments.map((segment, index) => (
                                <Box
                                  key={index}
                                  background="neutralLow"
                                  borderRadius="large"
                                  paddingX="1.5u"
                                  paddingTop="1u"
                                  paddingBottom="1.5u"
                                > 
                                <Columns spacing="0" align="end" alignY="center">
                                  {/* <Text size="medium" alignment="center">
                                    Portion {index + 1}
                                  </Text> */}
                                      {index !== 0 && (
                                        <Button
                                          type="button"
                                          variant="tertiary"
                                          icon={ClearIcon}
                                          ariaLabel="ariaLabel"
                                          size="small"
                                          onClick={() => removeSegment(index)}
                                        />
                                      )}
                                    </Columns>
                                  <Rows spacing="1u">
                                    <Grid alignX="stretch" alignY="stretch" columns={1} spacing="1u">
                                      <FormField
                                        error={error}
                                        label="Label name"
                                        control={(props) => (
                                          <TextInput
                                            type="text"
                                            name="label"
                                            defaultValue= {`Portion ${index + 1}`}
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
                                        label="Percentage"
                                        control={(props) => (
                                          <Box paddingStart="1.5u">
                                            <Slider
                                              defaultValue={0}
                                              max={100}
                                              min={0}
                                              step={1}
                                              onChangeComplete={(preValue,newValue)=>{
                                                console.log('slider-value='+newValue)
                                                const updatedSegments = [...segments];
                                                updatedSegments[index].value = newValue;
                                                setSegments(updatedSegments);
                                              }}
                                            />
                                          </Box>
                                        )}
                                      />
                                      <Text>
                                        <b>Fill color</b>
                                      </Text>
                                      <ColorSelector
                                        onChange={(data) => {
                                          const updatedSegments = [...segments];
                                          updatedSegments[index].color = data;
                                          setSegments(updatedSegments);
                                        }}
                                        color={segment.color}
                                      />
                                      <Text>
                                        <b>Transparency</b>
                                      </Text>
                                      <Box paddingStart="1.5u">
                                        <Slider
                                          defaultValue={0}
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
                                    </Grid>
                                  </Rows>
                        
                                </Box>
                              ))}
                            </Rows>
                            <Button
                              variant="secondary"
                              onClick={addSegment}
                              stretch
                              disabled={isGenerating}
                            >
                              Add portion
                            </Button>
                            <Button
                              variant="primary"
                              onClick={startFill}
                              stretch
                              loading={isGenerating ? true : undefined} // 条件渲染 loading 属性
                              disabled={isGenerating || (user?.variant_id !== 493905 && (credits ?? 0) <= 0)}                          >
                              Generate
                            </Button>
                             {/* 如果是月付计，则会提示额度剩余可用额度,引导升级年会会员 */}
                              {(user?.variant_id == 496415) && (
                                  <>
                                  <Box paddingY="0">
                                    <Text size="small">
                                      The credits you can use to fill Image remaining {credits} in this month. Get unlimited usage by{' '}
                                      {user?.userid && (
                                        <Link
                                          href={`https://funkersoft.lemonsqueezy.com/buy/c5d9b14f-b484-4a9c-af30-1f7af13eacf0?checkout[custom][user_id]=${user.userid}`}
                                          id="id"
                                          requestOpenExternalUrl={() => directToLs('https://funkersoft.lemonsqueezy.com/buy/c5d9b14f-b484-4a9c-af30-1f7af13eacf0')}
                                          title="PartiFill Pro Plan"
                                        >
                                          upgrading to an annual membership
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
                size="medium"
                onClick={backToShapeFill}
              />
            <Title>Icons</Title>  
          </Columns>
          <Rows spacing="2u">
            <Box paddingTop="2u">
              <SearchInputMenu
                  name="iconname"
                  placeholder="Search Icons"
                  value={searchKeyword}
                  onChange={(value) => setSearchKeyword(value)}
                  onChangeComplete={(keyword)=>{
                    const token = getToken()
                    searchIcons(token as string,keyword) 
                  }}
                />
            </Box> 
            <Box paddingY="0">
              <Rows spacing="2u">  
                {iconsResult.length > 0 ? (
                  <Grid
                    alignY="center"
                    columns={5}
                    spacing="1u"
                  >
                    {iconsResult.map((icon, index) => (
                      <Rows key={index} align="center" spacing="1u">
                        <div
                          onClick={() => handleIconClickInList(icon)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column', // 让 icon 和 Text 垂直排列
                            alignItems: 'center', // 水平居中对齐
                            cursor: 'pointer',
                            border: selectedIcon === icon.id ? '1px solid #A570FF' : '1px solid transparent', // 选中时边框加重并显示颜色
                            padding: '8px', // 添加一些内边距，让边框效果更明显
                            borderRadius: '4px', // 添加圆��边框
                          }}
                          role="button" // 使 div 拥有按钮的特性
                        >
                          <img src={icon.url} width="32" height="32" alt={icon.name} />
                          <Text>{icon.name}</Text>
                        </div>
                      </Rows>
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
