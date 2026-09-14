import React from "react";
import { useNavigate } from "react-router-dom";
import BecomeBusiness from "@/components/BecomeBusiness";

export default function BecomeBusinessPage() {
  const nav = useNavigate();
  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <BecomeBusiness onDone={() => nav("/")} />
    </div>
  );
}
