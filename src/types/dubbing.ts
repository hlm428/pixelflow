/** 配音方案 */
export type DubbingScheme = '无配音' | '真人配音' | '日语 TTS' | '中文 TTS';
export const DUBBING_SCHEMES: DubbingScheme[] = ['无配音', '真人配音', '日语 TTS', '中文 TTS'];

export type DubbingStatus = '待配音' | '配音中' | '已完成';
export const DUBBING_STATUSES: DubbingStatus[] = ['待配音', '配音中', '已完成'];

/** 一段台词 / 旁白的配音记录 */
export interface Dubbing {
  id: string;
  projectId: string;
  shotId: string;
  speaker: string; /** 说话人 */
  text: string; /** 台词内容 */
  startSec: number; /** 在成片里的开始时间（秒） */
  endSec: number; /** 在成片里的结束时间（秒） */
  provider: string; /** TTS 供应商 id */
  voice: string; /** 声音名 */
  fileName: string; /** 上传的音频文件名，'' = 未上传 */
  audioDuration: number; /** 音频时长（秒），0 = 未上传 */
  status: DubbingStatus;
}

/** TTS 供应商资料卡（内置默认值，用户可改额度和截止日期） */
export interface TTSProvider {
  id: string;
  name: string;
  website: string;
  freeQuota: string;
  price: string;
  deadline: string; /** 'YYYY-MM-DD'，'' = 无截止日期 */
  pros: string;
  cons: string;
  bestFor: string; /** 适合什么场景 */
  endpoint: string; /** API 接入说明 */
  needsV1: boolean; /** endpoint 是否要带 /v1 */
  notes: string;
}
