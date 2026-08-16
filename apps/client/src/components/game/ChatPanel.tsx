import { useState, useRef, useEffect } from "react";

export interface ChatMessage {
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  message: string;
  timestamp: number;
  cardId?: string;
  cardImage?: string;
}

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  isHost?: boolean;
}

export interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  currentPhase?: string;
  onCardClick?: (cardId: string) => void;
  players?: Player[];
}

export function ChatPanel({
  messages,
  onSendMessage,
  disabled = false,
  currentPhase,
  onCardClick,
  players = [],
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const [modalImage, setModalImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !disabled) {
      onSendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h4>Chat</h4>
        {currentPhase && <span className="chat-phase">{currentPhase}</span>}
      </div>

      <div className="chat-players">
        <h5 className="chat-players-title">Players</h5>
        <div className="chat-players-list">
          {players.map((player) => (
            <div key={player.id} className="chat-player-item">
              <div className="chat-player-avatar">
                {player.avatar ? (
                  <img
                    src={player.avatar}
                    alt={player.name}
                    className="chat-player-avatar-img"
                  />
                ) : (
                  <div className="chat-player-avatar-placeholder">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="chat-player-name">{player.name}</span>
              {player.isHost && <span className="chat-host-badge">Host</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <p className="chat-empty">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg, index) => (
            <div key={`${msg.playerId}-${index}`} className="chat-message">
              <div className="chat-message-avatar">
                {msg.playerAvatar ? (
                  <img
                    src={msg.playerAvatar}
                    alt={msg.playerName}
                    className="chat-avatar-img"
                  />
                ) : (
                  <div className="chat-avatar-placeholder">
                    {msg.playerName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="chat-message-content">
                <div className="chat-message-header">
                  <span className="chat-message-name">{msg.playerName}</span>
                  <span className="chat-message-time">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                {msg.cardImage ? (
                  <>
                    <img
                      src={msg.cardImage}
                      alt="Information Card"
                      className="chat-card-thumbnail"
                      onClick={() => setModalImage(msg.cardImage || null)}
                    />
                    {modalImage && (
                      <div
                        className="chat-image-modal"
                        onClick={() => setModalImage(null)}
                      >
                        <div
                          className="chat-image-modal-content"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="chat-image-modal-close"
                            onClick={() => setModalImage(null)}
                          >
                            ✕
                          </button>
                          <img
                            src={modalImage}
                            alt="Full Card"
                            className="chat-card-full"
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="chat-message-text">{msg.message}</p>
                )}
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
          placeholder={disabled ? "Chat disabled" : "Type a message..."}
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
