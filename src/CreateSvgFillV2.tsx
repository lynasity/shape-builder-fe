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
  transparency: number
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

  const width = parseFloat(svgElement.getAttribute('width') || '0');
  const height = parseFloat(svgElement.getAttribute('height') || '0');

  let viewBoxWidth, viewBoxHeight;
  const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number);
  if (viewBox && viewBox.length === 4) {
    [, , viewBoxWidth, viewBoxHeight] = viewBox;
  } else {
    viewBoxWidth = Number.isFinite(width) ? width : 100;
    viewBoxHeight = Number.isFinite(height) ? height : 100;
    svgElement.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`);
  }

  console.log(`viewBoxWidth: ${viewBoxWidth}, viewBoxHeight: ${viewBoxHeight}`);

  // 创建一个临时的 Image 对象来渲染 SVG
  const encodedSvg = encodeURIComponent(svgContent);
  const imageSrc = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
  const image = new Image();
  image.src = imageSrc;

  // 等待图片加载
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
  });

  // 创建两个 canvas：一个用于原始图像，一个用于最终结果
  const originalCanvas = document.createElement('canvas');
  const originalCtx = originalCanvas.getContext('2d');
  const finalCanvas = document.createElement('canvas');
  const finalCtx = finalCanvas.getContext('2d');

  if (!originalCtx || !finalCtx) {
    throw new Error('Failed to get canvas context');
  }

  originalCanvas.width = viewBoxWidth;
  originalCanvas.height = viewBoxHeight;
  finalCanvas.width = viewBoxWidth;
  finalCanvas.height = viewBoxHeight;

  // 先在原始 canvas 上绘制完整的 SVG
  originalCtx.drawImage(image, 0, 0, viewBoxWidth, viewBoxHeight);

  // 计算填充高度
  const fillHeight = finalCanvas.height * (fillPercentage / 100);
  const fillStartY = finalCanvas.height - fillHeight;

  // 绘制填充部分（完全不透明）
  finalCtx.drawImage(originalCanvas, 
    0, fillStartY, viewBoxWidth, fillHeight,  // source
    0, fillStartY, viewBoxWidth, fillHeight   // destination
  );

  // 绘制透明部分
  finalCtx.globalAlpha = transparency / 100;
  finalCtx.drawImage(originalCanvas,
    0, 0, viewBoxWidth, fillStartY,          // source
    0, 0, viewBoxWidth, fillStartY           // destination
  );

  const svgResult: coreSvg = {
    url: finalCanvas.toDataURL('image/png'),
    viewBoxHeigh: viewBoxHeight,
    viewBoxWidth: viewBoxWidth,
    iconHeight: viewBoxHeight,
    iconWidth: viewBoxWidth
  };

  document.body.removeChild(tempDiv);
  return svgResult;
};

export default createSvgFillV2;