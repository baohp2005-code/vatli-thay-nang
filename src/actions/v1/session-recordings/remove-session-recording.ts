'use server';

import { AxiosError } from 'axios';
import { revalidatePath } from 'next/cache';
import { api } from '@/lib/axios';
import { extractErrors } from '@/lib/errors';
import type { IActionState } from '@/types/actions/users';

export async function removeSessionRecordingAction(classSessionId: number): Promise<IActionState> {
  try {
    await api.delete(`/api/v1/class-sessions/${classSessionId}/recording`);
    revalidatePath('/admin/classes/[id]/class-sessions/[sessionId]', 'page');
    revalidatePath('/dashboard/classes/[id]/class-sessions/[sessionId]', 'page');
    return { errors: [] };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return { errors: extractErrors(error.response.data) };
    }
    return { errors: ['Gỡ record thất bại'] };
  }
}
