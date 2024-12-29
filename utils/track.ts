import {auth} from "@canva/user"

interface TrackParams {
    eventType: string;    // 事件类型
    element?: string;     // 触发事件的元素
    result?: string;      // 事件结果
  }

  const apiBaseUrl = 'https://percentfill-backend--partfill.us-central1.hosted.app';
// const apiBaseUrl = 'http://localhost:3000';
  /**
   * 上报埋点数据
   * @param params 埋点参数
   * @returns Promise<boolean> 上报是否成功
   */
  export const track = async (params: TrackParams): Promise<boolean> => {
    try {
      const token = await auth.getCanvaUserToken();
      const response = await fetch(`${apiBaseUrl}/api/mark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventType: params.eventType,
          element: params.element || '',
          result: params.result || '',
        }),
      });
  
      if (!response.ok) {
        throw new Error('埋点上报失败');
      }
  
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('埋点上报错误:', error);
      return false;
    }
  };
  
  // 预定义的事件类型常量
  export const TrackEvents = {
    CLICK_UPGRADE: 'click_upgrade',           // 点击升级按钮
    CLICK_BILLING:'click_billing',            //点击查看ls的账单页
    CLICK_UPLOAD_ICON:'click_upload_icon',    //iconfill选择上传 icon
    CLICK_ICON_LIBRARY:'click_icon_library',    //iconfill选择从library选择icon
    SHOW_IMAGETAB:'show_imagetab',            //切换到imagetab
    SHOW_ICONTAB:'show_icontab',            //切换到icontab
    GENERATE_IMAGE: 'generate_image',         // 生成图片
    GENERATE_ICON: 'generate_icon',         // 生成图片
    SEE_ALL_ICONS: 'see_all_icons',         // 查看所有icon
    SEE_VIDEO: 'see_video',         // 查看视频
  } as const;