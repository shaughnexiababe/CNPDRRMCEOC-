import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Smile, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cnpdrrmceoc } from '@/lib/cnpdrrmceoc';
import { cn } from '@/lib/utils';

const SYSTEM_INSTRUCTION = `
    You are "Boy Kalasag", the AI defender and superhero wingman for the CNPDRRMEOC app.
    Your mission is to protect the citizens of Camarines Norte by providing weather updates, disaster protocols, and emergency contacts.
    "Kalasag" means shield, so act as their shield against disasters.
    Be brave, brief, use Bicolano-friendly Tagalog, and always prioritize safety.

    If the user says "SOS" or is in immediate danger, you MUST include the keyword "[TRIGGER_SOS]" in your response.
    If the user wants to see the map, include "[NAVIGATE_MAP]".
`;

export default function BoyKalasagChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Dios Marhay na aldaw! I am Boy Kalasag, your PDRRMO AI defender. How can I help you today?", isUser: false }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

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
      const activeIncidents = await cnpdrrmceoc.entities.IncidentReport.list('-created_date', 5).catch(() => []);
      const context = activeIncidents.length > 0
        ? `There are ${activeIncidents.length} recent incidents in the province.`
        : "No recent incidents reported.";

      const prompt = `
        ${SYSTEM_INSTRUCTION}
        Current Context: ${context}
        User says: ${userText}
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      const botText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Pasensya na, may problema sa pagsagot ko ngayon.";

      setMessages(prev => [...prev, { text: botText, isUser: false }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { text: "Maugma! May sadit na problema sa signal ko.", isUser: false }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      {isOpen ? (
        <Card className="w-[350px] md:w-96 h-[500px] flex flex-col shadow-2xl border-2 border-red-600 overflow-hidden bg-white animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="bg-red-600 p-3 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-white rounded-full p-1">
                <Smile className="w-4 h-4 text-red-600" />
              </div>
              <span className="font-bold tracking-tight">Boy Kalasag AI</span>
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
                    Nagiisip si Boy Kalasag...
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

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
            <Shield className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 border-2 border-white rounded-full animate-bounce" />
          </div>
        </Button>
      )}
    </div>
  );
}
