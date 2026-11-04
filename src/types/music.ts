export interface Music {
  id: string;
  name: string;
  fileName: string;
  duration: number; /** 秒 */
  license: string; /** 授权信息 */
  usedIn: string[]; /** 用在哪些项目（项目名） */
  tags: string[];
}
