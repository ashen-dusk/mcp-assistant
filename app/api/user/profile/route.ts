import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateUserProfile, getUserById, isAdmin } from '@/lib/sync-user';

/**
 * GET /api/user/profile
 * Gets the current user's profile
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await getUserById(session.user.id);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error getting user profile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/profile
 * Updates the current user's profile
 * Note: Only admins can update roles
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { username, firstName, lastName, avatarUrl, role } = body;

    // Check if trying to update role
    if (role !== undefined) {
      const userIsAdmin = await isAdmin(session.user.id);
      if (!userIsAdmin) {
        return NextResponse.json(
          { error: 'Only admins can update user roles' },
          { status: 403 }
        );
      }
    }

    // Validate data
    const updateData: {
      username?: string;
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
      role?: string;
    } = {};

    if (username !== undefined) updateData.username = username;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (role !== undefined) updateData.role = role;

    const updatedUser = await updateUserProfile(session.user.id, updateData);

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update profile' },
      { status: 500 }
    );
  }
}
