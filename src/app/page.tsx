import Link from "next/link";
import db from "@/lib/db";
import { getGlobalStatsAction } from "./actions";
import { 
  Plus, 
  Folder, 
  Layers, 
  Cpu, 
  Coins, 
  ExternalLink,
  Clock, 
  Languages 
} from "lucide-react";
import DeleteProjectButton from "@/components/DeleteProjectButton";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Fetch global stats
  const stats = await getGlobalStatsAction();

  // Fetch projects list
  const projects = await db.project.findMany({
    include: {
      translationRuns: {
        select: {
          id: true,
          totalTokens: true,
          totalCost: true,
          createdAt: true
        }
      },
      sourceSegments: {
        select: {
          id: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return (
    <div>
      {/* Page Header */}
      <div className="section-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Dashboard</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem' }}>
            Manage localization projects, review costs, and optimize translation prompts.
          </p>
        </div>
        <Link href="/projects/new" className="btn btn-primary">
          <Plus size={16} />
          <span>New Project</span>
        </Link>
      </div>

      {/* Global Statistics Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Projects</div>
          <div className="stat-value">{stats.totalProjects}</div>
          <Folder className="stat-icon" size={48} />
        </div>

        <div className="stat-card">
          <div className="stat-label">Translation Runs</div>
          <div className="stat-value">{stats.totalRuns}</div>
          <Layers className="stat-icon" size={48} />
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Tokens</div>
          <div className="stat-value">{stats.totalTokens.toLocaleString()}</div>
          <Cpu className="stat-icon" size={48} />
        </div>

        <div className="stat-card stat-card-emerald">
          <div className="stat-label">Estimated Cost</div>
          <div className="stat-value" style={{ color: 'var(--color-accent-emerald)' }}>
            ${stats.totalCost.toFixed(4)}
          </div>
          <Coins className="stat-icon" size={48} style={{ color: 'rgba(16, 185, 129, 0.05)' }} />
        </div>
      </div>

      {/* Projects List Header */}
      <div className="section-header">
        <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Folder size={22} style={{ color: 'var(--color-accent-indigo)' }} />
          Projects ({projects.length})
        </h2>
      </div>

      {/* Empty State */}
      {projects.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: '12px',
          border: '1px dashed var(--color-border)'
        }}>
          <Languages size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No projects created yet</h3>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            Get started by creating a project, uploading a translation CSV, and configuring your LLM prompts.
          </p>
          <Link href="/projects/new" className="btn btn-primary">
            <Plus size={16} />
            <span>Create Your First Project</span>
          </Link>
        </div>
      ) : (
        /* Projects Cards Grid */
        <div className="projects-grid">
          {projects.map((project) => {
            const totalProjectTokens = project.translationRuns.reduce((sum, run) => sum + run.totalTokens, 0);
            const totalProjectCost = project.translationRuns.reduce((sum, run) => sum + run.totalCost, 0);
            const formattedDate = new Date(project.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });

            return (
              <div 
                key={project.id} 
                className="project-card"
                style={{ position: 'relative' }}
              >
                {/* Delete Button (Stops propagation to avoid card click navigations) */}
                <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', zIndex: 10 }}>
                  <DeleteProjectButton projectId={project.id} projectName={project.name} />
                </div>

                <Link 
                  href={`/projects/${project.id}`} 
                  style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', height: '100%' }}
                >
                  <div className="project-card-header">
                    <h3 className="project-name" style={{ paddingRight: '2rem' }}>{project.name}</h3>
                    <div className="project-meta-badges">
                      <span className="badge badge-indigo">
                        {project.targetLanguage}
                      </span>
                      <span className="badge badge-emerald">
                        {project.geminiModel}
                      </span>
                      <span className="badge badge-secondary">
                        {project.sourceSegments.length} Segments
                      </span>
                    </div>
                  </div>

                  <div className="project-stats">
                    <div className="project-stat-item">
                      <span className="project-stat-label">Runs</span>
                      <span className="project-stat-value">{project.translationRuns.length}</span>
                    </div>

                    <div className="project-stat-item">
                      <span className="project-stat-label">Total Cost</span>
                      <span className="project-stat-value" style={{ color: 'var(--color-accent-emerald)' }}>
                        ${totalProjectCost.toFixed(5)}
                      </span>
                    </div>

                    <div className="project-stat-item" style={{ alignItems: 'flex-end' }}>
                      <span className="project-stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} />
                        Created
                      </span>
                      <span className="project-stat-value">{formattedDate}</span>
                    </div>
                  </div>
                  
                  <div style={{ 
                    marginTop: '1rem', 
                    fontSize: '0.85rem', 
                    fontWeight: 600, 
                    color: 'var(--color-accent-indigo)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.25rem',
                    justifyContent: 'flex-end'
                  }}>
                    Open Workspace <ExternalLink size={12} />
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
