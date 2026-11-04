export type CheckResult = 'pass' | 'fail' | 'skip';

export interface QCCheckItem {
  id: number; /** 1–15，对应 QC_CHECKLIST */
  result: CheckResult | null; /** null = 还没打分（15 项全部打过才能提交） */
  note: string; /** 不通过时填的原因 */
}

export interface QCReport {
  id: string;
  projectId: string;
  shotId: string;
  clipId: string;
  checks: QCCheckItem[]; /** 15 项，全部填完才能提交 */
  overall: 'pass' | 'fail';
  createdAt: number;
}
