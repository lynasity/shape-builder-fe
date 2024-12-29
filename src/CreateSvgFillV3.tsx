type segment = {
  color: string;
  value: number;
  opacity: number;
};

type coreSvg = {
  url: string,
  viewBoxWidth: number,
  viewBoxHeight: number,
  iconWidth: number,
  iconHeight: number
};

const createSvgFillV3 = async (
  svgContent: string,
  segments: segment[],
  iconFillMode: string
): Promise<coreSvg> => {
  try {
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

    // 获取 SVG 的原始尺寸
    const width = parseFloat(svgElement.getAttribute('width') || '0');
    const height = parseFloat(svgElement.getAttribute('height') || '0');

    // 获取 viewBox
    const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, width || 100, height || 100];
    const [, , viewBoxWidth, viewBoxHeight] = viewBox;

    // 确保所有尺寸都是有效的数字
    const finalWidth = Number.isFinite(width) ? width : viewBoxWidth;
    const finalHeight = Number.isFinite(height) ? height : viewBoxHeight;
    const finalViewBoxWidth = Number.isFinite(viewBoxWidth) ? viewBoxWidth : 100;
    const finalViewBoxHeight = Number.isFinite(viewBoxHeight) ? viewBoxHeight : 100;

    console.log(`Dimensions: ${finalWidth}x${finalHeight}, ViewBox: ${finalViewBoxWidth}x${finalViewBoxHeight}`);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // 设置 canvas 尺寸
    canvas.width = finalViewBoxWidth;
    canvas.height = finalViewBoxHeight;

    const paths = svgElement.querySelectorAll('path');
    if (paths.length === 0) {
      throw new Error('No path elements found');
    }

    if (iconFillMode === 'stacked') {
      // 原有的垂直填充逻辑
      let currentY = canvas.height;
      paths.forEach(path => {
        const path2D = new Path2D(path.getAttribute('d') || '');
        const pathBBox = path.getBBox();

        segments.forEach((segment, index) => {
          const segmentHeight = canvas.height * (segment.value / 100);
          const segmentTop = currentY - segmentHeight;

          ctx.save();

          if (pathBBox.y >= segmentTop && pathBBox.y + pathBBox.height <= currentY) {
            ctx.fillStyle = segment.color;
            ctx.globalAlpha = segment.opacity / 100;
            ctx.fill(path2D);
          } else if (pathBBox.y < currentY && pathBBox.y + pathBBox.height > segmentTop) {
            ctx.beginPath();
            ctx.rect(0, segmentTop, canvas.width, segmentHeight);
            ctx.clip();
            ctx.fillStyle = segment.color;
            ctx.globalAlpha = segment.opacity / 100;
            ctx.fill(path2D);
          }

          ctx.restore();
          currentY = segmentTop;
        });
      });
    } else if (iconFillMode === 'stacked2') {
      // 新增的水平填充逻辑
      let currentX = 0;
      paths.forEach(path => {
        const path2D = new Path2D(path.getAttribute('d') || '');
        const pathBBox = path.getBBox();

        segments.forEach((segment, index) => {
          const segmentWidth = canvas.width * (segment.value / 100);
          const segmentRight = currentX + segmentWidth;

          ctx.save();

          if (pathBBox.x >= currentX && pathBBox.x + pathBBox.width <= segmentRight) {
            ctx.fillStyle = segment.color;
            ctx.globalAlpha = segment.opacity / 100;
            ctx.fill(path2D);
          } else if (pathBBox.x < segmentRight && pathBBox.x + pathBBox.width > currentX) {
            ctx.beginPath();
            ctx.rect(currentX, 0, segmentWidth, canvas.height);
            ctx.clip();
            ctx.fillStyle = segment.color;
            ctx.globalAlpha = segment.opacity / 100;
            ctx.fill(path2D);
          }

          ctx.restore();
          currentX = segmentRight;
        });
      });
    }

    const svgResult: coreSvg = {
      url: canvas.toDataURL('image/png'),
      viewBoxWidth: finalViewBoxWidth,
      viewBoxHeight: finalViewBoxHeight,
      iconWidth: finalWidth,
      iconHeight: finalHeight
    };

    document.body.removeChild(tempDiv);
    
    // 最后检查确保所有值都是有效的数字
    Object.entries(svgResult).forEach(([key, value]) => {
      if (key !== 'url' && !Number.isFinite(value)) {
        console.error(`Invalid value for ${key}: ${value}`);
        throw new Error(`Invalid dimension value for ${key}`);
      }
    });

    return svgResult;
  } catch (error) {
    console.error('Error in createSvgFillV3:', error);
    throw error;
  }
};

export default createSvgFillV3;