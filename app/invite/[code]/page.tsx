"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "already">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function handleInvite() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/auth?redirect=/invite/${code}`); return; }

      const { data: invite } = await supabase
        .from("friend_invites")
        .select("*")
        .eq("code", code)
        .single();

      if (!invite) { setStatus("error"); setMessage("Invite link not found or expired."); return; }
      if (invite.inviter_id === user.id) { setStatus("error"); setMessage("That's your own invite link!"); return; }
      if (invite.used_by) { setStatus("already"); setMessage("This invite has already been used."); return; }

      // Check if friendship already exists
      const { data: existing } = await supabase
        .from("friendships")
        .select("id")
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${invite.inviter_id}),and(requester_id.eq.${invite.inviter_id},addressee_id.eq.${user.id})`)
        .single();

      if (existing) { setStatus("already"); setMessage("You're already friends with this person!"); return; }

      // Send friend request
      const { error } = await supabase.from("friendships").insert({
        id: Math.random().toString(36).slice(2),
        requester_id: user.id,
        addressee_id: invite.inviter_id,
        status: "pending",
      });

      if (error) { setStatus("error"); setMessage("Something went wrong. Try again."); return; }

      // Mark invite used
      await supabase.from("friend_invites").update({ used_by: user.id, used_at: new Date().toISOString() }).eq("code", code);

      setStatus("success");
      setMessage("Friend request sent!");
      setTimeout(() => router.push("/friends"), 2000);
    }
    handleInvite();
  }, [code]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f8fc", padding: "24px" }}>
      <div style={{ background: "white", borderRadius: "24px", padding: "40px 32px", textAlign: "center", maxWidth: "320px", width: "100%", boxShadow: "0 2px 24px rgba(0,0,0,0.08)" }}>
        {status === "loading" && <p style={{ fontSize: "32px" }}>⏳</p>}
        {status === "success" && <p style={{ fontSize: "32px" }}>🎉</p>}
        {status === "error" && <p style={{ fontSize: "32px" }}>❌</p>}
        {status === "already" && <p style={{ fontSize: "32px" }}>✅</p>}
        <p style={{ fontSize: "18px", fontWeight: 700, color: "#111118", marginTop: "16px" }}>
          {status === "loading" ? "Processing invite..." : message}
        </p>
        {status === "success" && <p style={{ fontSize: "13px", color: "#9ca3af", marginTop: "8px" }}>Redirecting to Friends...</p>}
        {(status === "error" || status === "already") && (
          <button onClick={() => router.push("/friends")} style={{ marginTop: "20px", padding: "12px 24px", borderRadius: "14px", background: "#111118", color: "white", border: "none", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
            Go to Friends
          </button>
        )}
      </div>
    </div>
  );
}
