import { notFound } from 'next/navigation';
import { getCourse } from '@/actions/v1/courses/get-course';
import LearnClient from './LearnClient';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function LearnPage({ params, searchParams }: Props) {
  const { id } = await params;
  const courseId = Number(id);
  if (!Number.isInteger(courseId) || courseId <= 0) notFound();

  const course = await getCourse(courseId);
  if (!course) notFound();

  const sp = await searchParams;
  const nodeId = Number(sp.item) || null;
  const tab = sp.tab === 'exams' ? 'exams' : 'content';
  const testId = Number(sp.test) || null;

  return (
    <LearnClient course={course} initialNodeId={nodeId} initialTab={tab} initialTestId={testId} />
  );
}
