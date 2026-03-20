import { useMutation } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";

interface AthleteLinkRequest {
  inviteCode: string;
}

interface AthleteLinkResponse {
  success: boolean;
  message: string;
}

async function athleteLink(data: AthleteLinkRequest): Promise<AthleteLinkResponse> {
  return customFetch<AthleteLinkResponse>("/api/athlete/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function useAthleteLink() {
  return useMutation({
    mutationFn: athleteLink,
  });
}
