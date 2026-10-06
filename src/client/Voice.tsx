import { useEffect, useRef, useState } from "react";
import type { Room as AudioRoom } from "livekit-client";
import type { Receipt, Snapshot } from "../shared/types";

export function Voice({
  snapshot: s,
  send,
}: {
  snapshot: Snapshot;
  send: (event: string, data?: unknown) => Promise<Receipt>;
}) {
  const [status, setStatus] = useState("off"),
    [error, setError] = useState(""),
    [speakers, setSpeakers] = useState<string[]>([]);
  const [holding, setHolding] = useState(false),
    [openMic, setOpenMic] = useState(false),
    [deafened, setDeafened] = useState(false);
  const room = useRef<AudioRoom | null>(null),
    audioBox = useRef<HTMLDivElement>(null),
    mounted = useRef(true),
    busy = useRef(false);
  const wanted = useRef(false),
    allowed = useRef(false),
    generation = useRef(0),
    micQueue = useRef(Promise.resolve());
  const soundMuted = useRef(false);
  const listeningAllowed = [
    "lobby",
    "discuss",
    "reveal",
    "finished",
    "paused",
  ].includes(s.phase);
  soundMuted.current = deafened || !listeningAllowed;
  allowed.current = !!s.voice?.speakingAllowed && !s.voice?.unavailableReason;
  function microphone(value: boolean) {
    wanted.current = value && allowed.current;
    setHolding(wanted.current);
    micQueue.current = micQueue.current
      .catch(() => {})
      .then(async () => {
        const active = room.current;
        if (!active) return;
        const enable =
          wanted.current &&
          allowed.current &&
          active.localParticipant.permissions?.canPublish === true;
        try {
          await active.localParticipant.setMicrophoneEnabled(enable, {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          });
          if (enable && (!wanted.current || !allowed.current))
            await active.localParticipant.setMicrophoneEnabled(false);
        } catch {
          wanted.current = false;
          setHolding(false);
          setOpenMic(false);
          if (mounted.current)
            setError(
              "Your microphone could not start. Check browser permission, or keep listening.",
            );
        }
      });
  }
  async function disconnect(notify = true) {
    generation.current++;
    wanted.current = false;
    setHolding(false);
    setOpenMic(false);
    setSpeakers([]);
    const active = room.current;
    room.current = null;
    if (active) await active.disconnect(true).catch(() => {});
    audioBox.current?.replaceChildren();
    if (mounted.current) setStatus("off");
    if (notify) void send("voice-leave");
  }
  async function connect() {
    if (busy.current) return;
    busy.current = true;
    const mine = ++generation.current;
    setError("");
    setStatus("connecting");
    try {
      const { Room, RoomEvent, Track } = await import("livekit-client");
      const receipt = await send("voice-join");
      if (!receipt.ok || !receipt.voice)
        throw new Error("Voice could not connect.");
      if (mine !== generation.current || !mounted.current) return;
      const active = new Room({
        adaptiveStream: true,
        disconnectOnPageLeave: true,
      });
      room.current = active;
      active.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const audio = track.attach();
          audio.autoplay = true;
          audio.muted = soundMuted.current;
          audio.dataset.voice = "true";
          audioBox.current?.append(audio);
        }
      });
      active.on(RoomEvent.TrackUnsubscribed, (track) =>
        track.detach().forEach((el) => el.remove()),
      );
      active.on(RoomEvent.ActiveSpeakersChanged, (people) =>
        setSpeakers(people.map((p) => p.identity)),
      );
      active.on(RoomEvent.Reconnecting, () => {
        microphone(false);
        setOpenMic(false);
        setStatus("reconnecting");
      });
      active.on(RoomEvent.Reconnected, () => {
        setStatus("joined");
        void send("voice-ready");
      });
      active.on(RoomEvent.Disconnected, () => {
        if (room.current === active) {
          room.current = null;
          wanted.current = false;
          setHolding(false);
          setOpenMic(false);
          setSpeakers([]);
          setStatus("off");
          void send("voice-leave");
        }
      });
      active.on(RoomEvent.ParticipantPermissionsChanged, () => {
        if (!active.localParticipant.permissions?.canPublish) {
          microphone(false);
          setOpenMic(false);
        }
      });
      await active.connect(receipt.voice.url, receipt.voice.token, {
        autoSubscribe: true,
      });
      if (mine !== generation.current || !mounted.current) {
        await active.disconnect();
        return;
      }
      const ready = await send("voice-ready");
      if (!ready.ok) throw new Error("Voice is not ready.");
      await active.startAudio();
      setStatus("joined");
    } catch {
      await disconnect();
      if (mounted.current)
        setError(
          "Voice could not connect. Retry when the connection is ready; clue cards and text still work.",
        );
    } finally {
      busy.current = false;
    }
  }
  useEffect(() => {
    mounted.current = true;
    const quiet = () => {
      microphone(false);
      setOpenMic(false);
    };
    const hidden = () => {
      if (document.hidden) quiet();
    };
    const panel = audioBox.current?.closest("details");
    const collapsed = () => {
      if (panel && !panel.open) quiet();
    };
    window.addEventListener("blur", quiet);
    document.addEventListener("visibilitychange", hidden);
    panel?.addEventListener("toggle", collapsed);
    return () => {
      mounted.current = false;
      window.removeEventListener("blur", quiet);
      document.removeEventListener("visibilitychange", hidden);
      panel?.removeEventListener("toggle", collapsed);
      void disconnect();
    };
  }, []);
  useEffect(() => {
    if (!s.voice?.speakingAllowed || s.voice.unavailableReason) {
      microphone(false);
      setOpenMic(false);
    }
    if (!s.voice?.enabled || !["player", "facilitator"].includes(s.role))
      void disconnect();
  }, [
    s.voice?.speakingAllowed,
    s.voice?.enabled,
    s.voice?.unavailableReason,
    s.role,
  ]);
  useEffect(() => {
    audioBox.current?.querySelectorAll("audio").forEach((el) => {
      el.muted = soundMuted.current;
    });
  }, [deafened, listeningAllowed, status, speakers]);
  const eligible = ["player", "facilitator"].includes(s.role),
    joined = status === "joined";
  if (!s.voice?.enabled) return null;
  const reason = !window.isSecureContext
    ? "Voice needs a secure address. Open this game over HTTPS, or use localhost on the host computer."
    : !s.voice.available
      ? s.voice.unavailableReason
      : !eligible
        ? "Spectators and shared displays use text and clue cards."
        : s.voice.hostMuted
          ? "The host has muted your microphone. You can still listen."
          : !s.voice.speakingAllowed
            ? "Quiet recall. Voice reopens during discussion and the reveal."
            : s.voice.unavailableReason;
  return (
    <section className="voice-panel" aria-label="Room voice">
      <div className="sidebar-heading">
        <h3>Room voice</h3>
        <span className="status-pill">
          {joined
            ? holding
              ? "Speaking"
              : "Listening"
            : status === "off"
              ? "Optional"
              : status}
        </span>
      </div>
      <p className="muted">
        {reason || "Share your clues here. A microphone is never required."}
      </p>
      <div ref={audioBox} hidden aria-hidden="true" />
      {!room.current ? (
        <button
          className="secondary full"
          disabled={
            !window.isSecureContext ||
            !s.voice.available ||
            !eligible ||
            status === "connecting"
          }
          onClick={() => void connect()}
        >
          Join voice
        </button>
      ) : (
        <>
          <button
            className={`primary full talk-button ${holding ? "talking" : ""}`}
            disabled={!joined || !allowed.current}
            onPointerDown={(e) => {
              if (!openMic) {
                e.currentTarget.setPointerCapture(e.pointerId);
                microphone(true);
              }
            }}
            onPointerUp={() => {
              if (!openMic) microphone(false);
            }}
            onPointerCancel={() => {
              if (!openMic) microphone(false);
            }}
            onKeyDown={(e) => {
              if (e.code === "Space" && !e.repeat && !openMic) {
                e.preventDefault();
                microphone(true);
              }
            }}
            onKeyUp={(e) => {
              if (e.code === "Space" && !openMic) {
                e.preventDefault();
                microphone(false);
              }
            }}
            onClick={() => {
              if (openMic) microphone(!wanted.current);
            }}
          >
            {openMic
              ? holding
                ? "Mute microphone"
                : "Unmute microphone"
              : holding
                ? "Talking… release to mute"
                : "Hold to talk"}
          </button>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={openMic}
              disabled={!allowed.current}
              onChange={(e) => {
                microphone(false);
                setOpenMic(e.target.checked);
              }}
            />{" "}
            Use a microphone toggle
          </label>
          <div className="button-row">
            <button
              className="text-button"
              aria-pressed={deafened}
              onClick={() => setDeafened((d) => !d)}
            >
              {deafened ? "Sound on" : "Sound off"}
            </button>
            <button className="text-button" onClick={() => void disconnect()}>
              Leave voice
            </button>
          </div>
        </>
      )}
      {speakers.length > 0 && s.voice.speakingAllowed && (
        <p className="voice-speakers" aria-live="polite">
          Speaking:{" "}
          {s.players
            .filter((p) => speakers.includes(p.id))
            .map((p) => p.name)
            .join(", ")}
        </p>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {s.isHost && s.voice.available && (
        <details>
          <summary>Host microphone controls</summary>
          {s.players
            .filter(
              (p) => p.connected && ["player", "facilitator"].includes(p.role),
            )
            .map((p) => {
              const muted = s.voice!.mutedIds.includes(p.id);
              return (
                <div className="voice-person" key={p.id}>
                  <span>{p.name}</span>
                  <button
                    className="small-button"
                    onClick={() =>
                      void send("voice-mute", { id: p.id, muted: !muted })
                    }
                  >
                    {muted ? "Allow microphone" : "Mute microphone"}
                  </button>
                </div>
              );
            })}
        </details>
      )}
    </section>
  );
}
