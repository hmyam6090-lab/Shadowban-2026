import { useState, useRef, useEffect } from 'react';

export interface ChatMessage {
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  message: string;
  timestamp: number;
}

export interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  currentPhase?: string;
}

export function ChatPanel({ messages, onSendMessage, disabled = false, currentPhase }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !disabled) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h4>Chat</h4>
        {currentPhase && <span className="chat-phase">{currentPhase}</span>}
      </div>
      
      <div className="chat-messages">
        {messages.length === 0 ? (
          <p className="chat-empty">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg, index) => (
            <div key={`${msg.playerId}-${index}`} className="chat-message">
              <div className="chat-message-avatar">
                {msg.playerAvatar ? (
                  <img src={msg.playerAvatar} alt={msg.playerName} className="chat-avatar-img" />
                ) : (
                  <div className="chat-avatar-placeholder">
                    {msg.playerName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="chat-message-content">
                <div className="chat-message-header">
                  <span className="chat-message-name">{msg.playerName}</span>
                  <span className="chat-message-time">{formatTime(msg.timestamp)}</span>
                </div>
                <p className="chat-message-text">{msg.message}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={disabled ? 'Chat disabled' : 'Type a message...'}
          disabled={disabled}
          maxLength={200}
          className="chat-input"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || disabled}
          className="chat-send-btn"
        >
          Send
        </button>
      </form>
    </div>
  );
}
