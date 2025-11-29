"use server";

import { CREATE_ASSISTANT_MUTATION, UPDATE_ASSISTANT_MUTATION } from "@/lib/graphql";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const DJANGO_API_URL = process.env.DJANGO_API_URL || process.env.BACKEND_URL || "http://localhost:8000";

interface CreateAssistantData {
  name: string;
  instructions: string;
  description?: string;
  isActive?: boolean;
  config?: {
    ask_mode?: boolean;
    max_tokens?: number;
    temperature?: number;
    datetime_context?: boolean;
    llm_provider?: string;
    llm_api_key?: string;
  };
}

interface UpdateAssistantData {
  name?: string;
  instructions?: string;
  description?: string;
  isActive?: boolean;
  config?: {
    ask_mode?: boolean;
    max_tokens?: number;
    temperature?: number;
    datetime_context?: boolean;
    llm_provider?: string;
    llm_api_key?: string;
  };
}

export async function createAssistantAction(data: CreateAssistantData) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);
    if (!session?.googleIdToken) {
      return { success: false, error: "Authentication required" };
    }

    // Clean up config - remove undefined values
    const cleanConfig = data.config ? Object.fromEntries(
      Object.entries(data.config).filter(([_, value]) => value !== undefined)
    ) : {};

    // Make GraphQL request to Django backend
    const response = await fetch(`${DJANGO_API_URL}/api/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.googleIdToken}`,
      },
      body: JSON.stringify({
        query: CREATE_ASSISTANT_MUTATION,
        variables: {
          name: data.name,
          instructions: data.instructions,
          description: data.description || null,
          isActive: data.isActive || false,
          config: cleanConfig,
        },
      }),
    });

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Non-JSON response from Django:", text.substring(0, 500));
      return {
        success: false,
        error: `Backend returned HTML instead of JSON. Status: ${response.status}. Check Django server logs.`,
      };
    }

    const result = await response.json();

    if (!response.ok || result.errors) {
      return {
        success: false,
        error: result.errors?.[0]?.message || `Failed to create assistant (Status: ${response.status})`,
      };
    }

    return {
      success: true,
      data: result.data?.createAssistant,
    };
  } catch (error) {
    console.error("Create assistant error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create assistant",
    };
  }
}

export async function updateAssistantAction(id: string, data: UpdateAssistantData) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);
    if (!session?.googleIdToken) {
      return { success: false, error: "Authentication required" };
    }

    // Clean up config - remove undefined values
    const cleanConfig = data.config ? Object.fromEntries(
      Object.entries(data.config).filter(([_, value]) => value !== undefined)
    ) : undefined;

    // Clean up data - remove undefined values at top level
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );

    // Make GraphQL request to Django backend
    const response = await fetch(`${DJANGO_API_URL}/api/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.googleIdToken}`,
      },
      body: JSON.stringify({
        query: UPDATE_ASSISTANT_MUTATION,
        variables: {
          id,
          ...cleanData,
          config: cleanConfig,
        },
      }),
    });

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Non-JSON response from Django:", text.substring(0, 500));
      return {
        success: false,
        error: `Backend returned HTML instead of JSON. Status: ${response.status}. Check Django server logs.`,
      };
    }

    const result = await response.json();

    if (!response.ok || result.errors) {
      return {
        success: false,
        error: result.errors?.[0]?.message || `Failed to update assistant (Status: ${response.status})`,
      };
    }

    return {
      success: true,
      data: result.data?.updateAssistant,
    };
  } catch (error) {
    console.error("Update assistant error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update assistant",
    };
  }
}
