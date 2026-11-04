import type { Project } from '../types/project';

export interface PublishKit {
  douyin: { title: string; description: string; tags: string[] };
  bilibili: { title: string; description: string; zone: string; tags: string[] };
  channels: { title: string; description: string };
  youtube: { title: string; description: string; tags: string[] };
}

const AI_DISCLAIMER = '本片全部画面由 AI 生成，非实拍。';

/** 截断到指定字数 */
function cut(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * 发布套件：输入成片标题 + 项目信息 → 四平台发布文案（自动带 AI 声明，不烧录水印）
 */
export function generatePublishKit(project: Project, filmTitle: string): PublishKit {
  const title = filmTitle.trim() || project.name;
  const themeTag = project.theme.replace(/\s+/g, '');
  const styleTag = `AI${project.style}`;

  const douyinTags = ['#AI漫剧', '#AI视频', '#二次元', ...(themeTag ? [`#${themeTag}`] : []), '#原创'];
  const douyinTitle = cut(title, 20);

  return {
    douyin: {
      title: douyinTitle,
      description: `${title}｜${project.oneLineStory || project.theme || '原创短篇'}\n\n${AI_DISCLAIMER}\n（画面内无水印无烧录字幕，文字均为后期 overlay）`,
      tags: douyinTags.slice(0, 5),
    },
    bilibili: {
      title: title,
      description: `${project.oneLineStory || project.theme || '原创短篇'}\n\n制作流程：角色卡锁定 → 分镜接力 → 逐段生成 → 15 项 QC → 统一色彩拼接。\n\n${AI_DISCLAIMER}`,
      zone: project.aspectRatio === '9:16' ? '动画（综合）' : '动画（国产动画）',
      tags: ['AI动画', 'AI生成', '原创', project.style, ...(themeTag ? [themeTag] : [])],
    },
    channels: {
      title: cut(title, 16),
      description: `${title}\n${project.oneLineStory || ''}\n\n${AI_DISCLAIMER}`,
    },
    youtube: {
      title: cut(`${title} | AI-Generated Short Film`, 100),
      description: `${project.oneLineStory || ''}\n\nAn AI-generated short film made with a full pipeline: character lock (style bible), shot-to-shot continuation, 15-point QC checklist and unified color grading.\n\nAll visuals in this video are AI-generated (no live action footage). No watermark or burned-in text.\n\n#${styleTag}`,
      tags: ['AI film', 'AI animation', 'generated video', project.style, 'short film', ...(themeTag ? [themeTag] : [])],
    },
  };
}

/** 拼成可整段复制的纯文本 */
export function kitToText(kit: PublishKit, platform: keyof PublishKit): string {
  switch (platform) {
    case 'douyin': {
      const k = kit.douyin;
      return `【抖音】\n标题：${k.title}\n简介：${k.description}\n标签：${k.tags.join(' ')}`;
    }
    case 'bilibili': {
      const k = kit.bilibili;
      return `【B站】\n标题：${k.title}\n简介：${k.description}\n分区：${k.zone}\n标签：${k.tags.join(' ')}`;
    }
    case 'channels': {
      const k = kit.channels;
      return `【视频号】\n标题：${k.title}\n简介：${k.description}`;
    }
    case 'youtube': {
      const k = kit.youtube;
      return `【YouTube】\nTitle: ${k.title}\nDescription: ${k.description}\nTags: ${k.tags.join(', ')}`;
    }
  }
}
