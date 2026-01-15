import { prisma } from './prisma';
import { User as SupabaseUser } from '@supabase/supabase-js';

/**
 * Sync Supabase user to Prisma database
 * Creates or updates user record to ensure foreign key constraints are satisfied
 */
export async function syncUser(supabaseUser: SupabaseUser) {
  try {
    await prisma.user.upsert({
      where: { id: supabaseUser.id },
      update: {
        email: supabaseUser.email!,
        username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || null,
        firstName: supabaseUser.user_metadata?.first_name || supabaseUser.user_metadata?.firstName || null,
        lastName: supabaseUser.user_metadata?.last_name || supabaseUser.user_metadata?.lastName || null,
        avatarUrl: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.avatarUrl || null,
      },
      create: {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || null,
        firstName: supabaseUser.user_metadata?.first_name || supabaseUser.user_metadata?.firstName || null,
        lastName: supabaseUser.user_metadata?.last_name || supabaseUser.user_metadata?.lastName || null,
        avatarUrl: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.avatarUrl || null,
      },
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    throw error;
  }
}
