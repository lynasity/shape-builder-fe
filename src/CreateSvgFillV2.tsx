type coreSvg = {
  url: string,
  viewBoxWidth: number,
  viewBoxHeigh: number,
  iconWidth: number,
  iconHeight: number
};

const createSvgFillV2 = async (
  svgContent: string,
  fillPercentage: number,
  transparency:number
): Promise<coreSvg> => {
  console.log('svgcontent=' + svgContent);
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.visibility = 'hidden';
  tempDiv.innerHTML = svgContent;
  document.body.appendChild(tempDiv);

  const svgElement = tempDiv.querySelector('svg');
  if (!svgElement) {
    throw new Error('SVG element not found');
  }

  const paths = svgElement.querySelectorAll('path');
  if (paths.length === 0) {
    throw new Error('No path elements found');
  }

  const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number);
  if (!viewBox || viewBox.length < 4) {
    throw new Error('Invalid viewBox attribute');
  }

  const [, , viewBoxWidth, viewBoxHeight] = viewBox;
  console.log(`viewBoxWidth: ${viewBoxWidth}, viewBoxHeight: ${viewBoxHeight}`);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  canvas.width = viewBoxWidth;
  canvas.height = viewBoxHeight;

  const fillHeight = canvas.height * (fillPercentage / 100);
  const fillStartY = canvas.height - fillHeight;

  // 先绘制原始图像
  paths.forEach(path => {
    const path2D = new Path2D(path.getAttribute('d') || '');
    const pathBBox = path.getBBox();
    const pathTop = pathBBox.y;

    ctx.save(); // 保存当前绘图状态

    if (pathTop >= fillStartY) {
      // 整个元素在保留范围内，保持原色
      ctx.fillStyle = path.getAttribute('fill') || 'black';
      ctx.fill(path2D);
    } else if (pathBBox.y + pathBBox.height > fillStartY) {
      // 元素部分在保留范围内，部分透明
      ctx.beginPath();
      ctx.rect(0, fillStartY, canvas.width, fillHeight);
      ctx.clip();
      ctx.fillStyle = path.getAttribute('fill') || 'black';
      ctx.fill(path2D);

      ctx.restore(); // 恢复到未剪裁状态
      ctx.save(); // 再次保存状态以便下次恢复

      ctx.globalAlpha = (transparency/100);
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, fillStartY);
      ctx.clip();
      ctx.fillStyle = path.getAttribute('fill') || 'black';
      ctx.fill(path2D);
    } else {
      // 整个元素在透明范围内，降低透明度
      ctx.globalAlpha = (transparency/100); // 设置透明度为原来的一半
      ctx.fillStyle = path.getAttribute('fill') || 'black';
      ctx.fill(path2D);
    }

    ctx.restore(); // 恢复到未剪裁状态
  });

  const svgResult: coreSvg = {
    url: canvas.toDataURL('image/png'),
    viewBoxHeigh: viewBoxHeight,
    viewBoxWidth: viewBoxWidth,
    iconHeight: viewBoxHeight,
    iconWidth: viewBoxWidth
  };

  document.body.removeChild(tempDiv);

  return svgResult;
};

export default createSvgFillV2;