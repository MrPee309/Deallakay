import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Store, LogOut, ShieldCheck, User as UserIcon, Camera, Loader2, ShieldOff } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { compressImage } from "@/lib/format";
import { SellerBadges } from "@/components/Badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Profile() {
  const { user, logout, fetchMe } = useAuth();
  const nav = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  if (!user) return null;

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Nouvo modpas yo pa menm jan.");
      return;
    }
    setChangingPassword(true);
    try {
      await api.put("/auth/me/change-password", { current_password: currentPassword, new_password: newPassword });
      toast.success("Modpas ou chanje! Konekte ankò ak nouvo modpas la.");
      // token_version bumped server-side invalidates this session's own
      // token too — same security behavior as the existing reset-password
      // flow — so redirecting to login is the correct next step, not a bug.
      logout();
      nav("/login");
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setChangingPassword(false);
    }
  };

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
        <Button onClick={() => nav("/become-business")} variant="outline" className="w-full h-11 font-semibold" data-testid="profile-become-business">Anrejistre Biznis Lokal</Button>
        {user.role === "admin" && <Button variant="outline" onClick={() => nav("/admin")} className="w-full h-11" data-testid="profile-admin"><ShieldCheck className="w-4 h-4 mr-2" />Admin Panel</Button>}
        {/* New — previously the only password-reset path was
            /forgot-password, meant for someone who can't log in at all;
            there was no way to change it while already signed in. */}
        {!showPasswordForm ? (
          <Button variant="outline" onClick={() => setShowPasswordForm(true)} className="w-full h-11" data-testid="profile-show-change-password">Chanje Modpas</Button>
        ) : (
          <div className="border rounded-xl p-4 space-y-3">
            <Input type="password" placeholder="Ansyen modpas" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} data-testid="change-password-current" />
            <Input type="password" placeholder="Nouvo modpas (8+ karaktè)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} data-testid="change-password-new" />
            <Input type="password" placeholder="Konfime nouvo modpas" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} data-testid="change-password-confirm" />
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => { setShowPasswordForm(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}>Anile</Button>
              <Button
                className="flex-1"
                disabled={changingPassword || !currentPassword || newPassword.length < 8}
                onClick={changePassword}
                data-testid="change-password-submit"
              >
                {changingPassword ? "N ap chanje..." : "Konfime"}
              </Button>
            </div>
          </div>
        )}
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
