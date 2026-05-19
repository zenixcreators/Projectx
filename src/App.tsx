import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ChannelAnalysis from "./pages/ChannelAnalysis";
import ChannelReport from "./pages/ChannelReport";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route redirects to Channel Analysis dashboard */}
        <Route path="/" element={<Navigate to="/channel-analysis" replace />} />
        
        {/* Channel Analysis Routes */}
        <Route path="/channel-analysis" element={<ChannelAnalysis />} />
        <Route path="/channel-analysis/:channelId" element={<ChannelReport />} />
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/channel-analysis" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
