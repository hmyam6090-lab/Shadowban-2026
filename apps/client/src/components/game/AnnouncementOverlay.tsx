import { useEffect, useState } from "react";
import { useAppStore } from "../../stores/appStore";
import { GamePhase } from "@shadowban/shared";
import { PrimedAnnouncement } from "./PrimedAnnouncement";

export function AnnouncementOverlay() {
  const publicState = useAppStore((s) => s.publicState);
  const privateState = useAppStore((s) => s.privateState);
  const session = useAppStore((s) => s.session);

  const [seenPublicIds, setSeenPublicIds] = useState<string[]>([]);
  const [activeAnnouncements, setActiveAnnouncements] = useState<any[]>([]);
  const [pendingEcho, setPendingEcho] = useState<any[]>([]);
  const [shownPrivate, setShownPrivate] = useState({
    shadowban: false,
    muted: false,
  });

  // Watch public announcements
  useEffect(() => {
    if (!publicState || !publicState.publicAnnouncements) return;
    for (const ann of publicState.publicAnnouncements) {
      if (!seenPublicIds.includes(ann.id)) {
        setSeenPublicIds((s) => [...s, ann.id]);
        // If it's an echo chamber announcement but discussion hasn't started, defer it
        if (
          ann.type === "echo_chamber" &&
          publicState.phase !== GamePhase.DISCUSSION
        ) {
          setPendingEcho((p) => [...p, ann]);
          continue;
        }

        // Otherwise show immediately
        setActiveAnnouncements((a) => [...a, ann]);
        const duration = ann.type === "echo_chamber" ? 30000 : 5000;
        setTimeout(() => {
          setActiveAnnouncements((cur) => cur.filter((c) => c.id !== ann.id));
        }, duration);
      }
    }
  }, [publicState, seenPublicIds]);

  // When phase becomes DISCUSSION, promote any pending echo chamber announcements
  useEffect(() => {
    if (!publicState) return;
    if (publicState.phase === GamePhase.DISCUSSION && pendingEcho.length > 0) {
      for (const ann of pendingEcho) {
        setActiveAnnouncements((a) => [...a, ann]);
        setTimeout(() => {
          setActiveAnnouncements((cur) => cur.filter((c) => c.id !== ann.id));
        }, 30000);
      }
      setPendingEcho([]);
    }
  }, [publicState, pendingEcho]);

  // Show private overlays for shadowban / muted
  useEffect(() => {
    if (!privateState || !session) return;
    if (privateState.shadowbanned && !shownPrivate.shadowban) {
      setActiveAnnouncements((a) => [
        ...a,
        {
          id: "private-shadowban",
          message: "You have been shadowbanned.",
          type: "shadowban",
        },
      ]);
      setShownPrivate((s) => ({ ...s, shadowban: true }));
      setTimeout(() => {
        setActiveAnnouncements((cur) =>
          cur.filter((c) => c.id !== "private-shadowban"),
        );
      }, 5000);
    }

    if (
      (privateState.mutedNextRound || privateState.muted) &&
      !shownPrivate.muted
    ) {
      setActiveAnnouncements((a) => [
        ...a,
        {
          id: "private-muted",
          message: "You have been muted for next round.",
          type: "ability_used",
        },
      ]);
      setShownPrivate((s) => ({ ...s, muted: true }));
      setTimeout(() => {
        setActiveAnnouncements((cur) =>
          cur.filter((c) => c.id !== "private-muted"),
        );
      }, 5000);
    }
  }, [privateState, shownPrivate, session]);

  if (activeAnnouncements.length === 0) return null;

  return (
    <>
      {activeAnnouncements.map((ann) => (
        <PrimedAnnouncement
          key={ann.id}
          message={ann.message}
          duration={ann.type === "echo_chamber" ? 30000 : 5000}
        />
      ))}
    </>
  );
}
