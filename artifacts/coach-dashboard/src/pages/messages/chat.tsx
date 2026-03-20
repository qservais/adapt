import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useGetThreadMessages, useSendMessage, useGetClientDetail } from "@workspace/api-client-react";
import { Loader2, ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";

export default function ChatView() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  
  const { data: client, isLoading: clientLoading } = useGetClientDetail(id);
  const { data: messages, isLoading: msgLoading, refetch } = useGetThreadMessages(id, { query: { queryKey: [`/api/messages/${id}`], refetchInterval: 10000 }});
  const sendMutation = useSendMessage();
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    } catch (e) {
      setContent(txt);
    }
  };

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
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
          const showDate = i === 0 || new Date(messages[i-1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
          
          return (
            <div key={msg.id} className="flex flex-col">
              {showDate && (
                <div className="text-center text-xs font-mono text-muted-foreground my-4">
                  {format(new Date(msg.createdAt), 'd MMMM yyyy', { locale: fr })}
                </div>
              )}
              <div className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                  isMine 
                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                    : 'bg-muted text-foreground border border-border rounded-tl-sm'
                }`}>
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                  <div className={`text-[10px] mt-1 opacity-70 ${isMine ? 'text-right' : 'text-left'}`}>
                    {format(new Date(msg.createdAt), 'HH:mm')}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-card border-t border-border shrink-0">
        <form onSubmit={handleSend} className="flex gap-2">
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
