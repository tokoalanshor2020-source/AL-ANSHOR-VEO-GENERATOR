export interface GeneratorOptions {
  prompt: string;
  image?: {
    base64: string;
    mimeType: string;
  };
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  enableSound: boolean;
  resolution: '720p' | '1080p';
}

export interface ImageFile {
  base64: string;
  mimeType: string;
  previewUrl: string;
}