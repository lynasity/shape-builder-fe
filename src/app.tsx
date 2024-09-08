import {
  Button,
  Columns,
  FormField,
  LoadingIndicator,
  NumberInput,
  Rows,
  Select,
  Text,
  TextInput,
  ColorSelector,
  FileInput,
  Grid,
  Box,
  Title,
  CogIcon,
  TrashIcon,
  Slider,
  Link,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  TabPanels,
  ArrowRightIcon,
  ArrowLeftIcon,
  EyeIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  SearchInputMenu,
  VideoCard,
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
import { GenIcon, IconType } from "react-icons";
import { FaSearch, FaRegFrown } from 'react-icons/fa'; // 使用 React Icons
import { ReactSVG } from 'react-svg';


type segment = {
  // 图例颜色，也会用在填充颜色
  name:string;
  color:string;
  // 数值，可控制填充比例
  value:number| undefined;
  opacity:number;
}

type svgConfig = {
  svgUrl:string;
  name:string;
  color:string;
  value:number| undefined;
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

const defaultSvgConfig:svgConfig=
{
    svgUrl:"",
    name:"label",
    color: "#000000",
    value: 40
}

const defaultIcon:icon={
  id:1,
  name:'heart',
  url:'https://pub-a01e9035bbfd4133a30f27817bf35870.r2.dev/%E4%BE%BF%E6%B0%91%E4%BF%A1%E6%81%AF.svg'
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
  // 用户信息
  const [user, setUser] = React.useState<user | null>(null);
  // 用户可用额度
  const [credits, setCredits] = React.useState<number>();
  // 控制shapefill情况下的一级和二级界面
  const [currentPage, setCurrentPage] = React.useState('main'); // 用于跟踪当前页面
  // 创建状态用于跟踪选中的图标
  const [selectedIcon, setSelectedIcon] = React.useState<number>(0);
  // 选择的 svg填充模式参数
  const [svgConfig,setSvgConfig] = React.useState<svgConfig>(defaultSvgConfig);
  // 默认获取 icon 的数据
  const [icons, setIcons] = React.useState<icon[]>([defaultIcon]); // 初始化 iconData 状态为空数组
  // 搜索列表
  const [iconsResult, setIconsResult] = React.useState<icon[]>([defaultIcon]); // 初始化 iconData 状态为空数组
  // 在组件内部添加新的状态
  const [searchKeyword, setSearchKeyword] = React.useState('');
  const [shouldRefreshData, setShouldRefreshData] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'shapefill' | 'imagefill'>('shapefill');
  const [hasSearchResults, setHasSearchResults] = React.useState(true);


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
    const token = await auth.getCanvaUserToken();
    setToken(token);
    const userInfo = await login(token);
    setUser(userInfo as any);
    setCredits(userInfo.shape_fill_credits);
    return token;
  }, []);

  const fetchIconData = React.useCallback(async (token: string) => {
    try {
      const response = await fetch("http://localhost:3000/api/icons", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        mode: "cors",
      });
      const data = await response.json();
      setIcons(data);
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
      setHasSearchResults(true);
    }
  }, [searchKeyword, icons]);

  // 删除 segment 的函数
  const removeSegment = (indexToRemove: number) => {
    setSegments((prevSegments) =>
      prevSegments.filter((_, index) => index !== indexToRemove)
    );
  };

  async function directToLs() {
    if (!user?.userid) return; // 防御性检查，确保 userId 存在
    const lsURL = `https://manysoft.lemonsqueezy.com/buy/b101d5b7-f59c-4067-a7bd-65ca83b976c8?checkout[custom][user_id]=${user.userid}`;
    const response = await requestOpenExternalUrl({
      url: lsURL,
    });
  }

  const backToShapeFill = () => {
    setCurrentPage('main'); // 返回主页面
  };

  const goToIconList = () => {
    setCurrentPage('icons'); // 切换到二级页面
    setIconsResult(icons)
  };

  const startSvgFill = async()=>{
    setIsGenerating(true);
    const token = getToken()
    const {url,viewBoxHeigh,viewBoxWidth,iconHeight,iconWidth} =  await createSvgFill(selectedIcon,svgConfig.svgUrl,svgConfig.color,svgConfig.value as number)
    // const {labelUrl,labelWidth,labelHeight} = await createLabel(svgConfig.color,labelSize,labelSize)
    // addNativeElement({
    //   type: "IMAGE",
    //   dataUrl: url
    // });
    addNativeElement({
      type:"GROUP",
      children:[
        {
          type: "IMAGE",
          dataUrl: url,
          width:viewBoxWidth/12,
          height:viewBoxHeigh/12,
          top:0,
          left:0,
        },
        {
          type: "TEXT",
          children: [`${svgConfig.value}%`],
          fontSize: 16,
          textAlign: "center",
          top: viewBoxHeigh/12 + 5,
          left: viewBoxWidth/12/2-14,
        }
      ],
    });
    const updatedUser = await subCredits(token,"shapeFill")
    setCredits(updatedUser.shape_fill_credits)
    setUser(prevUser => prevUser ? { ...prevUser, shape_fill_credits: updatedUser.shape_fill_credits } : null);
    setIsGenerating(false);
  };

  const startFill = async ()=>{
    setIsGenerating(true);
    const token = getToken()
    try {
      // 获取抠图+比例填充后的图像、和对应的高和宽
      const {imgUrl,imgWidth,imgHeight} = await createPercentFill(file as string,segments,fillPattern)
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
          
          // 计算每个元素的位置
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
    } catch (e: any) {
      console.log(e)
      setErrorMessage(
        `error`
      );
    }
    const updatedUser = await subCredits(token, "imageFill");
    setCredits(updatedUser.image_fill_credits);
    setUser(prevUser => prevUser ? { ...prevUser, image_fill_credits: updatedUser.image_fill_credits } : null);
    setIsGenerating(false);
  }

  // 定义生成错误提示信息的函数
  const setErrorMessage = (e: string) => {
    setIsGenerating(false);
    // 将函数传入的 e 错误信息，set 到变量error中
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
    const updatedSvgConfig = svgConfig
    updatedSvgConfig.svgUrl = icon.url
    setSvgConfig(updatedSvgConfig)
  }

  const handleIconClickInList = (icon:icon) => {
    const index = icons.findIndex((i) => i.id === icon.id);
    if (index > -1) {
      // 创建 icons 数组的浅拷贝
      const updatedIcons = [...icons];
      // 交换图标位置
      [updatedIcons[0], updatedIcons[index]] = [updatedIcons[index], updatedIcons[0]];
      // 更新 icons 数组
      setIcons(updatedIcons);
    }
    
    // 更新选中图标和 SVG 配置
    setSelectedIcon(icon.id);
    const updatedSvgConfig = { ...svgConfig, svgUrl: icon.url };
    setSvgConfig(updatedSvgConfig);

    // 返回到主页
    setCurrentPage('main');
  }

  async function searchIcons(token:string,keyword: string) {
    try {
      const params = {
        keyword: keyword
      };
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`http://localhost:3000/api/iconsearch?${queryString}`, {
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

// FormField组件的control属性，需要传1个可返回组件的函数，比如下文的Select就是返回的组件，组件中固定写...props，用于获取上层formfield组件的所有属性
// setInput((i) => ({ ...i, format: BarcodeFormat[value] }))，i 指代的是当前对象，..i指代当前对象的所有属性，通过后续的format赋值实现重写
  return (
    <div className={styles.scrollContainer}>
    {currentPage==='main'&&(
      <Tabs onSelect={(id)=>{handleTabChange(id)}}>
        <Rows spacing="1u">
          <TabList>
            <Tab id="shapefill">
              ShapeFill
            </Tab>
            <Tab id="imagefill">
              ImageFill
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel id="shapefill">
                  <Columns spacing="0" align="spaceBetween" alignY="center" >
                    <Text variant="bold" >Icons</Text>
                    <Columns spacing="1u" align="end" alignY="center">
                      <Text>more</Text>  
                      <Button
                        type="button"
                        variant="tertiary"
                        icon={ChevronRightIcon}
                        ariaLabel="ariaLabel"
                        iconPosition="end"
                        alignment="end"
                        size="small"
                        onClick={goToIconList}
                      />
                    </Columns>
                  </Columns>
                  <Rows spacing="3u">
                    <Rows spacing="2u">
                     <Box padding="1u">
                      <Grid
                        alignY="center"
                        columns={5}
                        spacing="1u"
                      >
                        {/* 只展示 12 个元素 */}
                        {icons.slice(0, 12).map((icon, index) => (
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
                              <img src={icon.url} width="32" height="32" ></img>
                              <Text>{icon.name}</Text>
                            </div>
                          </Rows>
                        ))}
                      </Grid>
                     </Box>
                    </Rows>
                  </Rows>
                  <Rows spacing="0.5u">
                    <Box paddingY="2u">
                      <FormField
                        error={error}
                        label="Percentage(%)"
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
                          <b>Color</b>
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
                            href={`https://manysoft.lemonsqueezy.com/buy/b101d5b7-f59c-4067-a7bd-65ca83b976c8?checkout[custom][user_id]=${user.userid}`}
                            id="id"
                            requestOpenExternalUrl={() => directToLs()}
                            title="PartiFill Pro Plan"
                          >
                            upgrading to a membership
                           </Link>
                        )}
                      </Text>
                    </Box>
                    </>
                  )}
            </TabPanel>
            <TabPanel id="imagefill">
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
                    onClick={()=>directToLs()}
                    >
                      Upgrade
                    </Button>                   
                  </Rows>
                </>
              )}
              {/* 激活状态下，正常展示功能 */}
               {user?.status === 'active' && (
                <>
                  <Rows spacing="2u">
                      <FormField
                        label="image"
                        // description="The image you want to fill"
                        control={(props) => (
                          <FileInput
                            {...props}
                            stretchButton
                            accept={[
                              'image/*'
                            ]}
                            onDropAcceptedFiles={(files:File[])=>{
                              const uploadedImg = files[0] 
                              const reader = new FileReader(); // 创建FileReader对象
                              reader.onloadend = () => {
                                const base64URL = reader.result; // 获取DataURL（Base64编码）
                                setFile(base64URL as string);
                              };
                              reader.readAsDataURL(uploadedImg); // 将文件读取为DataURL（Base64编码）
                            }}
                          />
                        )}
                      />
                      {file && <img src={file as string} alt="Uploaded image" />}
                      <FormField
                      label="Fill Direction"
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
                      <Rows spacing="3u">
                        {segments.map((segment, index) => (
                          <Box
                            key={index}
                            background="neutralLow"
                            borderRadius="large"
                            padding="2u"
                          >
                            <Rows spacing="1u">
                              <Columns spacing="0" align="spaceBetween" alignY="center">
                                <Title size="xsmall">
                                  Portion {index + 1}
                                </Title>
                                {index !== 0 && (
                                  <Button
                                    type="button"
                                    variant="tertiary"
                                    icon={TrashIcon}
                                    ariaLabel="ariaLabel"
                                    size="medium"
                                    onClick={() => removeSegment(index)}
                                  />
                                )}
                              </Columns>
                              <Grid alignX="stretch" alignY="stretch" columns={1} spacing="1u">
                                <Box
                                  background="neutralLow"
                                  borderRadius="large"
                                  padding="1u"
                                >
                                  <FormField
                                    error={error}
                                    label="Label name"
                                    control={(props) => (
                                      <TextInput
                                        type="text"
                                        name="label"
                                        placeholder="input label name"
                                        onChange={(data) => {
                                          const updatedSegments = [...segments];
                                          updatedSegments[index].name = data;
                                          setSegments(updatedSegments);
                                        }}
                                      />
                                    )}
                                  />
                                </Box>
                                <Box
                                  background="neutralLow"
                                  borderRadius="large"
                                  padding="1u"
                                > 
                                  <FormField
                                    error={error}
                                    label="Percentage(%)"
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
                                  {/* <FormField
                                    error={error}
                                    label="Percentage(%)"
                                    control={(props) => (
                                      <NumberInput
                                        // placeholder=""
                                        maximumFractionDigits={100}
                                        onChange={(data) => {
                                          const updatedSegments = [...segments];
                                          updatedSegments[index].value = data;
                                          setSegments(updatedSegments);
                                        }}
                                      />
                                    )}
                                  /> */}
                                </Box>
                                <Box
                                  background="neutralLow"
                                  borderRadius="large"
                                  padding="1u"
                                >
                                  <Columns spacing="0" align="spaceBetween" alignY="center">
                                    <Text>
                                      <b>Color</b>
                                    </Text>
                                    <ColorSelector
                                      onChange={(data) => {
                                        const updatedSegments = [...segments];
                                        updatedSegments[index].color = data;
                                        setSegments(updatedSegments);
                                      }}
                                      color={segment.color}
                                    />
                                  </Columns>
                                </Box>
                                <Box
                                  background="neutralLow"
                                  borderRadius="large"
                                  padding="1u"
                                >
                                  <Text>
                                      <b>Opacity</b>
                                    </Text>
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
                        Add segment
                      </Button>
                      <Button
                        variant="primary"
                        onClick={startFill}
                        stretch
                        loading={isGenerating ? true : undefined} // 条件渲染 loading 属性
                        disabled={isGenerating || (user?.variant_id !== 493905 && (credits ?? 0) <= 0)}                      >
                        Generate
                      </Button>
                  </Rows>
                  {/* 如果是月付计划，则会提示额度剩余可用额度,引导升级年会会员 */}
                 {(user?.variant_id == 496415) && (
                    <>
                    <Box paddingY="2u">
                      <Text>
                        The credits you can use to fill Image remaining {credits} in this month. Get unlimited usage by{' '}
                        {user?.userid && (
                          <Link
                            href={`https://manysoft.lemonsqueezy.com/buy/b101d5b7-f59c-4067-a7bd-65ca83b976c8?checkout[custom][user_id]=${user.userid}`}
                            id="id"
                            requestOpenExternalUrl={() => directToLs()}
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
          <Rows spacing="3u">
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
              <Rows spacing="1.5u">  
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
                            borderRadius: '4px', // 添加圆角边框
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
                  <Box padding="4u" alignItems="center">
                    <Rows spacing="3u" align="center">
                      <FaRegFrown size={48} color="#999" />
                      <Title size="medium">No matching icons found</Title>
                      <Text>Sorry, we couldn't find any icons that match your search.</Text>
                      <Text>Try the following:</Text>
                      <Rows spacing="1u" align="start">
                        <Text>• Check your spelling</Text>
                        <Text>• Try different keywords</Text>
                        <Text>• Use more general terms</Text>
                      </Rows>
                      <Button 
                        variant="secondary"
                        onClick={() => {
                          // 清空搜索框内容
                          setSearchKeyword('');
                          // 重置搜索结果为所有图标
                          setIconsResult(icons);
                          setHasSearchResults(true);
                          // 添加一个小延迟，确保状态更新已完成
                          setTimeout(() => {
                            // 再次确保图标列表显示所有图标
                            setIconsResult(prevIcons => prevIcons.length ? prevIcons : icons);
                          }, 0);
                        }}
                      >
                        Show all icons
                      </Button>
                    </Rows>
                  </Box>
                ) : null}
              </Rows>
            </Box>
          </Rows>
        </>
      )}
    </div>
  );
};
