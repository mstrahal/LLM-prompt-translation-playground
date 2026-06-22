import db from "@/lib/db";
import { notFound } from "next/navigation";
import WorkspaceClient from "@/components/WorkspaceClient";

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch project details
  const project = await db.project.findUnique({
    where: { id },
    include: {
      sourceSegments: {
        orderBy: {
          key: 'asc',
        },
      },
    },
  });

  if (!project) {
    return notFound();
  }

  // Fetch all translation runs for the project
  const runs = await db.translationRun.findMany({
    where: { projectId: id },
    include: {
      translations: true,
      translationLQA: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Safe date serialization helper
  const safeDateString = (val: any): string => {
    if (!val) return new Date().toISOString();
    if (val instanceof Date) return val.toISOString();
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? String(val) : d.toISOString();
    } catch {
      return String(val);
    }
  };

  // Serialize dates to prevent RSC serialization errors
  const serializedProject = {
    ...project,
    createdAt: safeDateString(project.createdAt),
    updatedAt: safeDateString(project.updatedAt),
    sourceSegments: project.sourceSegments.map(seg => ({
      ...seg,
      createdAt: safeDateString(seg.createdAt),
    })),
  };

  const serializedRuns = runs.map(run => ({
    ...run,
    createdAt: safeDateString(run.createdAt),
    translationLQA: run.translationLQA ? {
      ...run.translationLQA,
      createdAt: safeDateString(run.translationLQA.createdAt),
    } : null,
    translations: run.translations.map(t => ({
      ...t,
      createdAt: safeDateString(t.createdAt),
    })),
  }));

  return (
    <WorkspaceClient project={serializedProject} initialRuns={serializedRuns} />
  );
}
