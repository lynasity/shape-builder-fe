type label = {
    labelUrl: string;
    labelWidth: number;
    labelHeight: number;
  };
  
  function createLabel(color: string, width: number, height: number): Promise<label> {
    return new Promise((resolve, reject) => {
      // 创建 canvas 元素
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
  
      if (!ctx) {
        reject(new Error("Can't get CanvasRenderingContext2D"));
        return;
      }
  
      // 设置 canvas 的宽度和高度
      canvas.width = width;
      canvas.height = height;
  
      // 绘制矩形并填充颜色
      ctx.fillStyle = color; // 设置填充颜色
      ctx.fillRect(0, 0, width, height); // 绘制矩形
  
      // 返回包含 dataUrl、宽度和高度的对象
      resolve({
        labelUrl: canvas.toDataURL(), // 获取填充后的 data URL
        labelWidth: canvas.width,
        labelHeight: canvas.height,
      });
    });
  }
  
  export default createLabel;