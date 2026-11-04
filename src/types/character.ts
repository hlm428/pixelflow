import type { CharacterEra } from './project';

/**
 * 角色卡（Style Bible 的人物锁定）
 * 规则：卡只定脸、头发、衣服，不定动作和场景（动作和场景写在分镜里）。
 */
export interface CharacterCard {
  id: string;
  projectId: string;
  name: string;
  era: CharacterEra; /** 同名角色可有现代 / 古代 / 未来三个版本，各一张卡 */
  face: string; /** 脸型 */
  eyes: string; /** 眼睛 */
  hair: string; /** 头发 */
  clothing: string; /** 衣服 */
  personality: string; /** 性格 */
  voice: string; /** 配音：用哪个 TTS、哪个声音 */
  notes: string; /** 备注 */
  createdAt: number;
  updatedAt: number;
}
