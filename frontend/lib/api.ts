const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type DocType =
  | "meeting_notes"
  | "requirement_draft"
  | "implementation_notes"
  | "project_update"
  | "decision_record"
  | "unknown";

export type ItemType =
  | "fact"
  | "decision"
  | "assumption"
  | "risk"
  | "open_question"
  | "action_item";

export type ItemStatus = "confirmed" | "assumption" | "unresolved";
export type ActionStatus = "none" | "proposed" | "approved" | "rejected" | "edited";

export interface Project {
  id: string;
  name: string;
  created_at: string;
}

export interface Document {
  id: string;
  filename: string;
  doc_type: DocType;
  doc_type_confidence: number;
  uploaded_at: string;
}

export interface Item {
  id: string;
  document_id: string;
  section_ref: string;
  item_type: ItemType;
  content: string;
  status: ItemStatus;
  ai_confidence: number;
  is_ai_suggestion: boolean;
  action_status: ActionStatus;
  conflict_group_id: string | null;
  document_filename: string | null;
}

export interface Conflict {
  id: string;
  description: string;
  resolution_note: string | null;
  resolved_by_user: boolean;
  item_ids: string[];
}

export interface Summary {
  id: string;
  saved_at: string;
  items: Item[];
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listProjects: () => request<Project[]>("/projects"),
  createProject: (name: string) =>
    request<Project>("/projects", { method: "POST", body: JSON.stringify({ name }) }),
  getProject: (id: string) => request<Project>(`/projects/${id}`),

  listDocuments: (projectId: string) => request<Document[]>(`/projects/${projectId}/documents`),
  uploadDocument: (projectId: string, filename: string, raw_text: string) =>
    request<Document>(`/projects/${projectId}/documents`, {
      method: "POST",
      body: JSON.stringify({ filename, raw_text }),
    }),
  analyze: (projectId: string) =>
    request<Item[]>(`/projects/${projectId}/analyze`, { method: "POST" }),

  listItems: (projectId: string) => request<Item[]>(`/projects/${projectId}/items`),
  updateItem: (itemId: string, payload: { content?: string; status?: ItemStatus }) =>
    request<Item>(`/items/${itemId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  updateItemAction: (itemId: string, action_status: ActionStatus) =>
    request<Item>(`/items/${itemId}/action`, {
      method: "PATCH",
      body: JSON.stringify({ action_status }),
    }),

  listConflicts: (projectId: string) => request<Conflict[]>(`/projects/${projectId}/conflicts`),
  resolveConflict: (conflictId: string, resolution_note: string) =>
    request<Conflict>(`/conflicts/${conflictId}`, {
      method: "PATCH",
      body: JSON.stringify({ resolution_note }),
    }),

  saveSummary: (projectId: string, item_ids: string[]) =>
    request<Summary>(`/projects/${projectId}/summary`, {
      method: "POST",
      body: JSON.stringify({ item_ids }),
    }),
  getSummary: (summaryId: string) => request<Summary>(`/summaries/${summaryId}`),
};

export { ApiError };
