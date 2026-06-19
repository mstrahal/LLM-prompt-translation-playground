'use client';

import React, { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { deleteProjectAction } from '@/app/actions';

interface DeleteProjectButtonProps {
  projectId: string;
  projectName: string;
}

export default function DeleteProjectButton({ projectId, projectName }: DeleteProjectButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Stop parent <Link> navigation click

    if (window.confirm(`Are you sure you want to delete the project "${projectName}"? This will permanently delete all associated translation runs and segments.`)) {
      setIsDeleting(true);
      try {
        const res = await deleteProjectAction(projectId);
        if (res && !res.success) {
          alert(res.error || "Failed to delete project.");
          setIsDeleting(false);
        }
      } catch (error: any) {
        console.error("Failed to delete project:", error);
        alert(error.message || "Failed to delete project.");
        setIsDeleting(false);
      }
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="btn btn-secondary btn-danger"
      style={{
        padding: '0.4rem',
        borderRadius: '6px',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(244, 63, 94, 0.1)',
        color: '#fda4af',
        cursor: 'pointer',
      }}
      title="Delete Project"
    >
      {isDeleting ? (
        <Loader2 size={14} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
      ) : (
        <Trash2 size={14} />
      )}
      
      <style jsx>{`
        button:hover {
          background-color: var(--color-accent-rose) !important;
          color: white !important;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
