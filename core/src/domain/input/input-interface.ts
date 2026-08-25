export type InputChannel = "cli" | (string & {});

export interface InputImageAttachment {
  type: "image";
  path: string;
  mediaType?: string;
}

export type InputAttachment = InputImageAttachment;

export interface InputMessage {
  id: string;
  channel: InputChannel;
  sessionId: string;
  userId?: string;
  text: string;
  attachments?: readonly InputAttachment[];
  createdAt: Date;
  metadata?: Readonly<Record<string, unknown>>;
}

export type InputListener = (
  message: InputMessage,
) => void | Promise<void>;

export interface InputInterface {
  readonly channel: InputChannel;
  start(listener: InputListener): Promise<void>;
  stop(): Promise<void>;
}
