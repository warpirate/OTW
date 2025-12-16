import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AssistantService } from '../../services/assistant.service';

const CustomerAssistantWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m the OMW assistant. I can answer questions about OMW only. How can I help?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  const renderInline = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      const match = part.match(/^\*\*([^*]+)\*\*$/);
      if (match) {
        return <strong key={idx}>{match[1]}</strong>;
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  const renderAssistantContent = (text) => {
    if (!text) return null;

    const blocks = text.split(/\n{2,}/).filter((b) => b.trim() !== '');

    return blocks.map((block, blockIndex) => {
      const lines = block.split('\n').filter((l) => l.trim() !== '');

      const headingMatch = lines[0]?.match(/^#{1,6}\s+(.*)$/);
      const remaining = headingMatch ? lines.slice(1) : lines;

      // Bullet list (- or *)
      if (remaining.length > 0 && remaining.every((l) => /^\s*[-*]\s+/.test(l))) {
        return (
          <ul key={blockIndex} className="list-disc list-inside space-y-1 mb-1">
            {headingMatch && (
              <li className="font-semibold list-none">{renderInline(headingMatch[1])}</li>
            )}
            {remaining.map((line, liIndex) => (
              <li key={liIndex}>{renderInline(line.replace(/^\s*[-*]\s+/, ''))}</li>
            ))}
          </ul>
        );
      }

      // Numbered list (1. or 1)
      if (remaining.length > 0 && remaining.every((l) => /^\s*\d+[\.)]\s+/.test(l))) {
        return (
          <ol key={blockIndex} className="list-decimal list-inside space-y-1 mb-1">
            {headingMatch && (
              <li className="font-semibold list-none">{renderInline(headingMatch[1])}</li>
            )}
            {remaining.map((line, liIndex) => (
              <li key={liIndex}>{renderInline(line.replace(/^\s*\d+[\.)]\s+/, ''))}</li>
            ))}
          </ol>
        );
      }

      // Heading alone
      if (headingMatch && remaining.length === 0) {
        return (
          <div key={blockIndex} className="font-semibold mb-1">
            {renderInline(headingMatch[1])}
          </div>
        );
      }

      // Default paragraph (preserve heading text if present)
      return (
        <p key={blockIndex} className="mb-1">
          {renderInline(block)}
        </p>
      );
    });
  };

  const send = async () => {
    if (!canSend) return;
    const userMsg = { role: 'user', content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await AssistantService.chat(next);
      const answer = (res?.answer || '').trim();
      const assistantMsg = { role: 'assistant', content: answer || "I don't know based on the available OMW documentation." };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I had trouble responding just now.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[999]">
      {!open && (
        <button
          className="btn-icon rounded-full"
          onClick={() => setOpen(true)}
          aria-label="Open OMW Assistant"
        >
          Chat
        </button>
      )}

      {open && (
        <div className="w-[320px] sm:w-[380px] h-[480px] assistant-widget">
          <div className="assistant-header">
            <div className="font-semibold">OMW Assistant</div>
            <button
              className="btn-ghost"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`${m.role === 'user' ? 'bg-purple-600 text-white px-3 py-2' : 'assistant-bubble'} rounded-lg max-w-[80%] whitespace-pre-wrap`}>
                  {m.role === 'assistant' ? renderAssistantContent(m.content) : m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="assistant-bubble">Thinking…</div>
              </div>
            )}
          </div>
          <div className="assistant-footer p-3 flex gap-2">
            <input
              className="assistant-input"
              placeholder="Ask about OMW…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send();
              }}
            />
            <button
              onClick={send}
              disabled={!canSend}
              className={`px-3 py-2 rounded-md ${canSend ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerAssistantWidget;
