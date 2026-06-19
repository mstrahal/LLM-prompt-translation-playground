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
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Serialize dates to prevent RSC serialization errors
  const serializedProject = {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    sourceSegments: project.sourceSegments.map(seg => ({
      ...seg,
      createdAt: seg.createdAt.toISOString(),
    })),
  };

  const serializedRuns = runs.map(run => ({
    ...run,
    createdAt: run.createdAt.toISOString(),
    translations: run.translations.map(t => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    })),
  }));

  return (
    <WorkspaceClient project={serializedProject} initialRuns={serializedRuns} />
  );
}
