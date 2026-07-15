import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  useGetCoachResourceFiles,
  useGetResourceFileUploadUrl,
  useCreateResourceFile,
  useDeleteResourceFile,
  useGetClients,
} from "@workspace/api-client-react";
import { FileText, Upload, Trash2, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function ResourceFilesPanel() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: files, isLoading, refetch } = useGetCoachResourceFiles(undefined, {
    query: { queryKey: ["/api/coach/resource-files"] },
  });
  const { data: clients } = useGetClients({ query: { queryKey: ["/api/coach/clients"] } });

  const getUploadUrlMutation = useGetResourceFileUploadUrl();
  const createMutation = useCreateResourceFile();
  const deleteMutation = useDeleteResourceFile();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadAthleteId, setUploadAthleteId] = useState<string>("__all__");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function athleteLabel(athleteId: string | null): string {
    if (athleteId === null) return t("resource_files.all_athletes_option");
    const c = (clients ?? []).find((c) => c.id === athleteId);
    return c ? `${c.firstName} ${c.lastName}` : t("resource_files.unknown_athlete");
  }

  async function handleUpload() {
    if (!uploadFile || !uploadTitle.trim()) return;
    setUploading(true);
    try {
      const { uploadUrl, objectPath } = await getUploadUrlMutation.mutateAsync();

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: uploadFile,
      });
      if (!putRes.ok) throw new Error("upload failed");

      await createMutation.mutateAsync({
        data: {
          title: uploadTitle.trim(),
          objectPath,
          athleteId: uploadAthleteId === "__all__" ? null : uploadAthleteId,
        },
      });

      refetch();
      setUploadOpen(false);
      setUploadTitle("");
      setUploadAthleteId("__all__");
      setUploadFile(null);
      toast({ title: t("resource_files.toast_uploaded") });
    } catch {
      toast({ title: t("resource_files.toast_upload_error"), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync({ id });
      refetch();
      setDeleteId(null);
      toast({ title: t("resource_files.toast_deleted") });
    } catch {
      toast({ title: t("resource_files.toast_delete_error"), variant: "destructive" });
    }
  }

  const list = files ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("resource_files.desc")}</p>
        <Button onClick={() => setUploadOpen(true)} className="gap-2">
          <Upload className="w-4 h-4" />
          {t("resource_files.btn_add")}
        </Button>
      </div>

      {isLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
      {!isLoading && list.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground text-sm">{t("resource_files.empty")}</p>
        </div>
      )}
      <div className="space-y-3">
        {list.map((f) => (
          <Card key={f.id} className="bg-card border-border">
            <CardContent className="flex items-center justify-between p-4 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{f.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs font-mono flex items-center gap-1 ${f.athleteId === null ? "text-primary" : "text-muted-foreground"}`}>
                      {f.athleteId === null && <Users className="w-3 h-3" />}
                      {athleteLabel(f.athleteId)}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {format(new Date(f.uploadedAt), "d MMM yyyy", { locale: fr })}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive shrink-0"
                onClick={() => setDeleteId(f.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={uploadOpen} onOpenChange={(open) => { setUploadOpen(open); if (!open) { setUploadTitle(""); setUploadFile(null); setUploadAthleteId("__all__"); } }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white font-display">{t("resource_files.upload_dialog_title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm">{t("resource_files.title_label")}</Label>
              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder={t("resource_files.title_placeholder")}
                className="bg-background border-border text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm">{t("resource_files.share_with_label")}</Label>
              <Select value={uploadAthleteId} onValueChange={setUploadAthleteId}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="font-bold text-primary">
                    {t("resource_files.all_athletes_option")}
                  </SelectItem>
                  {(clients ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm">{t("resource_files.file_label")}</Label>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
              <Button
                variant="outline"
                className="w-full border-border text-muted-foreground hover:text-white gap-2 justify-start"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-4 h-4" />
                {uploadFile ? uploadFile.name : t("resource_files.choose_file")}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} className="border-border">
              {t("common.cancel", { defaultValue: "Annuler" })}
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !uploadTitle.trim() || !uploadFile}
              className="bg-primary text-black hover:bg-primary/90"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("resource_files.btn_send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-display">{t("resource_files.delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("resource_files.delete_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">{t("common.cancel", { defaultValue: "Annuler" })}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("common.delete", { defaultValue: "Supprimer" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
