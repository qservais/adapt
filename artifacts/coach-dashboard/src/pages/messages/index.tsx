import { useGetMessageThreads } from "@workspace/api-client-react";
import { Loader2, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

export default function MessagesList() {
  const { data: threads, isLoading } = useGetMessageThreads({ query: { queryKey: ['/api/messages/threads'], refetchInterval: 10000 }});

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display text-white flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-primary" /> MESSAGES
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Direct communication with athletes.</p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden divide-y divide-border/50">
        {threads?.map(thread => (
          <Link key={thread.userId} href={`/messages/${thread.userId}`}>
            <div className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors cursor-pointer group">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center text-lg font-display text-white group-hover:border-primary/50 transition-colors">
                  {thread.userFirstName[0]}{thread.userLastName?.[0]}
                </div>
                {thread.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-background font-bold text-xs rounded-full flex items-center justify-center">
                    {thread.unreadCount}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-semibold text-white truncate">{thread.userFirstName} {thread.userLastName}</h3>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2 font-mono">
                    {thread.lastMessageAt ? formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true }) : ''}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate pr-4">
                  {thread.lastMessage || "No messages yet"}
                </p>
              </div>
            </div>
          </Link>
        ))}

        {threads?.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            No active conversations.
          </div>
        )}
      </div>
    </div>
  );
}
