import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Store, LogOut, ShieldCheck, User as UserIcon, Camera, Loader2, ShieldOff } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { compressImage } from "@/lib/format";
import { SellerBadges } from "@/components/Badges";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const { user, logout, fetchMe } = useAuth();
  const nav = useNavigate();
  const [uploading, setUploading] = useState(false);

  if (!user) return null;

  const changeAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const b64 = await compressImage(file, 400, 0.8);
      if (user.is_seller) await api.put("/seller/settings", { avatar: b64 });
      else { toast.info("Vin vandè pou mete foto pwofil."); setUploading(false); return; }
      await fetchMe();
      toast.success("Foto mete ajou!");
    } catch (e) { toast.error(apiError(e)); } finally { setUploading(false); }
  };

  const logoutAll = async () => {
    try { await api.post("/auth/logout-all"); logout(); toast.success("Tout sesyon fèmen."); nav("/login"); } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="bg-card border border-border rounded-2xl p-6 text-center">
        <div className="relative w-24 h-24 mx-auto">
          <div className="w-24 h-24 rounded-full bg-primary text-white flex items-center justify-center text-3xl font-bold overflow-hidden">
            {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : user.username[0]?.toUpperCase()}
          </div>
          <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-secondary text-black flex items-center justify-center cursor-pointer shadow" data-testid="avatar-upload">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            <input type="file" accept="image/*" className="hidden" onChange={changeAvatar} />
          </label>
        </div>
        <h1 className="font-display text-xl font-bold mt-3">{user.full_name}</h1>
        <p className="text-sm text-muted-foreground">@{user.username}</p>
        <p className="text-sm text-muted-foreground">{user.city}, {user.department}</p>
        <div className="flex justify-center mt-3"><SellerBadges seller={{ ...user, seller_verified: false }} /></div>
      </div>

      <div className="mt-4 bg-card border border-border rounded-2xl divide-y divide-border">
        <Row label="Email" value={user.email} />
        <Row label="Telefòn" value={user.phone} />
        <Row label="Wòl" value={user.role === "admin" ? "Administratè" : user.is_seller ? "Vandè" : "Achtè"} />
      </div>

      <div className="mt-4 space-y-2">
        {!user.is_seller ? (
          <Button onClick={() => nav("/sell")} className="w-full h-11 bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold" data-testid="profile-become-seller"><Store className="w-4 h-4 mr-2" />Devni yon Vandè</Button>
        ) : (
          <Button onClick={() => nav("/dashboard")} className="w-full h-11 bg-primary font-semibold" data-testid="profile-dashboard"><ShieldCheck className="w-4 h-4 mr-2" />Tablo Vandè</Button>
        )}
        {user.is_seller && <Button variant="outline" onClick={() => nav(`/seller/${user.username}`)} className="w-full h-11" data-testid="profile-public"><UserIcon className="w-4 h-4 mr-2" />Wè pwofil piblik mwen</Button>}
        {!user.is_technician ? (
          <Button onClick={() => nav("/become-technician")} variant="outline" className="w-full h-11 font-semibold" data-testid="profile-become-technician">Devni yon Teknisyen</Button>
        ) : (
          <Button onClick={() => nav("/technician-dashboard")} variant="outline" className="w-full h-11 font-semibold" data-testid="profile-tech-dashboard">Tablo Teknisyen</Button>
        )}
        {user.role === "admin" && <Button variant="outline" onClick={() => nav("/admin")} className="w-full h-11" data-testid="profile-admin"><ShieldCheck className="w-4 h-4 mr-2" />Admin Panel</Button>}
        <Button variant="outline" onClick={logoutAll} className="w-full h-11" data-testid="logout-all-btn"><ShieldOff className="w-4 h-4 mr-2" />Dekonekte tout sesyon</Button>
        <Button variant="ghost" onClick={() => { logout(); nav("/"); }} className="w-full h-11 text-destructive" data-testid="profile-logout"><LogOut className="w-4 h-4 mr-2" />Dekonekte</Button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
