import type { Project } from '../../types/project';
import type { ProjectStats } from '../../lib/stats';
import ProjectCard from './ProjectCard';

interface ProjectListProps {
  projects: Project[];
  statsMap: Map<string, ProjectStats>;
  onDuplicate: (p: Project) => void;
  onExport: (p: Project) => void;
  onDelete: (p: Project) => void;
}

/** 项目卡片网格（空状态由页面处理） */
export default function ProjectList({ projects, statsMap, onDuplicate, onExport, onDelete }: ProjectListProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {projects.map((p) => (
        <ProjectCard
          key={p.id}
          project={p}
          stats={statsMap.get(p.id) ?? {
            totalShots: 0,
            passedShots: 0,
            pendingQCShots: 0,
            failedShots: 0,
            shotsWithPassingClip: 0,
            totalClips: 0,
            passingClips: 0,
            qcTotal: 0,
            qcPassed: 0,
          }}
          onDuplicate={() => onDuplicate(p)}
          onExport={() => onExport(p)}
          onDelete={() => onDelete(p)}
        />
      ))}
    </div>
  );
}
