import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useGetThreadMessages, useSendMessage, useGetClientDetail } from "@workspace/api-client-react";
import { Loader2, ArrowLeft, Send, Paperclip, FileText, Grid, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
import type { MessageData } from "@workspace/api-client-react";

const ACCEPTED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/heic",
].join(",");

const MAX_DOC_SIZE = 10 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  return `${Math.round(bytes / 1024)} Ko`;
}

function getDocIcon(fileName?: string | null) {
  if (!fileName) return <Paperclip className="w-5 h-5" />;
  if (fileName.endsWith(".pdf")) return <FileText className="w-5 h-5" />;
  if (fileName.match(/\.(xls|xlsx)$/)) return <Grid className="w-5 h-5" />;
  if (fileName.match(/\.(doc|docx)$/)) return <FileText className="w-5 h-5" />;
  return <Paperclip className="w-5 h-5" />;
}

function DocumentBubble({ msg, isMine }: { msg: MessageData; isMine: boolean }) {
  return (
    <a
      href={msg.mediaUrl ?? "#"}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline min-w-[180px] max-w-[280px] ${
        isMine ? "text-primary-foreground" : "text-foreground"
      }`}
      style={{ display: "flex" }}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
        isMine ? "bg-white/20" : "bg-primary/20"
      }`}>
        <span className={isMine ? "text-primary-foreground" : "text-primary"}>
          {getDocIcon(msg.fileName)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate leading-tight">{msg.fileName ?? "Document"}</div>
        {msg.fileSize && (
          <div className="text-[10px] opacity-60 mt-0.5 font-mono">{msg.fileSize}</div>
        )}
      </div>
      <Download className="w-4 h-4 opacity-50 shrink-0" />
    </a>
  );
}

export default function ChatView() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [documentUploading, setDocumentUploading] = useState(false);
  const [docUploadProgress, setDocUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: client, isLoading: clientLoading } = useGetClientDetail(id);
  const { data: messages, isLoading: msgLoading, refetch } = useGetThreadMessages(id, { query: { queryKey: [`/api/messages/${id}`], refetchInterval: 10000 }});
  const sendMutation = useSendMessage();

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (clientLoading || msgLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;
    const txt = content;
    setContent("");
    try {
      await sendMutation.mutateAsync({ data: { recipientId: id, content: txt } });
      refetch();
    } catch {
      setContent(txt);
    }
  };

  const handleDocumentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_DOC_SIZE) {
      alert("Fichier trop lourd. La taille maximale est de 10 Mo.");
      e.target.value = "";
      return;
    }

    if (!ACCEPTED_MIME.split(",").includes(file.type)) {
      alert("Format non supporté. Formats acceptés : PDF, Word, Excel, images.");
      e.target.value = "";
      return;
    }

    setDocumentUploading(true);
    setDocUploadProgress(0);
    try {
      const token = localStorage.getItem("adapt_coach_access");
      const uploadRes = await fetch("/api/messages/upload-document", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mimeType: file.type, fileSize: file.size, fileName: file.name }),
      });
      if (!uploadRes.ok) {
        const errBody = await uploadRes.json().catch(() => ({})) as { error?: { message?: string } };
        alert(errBody?.error?.message ?? "Format ou taille non supportés");
        return;
      }
      const { uploadUrl } = await uploadRes.json() as { uploadUrl: string };

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setDocUploadProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload PUT failed")));
        xhr.onerror = () => reject(new Error("XHR error"));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      const rawUrl = (() => { const u = new URL(uploadUrl); return u.origin + u.pathname; })();
      const fileSizeStr = formatBytes(file.size);

      await sendMutation.mutateAsync({
        data: {
          recipientId: id,
          content: "",
          mediaType: "document",
          mediaUrl: rawUrl,
          fileName: file.name,
          fileSize: fileSizeStr,
        },
      });
      refetch();
    } catch {
      alert("Impossible d'envoyer le document. Réessaie.");
    } finally {
      setDocumentUploading(false);
      setDocUploadProgress(0);
      e.target.value = "";
    }
  };

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-7.5rem)] sm:h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] flex flex-col bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <div className="h-16 border-b border-border bg-background/50 flex items-center px-4 gap-4 shrink-0">
        <Link href="/messages" className="text-muted-foreground hover:text-white p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center font-display text-white">
            {client?.firstName[0]}{client?.lastName?.[0]}
          </div>
          <div>
            <div className="font-semibold text-white">{client?.firstName} {client?.lastName}</div>
            <div className="text-xs text-muted-foreground">Athlète</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/30">
        {messages?.map((msg, i) => {
          const isMine = msg.senderId === user?.id;
          const showDate = i === 0 || new Date((messages as MessageData[])[i-1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();

          return (
            <div key={msg.id} className="flex flex-col">
              {showDate && (
                <div className="text-center text-xs font-mono text-muted-foreground my-4">
                  {format(new Date(msg.createdAt), "d MMMM yyyy", { locale: fr })}
                </div>
              )}
              <div className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl overflow-hidden ${
                  isMine
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted text-foreground border border-border rounded-tl-sm"
                }`}>
                  {msg.mediaType === "document" ? (
                    <DocumentBubble msg={msg} isMine={isMine} />
                  ) : (
                    <div className="px-4 py-2.5">
                      {msg.mediaType === "audio" ? (
                        <div className="flex items-center gap-2 text-sm opacity-80">
                          🎤 <span>Message vocal</span>
                        </div>
                      ) : msg.mediaType === "video" ? (
                        <div className="flex items-center gap-2 text-sm opacity-80">
                          🎬 <span>Vidéo</span>
                        </div>
                      ) : (
                        <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                      )}
                    </div>
                  )}
                  <div className={`text-[10px] px-3 pb-1.5 opacity-70 ${isMine ? "text-right" : "text-left"}`}>
                    {format(new Date(msg.createdAt), "HH:mm")}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-card border-t border-border shrink-0 space-y-2">
        {documentUploading && (
          <div className="flex flex-col gap-1 px-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              <span>
                {docUploadProgress > 0 && docUploadProgress < 100
                  ? `Envoi du document… ${docUploadProgress}%`
                  : "Envoi du document…"}
              </span>
            </div>
            {docUploadProgress > 0 && docUploadProgress < 100 && (
              <div className="h-1 bg-border rounded-full overflow-hidden mx-6">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-150"
                  style={{ width: `${docUploadProgress}%` }}
                />
              </div>
            )}
          </div>
        )}
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_MIME}
            className="hidden"
            onChange={handleDocumentSelect}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-12 w-12 rounded-full shrink-0 text-muted-foreground hover:text-white"
            disabled={documentUploading}
            onClick={() => fileInputRef.current?.click()}
            title="Joindre un document (PDF, Word, Excel, image — max 10 Mo)"
          >
            {documentUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
          </Button>
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Écrire un message..."
            className="flex-1 bg-background border-border h-12 rounded-full px-6"
          />
          <Button
            type="submit"
            size="icon"
            className="h-12 w-12 rounded-full shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={!content.trim() || sendMutation.isPending}
          >
            {sendMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 -ml-1" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
