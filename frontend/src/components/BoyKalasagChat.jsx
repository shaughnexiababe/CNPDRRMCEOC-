import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Smile, Shield, Siren } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cnpdrrmceoc } from '@/lib/cnpdrrmceoc';
import { useAuth } from '@/lib/AuthContext';
import { apiPost, notifyBestEffort } from '@/lib/api';
import { GeoPoint } from 'firebase/firestore';
import { cn } from '@/lib/utils';

const SYSTEM_INSTRUCTION = `
    You are "Super Batang Kalasag", the AI defender and superhero wingman for the CNPDRRMEOC app.
    Your mission is to protect the citizens of Camarines Norte by providing weather updates, disaster protocols, and emergency contacts.

    PREDICTIVE CAPABILITIES:
    You are aware of current weather thresholds for Camarines Norte:
    - 100mm of rain in 24h is CRITICAL for Labo and Daet river basins.
    - Wind speeds over 120kph trigger Signal No. 3 protocols.
    - You monitor DOST PhilSensors (Daet Bridge, Labo Bridge, JP Station).

    Be brave, brief, use Bicolano-friendly Tagalog, and always prioritize safety.
    If the user asks "What happens if...", use your predictive knowledge to explain the risks.

    If the user says "SOS" or is in immediate danger, you MUST include the keyword "[TRIGGER_SOS]" in your response.
    If the user wants to see the map, include "[NAVIGATE_MAP]".
`;

export default function BoyKalasagChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Dios Marhay na aldaw! I am Super Batang Kalasag, your PDRRMO AI defender. How can I help you today?", isUser: false }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingSOS, setPendingSOS] = useState(false);
  const [sosSending, setSosSending] = useState(false);
  const scrollRef = useRef(null);
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userText = inputText;
    setInputText("");
    setMessages(prev => [...prev, { text: userText, isUser: true }]);
    setIsLoading(true);

    try {
      // Get context from SDK
      const activeIncidents = await cnpdrrmceoc.entities.Incident.list('-created_at', 5).catch(() => []);
      const context = activeIncidents.length > 0
        ? `There are ${activeIncidents.length} recent incidents in the province.`
        : "No recent incidents reported.";

      // Free-route: the server-side gateway holds the Gemini key. Fall back
      // to a direct call only when a dev key is configured locally
      // (VITE_GEMINI_API_KEY) so local `vite dev` keeps working without
      // `vercel dev`.
      let botText;
      try {
        const gateway = await apiPost('/api/ask-bantay', { message: userText, context });
        botText = gateway.text;
      } catch (gatewayErr) {
        console.warn('AI gateway unavailable, falling back to local key:', gatewayErr);
        if (!apiKey) throw gatewayErr;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${SYSTEM_INSTRUCTION}\nCurrent Context: ${context}\nUser says: ${userText}` }] }]
          })
        });
        const data = await response.json();
        botText = data.candidates?.[0]?.content?.parts?.[0]?.text
          || "Pasensya na, may problema sa pagsagot ko ngayon.";
      }

      // The SOS keyword surfaces a confirmation instead of auto-firing
      // an incident (web safety-bar pattern; Android prompt F-02 mirrors this).
      if (botText.includes("[TRIGGER_SOS]")) {
        setPendingSOS(true);
      }

      setMessages(prev => [...prev, { text: botText, isUser: false }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { text: "Maugma! May sadit na problema sa signal ko.", isUser: false }]);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmSOS = async () => {
    setSosSending(true);
    try {
      let latitude, longitude;
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation
            ? navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
            : rej(new Error('no-geolocation'))
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch { /* location optional */ }

      const created = await cnpdrrmceoc.entities.Incident.create({
        title: "SOS EMERGENCY SIGNAL",
        description: "User requested emergency assistance via Super Batang Kalasag chatbot.",
        type: "sos",
        priority: "critical",
        status: "reported",
        municipality: user?.municipality || "Unknown",
        barangay: user?.barangay || "",
        latitude,
        longitude,
        location: latitude != null && longitude != null ? new GeoPoint(latitude, longitude) : undefined,
        reported_by_id: user?.id || undefined,
      });
      // Push to EOC staff devices (free-route API; replaces the Firestore trigger)
      if (created?.id) notifyBestEffort('/api/notify-critical-incident', { incidentId: created.id });
      setMessages(prev => [...prev, { text: "SOS SENT. The EOC has been notified of your emergency. Stay where you are if it is safe. Hotline: (054) 440-1234 / 911.", isUser: false }]);
    } catch (e) {
      console.error('SOS failed:', e);
      setMessages(prev => [...prev, { text: "Failed to send SOS. Please call 911 or (054) 440-1234 immediately.", isUser: false }]);
    } finally {
      setSosSending(false);
      setPendingSOS(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      {isOpen ? (
        <Card className="w-[350px] md:w-96 h-[500px] flex flex-col shadow-2xl border-2 border-red-600 overflow-hidden bg-white animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="bg-red-600 p-3 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-white rounded-full p-1 w-8 h-8 flex items-center justify-center overflow-hidden">
                <img src="/sbk_icon.png" alt="SBK" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold tracking-tight">Super Batang Kalasag</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-red-700" onClick={() => setIsOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-4 bg-slate-50">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.isUser ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] p-3 rounded-2xl text-sm shadow-sm",
                    msg.isUser
                      ? "bg-orange-500 text-white rounded-tr-none"
                      : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                  )}>
                    {msg.text.replace("[TRIGGER_SOS]", "").replace("[NAVIGATE_MAP]", "").trim()}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-2xl text-sm border border-slate-200 rounded-tl-none animate-pulse">
                    Nagiisip si Super Batang Kalasag...
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* SOS confirmation bar */}
          {pendingSOS && (
            <div className="p-3 bg-red-50 border-t-2 border-red-600 flex items-center gap-2">
              <Siren className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-xs text-red-700 flex-1 font-medium">
                Super Batang Kalasag detected an emergency. Send an SOS report to the EOC with your location?
              </p>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white h-8 px-3 text-xs"
                onClick={confirmSOS}
                disabled={sosSending}
              >
                {sosSending ? 'Sending...' : 'SEND SOS'}
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setPendingSOS(false)}>
                Cancel
              </Button>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 border-t bg-white flex gap-2">
            <Input
              placeholder="Ask about hazards..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1 rounded-full h-10"
              disabled={isLoading}
            />
            <Button
              size="icon"
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-full h-10 w-10 shrink-0"
              onClick={sendMessage}
              disabled={isLoading || !inputText.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ) : (
        <Button
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 shadow-xl flex items-center justify-center p-0 overflow-hidden group"
          onClick={() => setIsOpen(true)}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <img src="/sbk_icon.png" alt="SBK" className="w-10 h-10 group-hover:scale-110 transition-transform" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 border-2 border-white rounded-full animate-bounce" />
          </div>
        </Button>
      )}
    </div>
  );
}
