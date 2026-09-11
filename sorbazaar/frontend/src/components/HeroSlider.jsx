import { useState, useEffect, useRef } from 'react';
import { sliders as slidersApi, mediaUrl } from '../api';
import { useRefreshKey } from '../context/DataRefreshContext';

export default function HeroSlider({ navPage = 'home' }) {
  const refreshKey = useRefreshKey();
  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);
  const videoRefs = useRef({});

  useEffect(() => {
    slidersApi.list(navPage).then(setSlides).catch(() => {});
  }, [navPage, refreshKey]);

  // Pause other videos when switching slides
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([idx, vid]) => {
      if (vid) {
        if (Number(idx) === current) {
          vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      }
    });
  }, [current, slides]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => setCurrent(c => (c + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;
  const slide = slides[current];
  const isVideo = !!slide.video;
  const mediaSrc = isVideo ? mediaUrl(slide.video) : mediaUrl(slide.image);

  return (
    <div className="hero-slider">
      <div className="hero-slide">
        {isVideo ? (
          <video
            ref={el => videoRefs.current[current] = el}
            className="hero-media"
            src={mediaSrc}
            autoPlay
            muted
            loop
            playsInline
            disablePictureInPicture
            webkit-playsinline="true"
            x5-playsinline="true"
            preload="metadata"
            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          />
        ) : (
          <div className="hero-media hero-bg" style={{ backgroundImage: `url(${mediaSrc})` }} />
        )}
        <div className="hero-content">
          <h1>{slide.title}</h1>
          <p>{slide.subtitle}</p>
          {slide.buttonText && slide.link && (
            <a href={slide.link} className="btn btn-primary">{slide.buttonText}</a>
          )}
        </div>
      </div>
      {slides.length > 1 && (
        <div className="slider-dots">
          {slides.map((_, i) => (
            <button key={i} className={`slider-dot ${i === current ? 'active' : ''}`} onClick={() => setCurrent(i)} />
          ))}
        </div>
      )}
    </div>
  );
}
