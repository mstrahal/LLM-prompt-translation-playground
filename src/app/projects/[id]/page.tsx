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

  return (
    <WorkspaceClient project={project} initialRuns={runs} />
  );
}
