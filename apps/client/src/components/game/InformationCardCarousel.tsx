import { useState, useEffect } from "react";
import type { InformationCard as InformationCardType } from "@shadowban/shared";
import { InformationCard } from "./InformationCard.js";

export interface InformationCardCarouselProps {
  cards: InformationCardType[];
  onPresent?: (cardId: string) => void;
  showPresentButton?: boolean;
  disabled?: boolean;
  presentedCardIds?: string[];
  maxPresented?: number;
  lockedCardIds?: string[];
}

export function InformationCardCarousel({
  cards,
  onPresent,
  showPresentButton = false,
  disabled = false,
  presentedCardIds = [],
  maxPresented = 2,
  lockedCardIds = [],
}: InformationCardCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);

  const currentCard = cards[currentIndex];
  const hasNext = currentIndex < cards.length - 1;
  const hasPrev = currentIndex > 0;
  const isPresented = currentCard && presentedCardIds.includes(currentCard.id);
  const isLocked = currentCard && lockedCardIds?.includes(currentCard.id);
  const canPresent =
    !disabled &&
    !isPresented &&
    !isLocked &&
    presentedCardIds.length < maxPresented;

  const handleNext = () => {
    if (hasNext) {
      setDirection("right");
      setTimeout(() => setDirection(null), 300);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (hasPrev) {
      setDirection("left");
      setTimeout(() => setDirection(null), 300);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handlePresent = () => {
    if (currentCard && onPresent && canPresent) {
      onPresent(currentCard.id);
    }
  };

  if (!cards || cards.length === 0) {
    return (
      <div className="card-carousel empty">
        <p className="empty-message">No cards available</p>
      </div>
    );
  }

  return (
    <div className="card-carousel">
      <div className="carousel-header">
        <span className="carousel-counter">
          {currentIndex + 1} / {cards.length}
        </span>
        <div className="carousel-nav">
          <button
            className="carousel-nav-btn"
            onClick={handlePrev}
            disabled={!hasPrev || disabled}
          >
            ←
          </button>
          <button
            className="carousel-nav-btn"
            onClick={handleNext}
            disabled={!hasNext || disabled}
          >
            →
          </button>
        </div>
      </div>

      <div className={`carousel-content ${direction || ""}`}>
        {currentCard && (
          <div className={`carousel-card-wrapper ${isLocked ? "locked" : ""}`}>
            <InformationCard card={currentCard} accent="private" />
            {isLocked && <div className="card-locked-overlay">LOCKED</div>}
          </div>
        )}
      </div>

      {showPresentButton && currentCard && (
        <button
          className="present-btn"
          onClick={handlePresent}
          disabled={!canPresent}
        >
          {isPresented
            ? "Already Presented"
            : presentedCardIds.length >= maxPresented
              ? "Max Cards Presented"
              : "Present Card"}
        </button>
      )}

      {showPresentButton && (
        <p className="present-count">
          Presented: {presentedCardIds.length} / {maxPresented}
        </p>
      )}
    </div>
  );
}
