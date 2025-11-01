// SVG를 data URL로 인코딩하는 헬퍼
function encodeSvg(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// 패턴 생성 함수들
export const patterns = {
  stars: (color = '#9C92AC', opacity = 0.4) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="${color}" fill-opacity="${opacity}"><polygon fill-rule="evenodd" points="8 4 12 6 8 8 6 12 4 8 0 6 4 4 6 0 8 4"/></g></svg>`;
    return encodeSvg(svg);
  },

  dots: (color = '#000', opacity = 0.1, size = 2) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="${size}" fill="${color}" opacity="${opacity}"/></svg>`;
    return encodeSvg(svg);
  },

  diagonal: (color = '#9C92AC', opacity = 0.2) => {
    const svg = `<svg width="6" height="6" viewBox="0 0 6 6" xmlns="http://www.w3.org/2000/svg"><g fill="${color}" fill-opacity="${opacity}" fill-rule="evenodd"><path d="M5 0h1L0 6V5zM6 5v1H5z"/></g></svg>`;
    return encodeSvg(svg);
  },

  grid: (color = '#000', opacity = 0.05) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="1" fill="${color}" opacity="${opacity}"/><rect width="1" height="20" fill="${color}" opacity="${opacity}"/></svg>`;
    return encodeSvg(svg);
  },

  diamond: (color = 'red', opacity = 0.05) => {
    const svg = `<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><path d="M30 0L60 30L30 60L0 30Z" fill="${color}" opacity="${opacity}"/></svg>`;
    return encodeSvg(svg);
  },
};

// 타입 안전한 패턴 빌더 (선택사항)
export function createPattern(options: {
  type: 'stars' | 'dots' | 'diagonal' | 'grid' | 'diamond';
  color?: string;
  opacity?: number;
  size?: number;
}) {
  const { type, color, opacity, size } = options;

  switch (type) {
    case 'stars':
      return patterns.stars(color, opacity);
    case 'dots':
      return patterns.dots(color, opacity, size);
    case 'diagonal':
      return patterns.diagonal(color, opacity);
    case 'grid':
      return patterns.grid(color, opacity);
    case 'diamond':
      return patterns.diamond(color, opacity);
  }
}
