import React from "react";
import { useNavigate } from "react-router-dom";
import BecomeTechnician from "@/components/BecomeTechnician";

export default function BecomeTechnicianPage() {
  const nav = useNavigate();
  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <BecomeTechnician onDone={() => nav("/technician-dashboard")} />
    </div>
  );
}
