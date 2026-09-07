import { useState, useRef, useEffect, memo } from 'react';
import { Creator, Reel } from '../data/creators';
import { Plus, Check, X, Play, Volume2, VolumeX } from 'lucide-react';

const VIDEO_BASE = '/videos';

function resolveVideoSrc(videoUrl: string): string {
  if (!videoUrl) return '';
  if (videoUrl.startsWith('http')) return videoUrl;
  if (videoUrl.startsWith('/')) return videoUrl;
  return `${VIDEO_BASE}/${encodeURIComponent(videoUrl)}`;
}

function normalizeCreator(c: Creator): Creator {
  if (c.videoUrl && (!c.reels || c.reels.length === 0)) {
    return {
      ...c,
      reels: [{
        id: `${c.id}_reel0`,
        label: 'Demo Reel',
        videoUrl: c.videoUrl,
        views: c.avgViews,
      }],
    };
  }
  return c;
}

// ── ReelPlayer ────────────────────────────────────────────────
interface ReelPlayerProps {
  reel: Reel;
  autoPlay?: boolean;
  previewMode?: boolean;
}

function ReelPlayer({ reel, autoPlay = false, previewMode = false }: ReelPlayerProps) {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.defaultMuted = true;
    if (previewMode) {
      video.muted = isMuted;
    }

    if (!autoPlay) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch((err) => {
                console.log('Autoplay prevented:', err);
              });
            }
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, [autoPlay, isMuted, previewMode, reel.videoUrl]);

  const src = resolveVideoSrc(reel.videoUrl);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div 
      style={{ width: '100%', height: '100%', position: 'relative', cursor: 'pointer' }}
      onClick={togglePlay}
    >
      <style>{`
        video::-webkit-media-controls-start-playback-button {
          display: none !important;
          -webkit-appearance: none;
        }
      `}</style>
      <video
        ref={videoRef}
        key={src}
        src={src}
        controls={false}
        defaultMuted={previewMode ? true : undefined}
        muted={previewMode ? isMuted : undefined}
        loop
        playsInline
        preload="metadata"
        poster={reel.thumbnailUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000', pointerEvents: 'none' }}
      />
      {!isPlaying && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.5)',
          borderRadius: '50%',
          width: '48px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          pointerEvents: 'none',
          zIndex: 10
        }}>
          <Play size={24} fill="white" style={{ marginLeft: '4px' }} />
        </div>
      )}
      {previewMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsMuted(!isMuted);
          }}
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            background: 'rgba(0,0,0,0.6)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            cursor: 'pointer',
            zIndex: 20
          }}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      )}
    </div>
  );
}

// ── CreatorCard ────────────────────────────────────────────────
interface CreatorCardProps {
  creator: Creator;
  inCampaign: boolean;
  onToggleCampaign: (creator: Creator) => void;
  isAdminView?: boolean;
  onUpdateName?: (id: string, newName: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (creator: Creator) => void;
}

export const CreatorCard = memo(function CreatorCard({
  creator: rawCreator,
  inCampaign,
  onToggleCampaign,
  isAdminView = false,
  onUpdateName,
  onDelete,
  onEdit
}: CreatorCardProps) {
  const creator = normalizeCreator(rawCreator);
  const firstReel = creator.reels?.[0];

  const [followersStr] = useState(() => creator.followers);

  return (
    <>
      <div
        className={`cc ${inCampaign ? 'cc--selected' : ''}`}
        style={{ cursor: 'default' }}
      >
        {/* Thumbnail area */}
        <div className="cc__thumb">
          {firstReel?.videoUrl ? (
            <div className="cc__preview-wrapper" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
              <ReelPlayer reel={firstReel} autoPlay={true} previewMode={true} />
            </div>
          ) : (
            <div className="cc__thumb-placeholder">
              <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
                <path d="M1 1L19 12L1 23V1Z" fill="white" fillOpacity="0.5" />
              </svg>
            </div>
          )}

          {/* Admin: Edit badge */}
          {isAdminView && onEdit && (
            <button
              className="creator-card__edit-badge"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(creator);
              }}
              title="Edit Creator"
              style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255, 255, 255, 0.9)', color: '#111', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 10 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </button>
          )}

          {/* Admin: Delete badge */}
          {isAdminView && onDelete && (
            <button
              className="creator-card__delete-badge"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(creator.id);
              }}
              title="Delete Creator"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Info section */}
        <div className="cc__info">
          <div className="cc__name-row">
            <span className="cc__name">{creator.name}</span>
          </div>
          {isAdminView && (
            <div className="cc__stats-line">
              <span>{followersStr} followers</span>
            </div>
          )}
          {creator.niches && creator.niches.length > 0 && (
            <div
              style={{ marginTop: '6px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                style={{ 
                  display: 'flex', 
                  gap: '5px', 
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
                  paddingBottom: '2px',
                  msOverflowStyle: 'none',
                  scrollbarWidth: 'none'
                }}
              >
                {creator.niches.map((niche) => (
                  <span
                    key={niche}
                    style={{
                      background: '#f5f5f5',
                      color: '#555',
                      fontSize: '10px',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontWeight: 600,
                      letterSpacing: '0.2px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {niche}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA button */}
        <div className="cc__cta" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`cc__campaign-btn ${inCampaign ? 'cc__campaign-btn--added' : ''}`}
            onClick={() => onToggleCampaign(creator)}
          >
            {inCampaign ? (
              <>
                <Check size={13} strokeWidth={3} />
                <span>Added</span>
              </>
            ) : (
              <>
                <Plus size={13} strokeWidth={3} />
                <span>Add to Campaign</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}, (prev, next) => {
  return prev.creator.id === next.creator.id && 
         prev.inCampaign === next.inCampaign && 
         prev.isAdminView === next.isAdminView &&
         prev.onUpdateName === next.onUpdateName &&
         prev.onDelete === next.onDelete &&
         prev.onEdit === next.onEdit;
});
