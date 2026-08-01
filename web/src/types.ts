export type Vec2 = { x: number; y: number };

/** Viewport transform: world -> screen is `translate(tx,ty) scale(scale)`. */
export type Transform = { tx: number; ty: number; scale: number };

export type Mode = "view" | "edit" | "present";

export type CardType = "text" | "photo" | "document" | "sticky";

export interface Card {
  id: string;
  type: CardType;
  title: string;
  body: string;
  url: string;
  /** PocketBase filename for photo cards. */
  image: string;
  /** PocketBase filename for document cards. */
  attachment: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  z: number;
  /** Presentation sequence position (1..X); 0 means unassigned. */
  order: number;
  board: string;
}

export interface Connection {
  id: string;
  fromCard: string;
  toCard: string;
  color: string;
  label: string;
  board: string;
}

/** A card that has not yet been persisted (no id, server fills defaults). */
export type NewCard = Omit<Card, "id">;

export type Visibility = "private" | "public";

export interface Board {
  id: string;
  name: string;
  owner: string;
  visibility: Visibility;
  created: string;
}

export interface BoardCollaborator {
  id: string;
  board: string;
  user: string;
  expand?: { user?: { id: string; email?: string; name?: string } };
}

/** The current viewer's relationship to the open board, driving read-only UI. */
export type BoardRole = "owner" | "collaborator" | "viewer";
