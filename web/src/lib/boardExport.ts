import { boardsApi, cardsApi, connectionsApi, fileUrl, pb, recordToCard, recordToConnection } from "./pocketbase";
import type { Card, Connection, Visibility } from "../types";

interface ExportedFile {
  filename: string;
  dataUrl: string;
}

type ExportedCard = Omit<Card, "board" | "image" | "attachment"> & {
  image: ExportedFile | null;
  attachment: ExportedFile | null;
};

type ExportedConnection = Omit<Connection, "id" | "board">;

interface BoardExport {
  version: 1;
  board: { name: string; visibility: Visibility };
  cards: ExportedCard[];
  connections: ExportedConnection[];
}

async function fileToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = /data:(.*);base64/.exec(header)?.[1] ?? "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

/** Downloads the given board (metadata, cards, connections, and embedded files) as a JSON file. */
export async function exportBoard(boardId: string): Promise<void> {
  const boardRecord = await boardsApi.getOne(boardId);
  const filter = pb.filter("board = {:board}", { board: boardId });
  const [cardRecords, connRecords] = await Promise.all([
    cardsApi.getFullList({ filter }),
    connectionsApi.getFullList({ filter }),
  ]);

  const cards: ExportedCard[] = await Promise.all(
    cardRecords.map(async (r) => {
      const card = recordToCard(r);
      const { image, attachment, ...rest } = card;
      return {
        ...rest,
        image: image ? { filename: image, dataUrl: await fileToDataUrl(fileUrl(card.id, image)) } : null,
        attachment: attachment
          ? { filename: attachment, dataUrl: await fileToDataUrl(fileUrl(card.id, attachment)) }
          : null,
      };
    }),
  );

  const connections: ExportedConnection[] = connRecords.map((r) => {
    const { id: _id, board: _board, ...rest } = recordToConnection(r);
    return rest;
  });

  const data: BoardExport = {
    version: 1,
    board: { name: boardRecord.name, visibility: boardRecord.visibility },
    cards,
    connections,
  };

  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${boardRecord.name.replace(/[^\w-]+/g, "_") || "board"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Creates a new board owned by `ownerId` from a previously exported JSON file. Returns the new board id. */
export async function importBoard(file: File, ownerId: string): Promise<string> {
  const text = await file.text();
  let data: BoardExport;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (data.version !== 1 || !data.board || !Array.isArray(data.cards)) {
    throw new Error("Unrecognized board export format.");
  }

  const board = await boardsApi.create({
    name: data.board.name,
    owner: ownerId,
    visibility: data.board.visibility === "public" ? "public" : "private",
  });

  const idMap = new Map<string, string>();
  for (const c of data.cards) {
    const form = new FormData();
    form.append("type", c.type);
    form.append("title", c.title);
    form.append("body", c.body);
    form.append("url", c.url);
    form.append("x", String(c.x));
    form.append("y", String(c.y));
    form.append("width", String(c.width));
    form.append("height", String(c.height));
    form.append("rotation", String(c.rotation));
    form.append("color", c.color);
    form.append("z", String(c.z));
    form.append("order", String(c.order));
    form.append("board", board.id);
    if (c.image) form.append("image", dataUrlToFile(c.image.dataUrl, c.image.filename));
    if (c.attachment) form.append("attachment", dataUrlToFile(c.attachment.dataUrl, c.attachment.filename));
    const created = await cardsApi.create(form);
    idMap.set(c.id, created.id);
  }

  for (const conn of data.connections) {
    const fromCard = idMap.get(conn.fromCard);
    const toCard = idMap.get(conn.toCard);
    if (!fromCard || !toCard) continue;
    await connectionsApi.create({
      fromCard,
      toCard,
      color: conn.color,
      label: conn.label,
      board: board.id,
    });
  }

  return board.id;
}
