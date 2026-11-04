/** 浏览器内读取视频元数据（时长 / 分辨率），不把文件存进数据库 */
export interface VideoMeta {
  duration: number;
  width: number;
  height: number;
}

export async function readVideoMeta(file: File): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const meta: VideoMeta = {
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        width: video.videoWidth,
        height: video.videoHeight,
      };
      URL.revokeObjectURL(url);
      resolve(meta);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`无法读取视频「${file.name}」的元数据`));
    };
    video.src = url;
  });
}
