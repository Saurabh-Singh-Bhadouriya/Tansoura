import { useState, useEffect, useRef } from 'react';

const COLORS = {
  pending: '#CCCCCC',
  progressBorder: '#999999',
  completed: '#0F9D58',
  ripple: 'rgba(153, 153, 153, 0.3)',
  transparent: 'transparent',
};

function AnimatedStroke({ startAnimation, strokeColor, strokeDuration, strokeLength, strokeWidth = 4 }) {
  const [progress, setProgress] = useState(0);
  const animRef = useRef(null);

  useEffect(() => {
    if (!startAnimation) return;
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const p = Math.min(elapsed / strokeDuration, 1);
      setProgress(p);
      if (p < 1) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [startAnimation, strokeDuration]);

  return (
    <svg width={strokeLength + 4} height={strokeWidth + 4} style={{ position: 'absolute', top: 0, left: 0 }}>
      <line
        x1={2} y1={strokeWidth / 2 + 2}
        x2={2 + (strokeLength * progress)} y2={strokeWidth / 2 + 2}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        style={{ transition: 'none' }}
      />
    </svg>
  );
}

function RippleEffect({ size = 24, rippleRadius = 20, rippleDuration = 600, rippleDelay = 400 }) {
  const [scale, setScale] = useState(0);
  const animRef = useRef(null);

  useEffect(() => {
    let running = true;
    const animate = () => {
      if (!running) return;
      // Scale up
      const start = performance.now();
      const grow = (now) => {
        if (!running) return;
        const elapsed = now - start;
        const p = Math.min(elapsed / rippleDuration, 1);
        setScale(p);
        if (p < 1) animRef.current = requestAnimationFrame(grow);
        else {
          // Wait then shrink
          setTimeout(() => {
            if (!running) return;
            const shrinkStart = performance.now();
            const shrink = (now) => {
              if (!running) return;
              const e = now - shrinkStart;
              const p = Math.max(1 - Math.min(e / 200, 1), 0);
              setScale(p);
              if (p > 0) animRef.current = requestAnimationFrame(shrink);
              else {
                setTimeout(() => { if (running) animRef.current = requestAnimationFrame(animate); }, rippleDelay);
              }
            };
            animRef.current = requestAnimationFrame(shrink);
          }, 500);
        }
      };
      animRef.current = requestAnimationFrame(grow);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { running = false; if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [rippleDuration, rippleDelay]);

  return (
    <div style={{
      width: size + rippleRadius * 2,
      height: size + rippleRadius * 2,
      borderRadius: '50%',
      backgroundColor: `rgba(153, 153, 153, ${0.3 * (1 - scale)})`,
      position: 'absolute',
      top: -(rippleRadius),
      left: -(rippleRadius),
      transform: `scale(${1 + scale * 0.5})`,
      pointerEvents: 'none',
    }} />
  );
}

export default function OrderTrackList({
  data = [],
  completedIndex = -1,
  horizontal = false,
  completedComponent,
  pendingComponent,
  renderItem,
  strokeDuration = 800,
  strokeCompletedColor = COLORS.completed,
  strokePendingColor = COLORS.pending,
  componentSize = 24,
  enableRipple = true,
}) {
  const [animIndex, setAnimIndex] = useState(-1);

  useEffect(() => {
    if (animIndex > completedIndex) {
      setAnimIndex(completedIndex);
    }
  }, [completedIndex, animIndex]);

  useEffect(() => {
    if (completedIndex === -1 || completedIndex > data.length || animIndex >= completedIndex) return;
    const next = animIndex + 1;
    const timer = setTimeout(() => {
      setAnimIndex(next);
    }, next !== 0 ? strokeDuration : 0);
    return () => clearTimeout(timer);
  }, [completedIndex, data.length, animIndex, strokeDuration]);

  if (horizontal) {
    return (
      <div className="otl-horizontal">
        <div className="otl-horizontal-track">
          {data.map((_, index) => {
            const isCompleted = completedIndex !== -1 && completedIndex >= index;
            const isProgress = completedIndex + 1 === index;
            const isAnimComplete = animIndex >= index;
            const showRipple = isProgress && enableRipple;

            return (
              <div key={index} className="otl-h-item" style={{ alignItems: 'center', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  {/* Node */}
                  <div style={{ position: 'relative' }}>
                    {showRipple && <RippleEffect size={componentSize} />}
                    {isCompleted && isAnimComplete ? (
                      completedComponent ? completedComponent(index) : (
                        <div style={{
                          width: componentSize, height: componentSize, borderRadius: '50%',
                          backgroundColor: COLORS.completed, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', color: 'white', fontSize: componentSize * 0.5, fontWeight: 'bold',
                          boxShadow: '0 2px 6px rgba(15, 157, 88, 0.4)'
                        }}>✓</div>
                      )
                    ) : isProgress ? (
                      <div style={{
                        width: componentSize, height: componentSize, borderRadius: '50%',
                        border: `4px solid ${COLORS.progressBorder}`,
                        backgroundColor: COLORS.transparent,
                      }} />
                    ) : (
                      pendingComponent ? pendingComponent(index) : (
                        <div style={{
                          width: componentSize, height: componentSize, borderRadius: '50%',
                          backgroundColor: COLORS.pending,
                        }} />
                      )
                    )}
                  </div>
                  {/* Connecting line */}
                  {index < data.length - 1 && (
                    <div style={{ position: 'relative', width: 80, height: 4 }}>
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: COLORS.pending, borderRadius: 2,
                      }} />
                      {isCompleted && (
                        <div style={{
                          position: 'absolute', top: 0, left: 0, bottom: 0,
                          backgroundColor: COLORS.completed, borderRadius: 2,
                          transition: `width ${strokeDuration}ms ease`,
                          width: animIndex >= index ? '100%' : '0%',
                        }} />
                      )}
                    </div>
                  )}
                </div>
                {/* Item content below */}
                {renderItem && (
                  <div className="otl-h-content" style={{ marginTop: 4, textAlign: 'center', padding: '0 4px' }}>
                    {renderItem({ item: data[index], index })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Vertical layout
  return (
    <div className="otl-vertical">
      {data.map((item, index) => {
        const isCompleted = completedIndex !== -1 && completedIndex >= index;
        const isProgress = completedIndex + 1 === index;
        const isAnimComplete = animIndex >= index;
        const showRipple = isProgress && enableRipple;
        const isLast = index === data.length - 1;

        return (
          <div key={index} className="otl-v-item">
            <div className="otl-v-track" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Node */}
              <div style={{ position: 'relative', zIndex: 2 }}>
                {showRipple && <RippleEffect size={componentSize} />}
                {isCompleted && isAnimComplete ? (
                  completedComponent ? completedComponent(index) : (
                    <div style={{
                      width: componentSize, height: componentSize, borderRadius: '50%',
                      backgroundColor: COLORS.completed, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: 'white', fontSize: componentSize * 0.5, fontWeight: 'bold',
                      boxShadow: '0 2px 6px rgba(15, 157, 88, 0.4)'
                    }}>✓</div>
                  )
                ) : isProgress ? (
                  <div style={{
                    width: componentSize, height: componentSize, borderRadius: '50%',
                    border: `4px solid ${COLORS.progressBorder}`,
                    backgroundColor: COLORS.transparent,
                  }} />
                ) : (
                  pendingComponent ? pendingComponent(index) : (
                    <div style={{
                      width: componentSize, height: componentSize, borderRadius: '50%',
                      backgroundColor: COLORS.pending, transition: 'all 0.3s',
                    }} />
                  )
                )}
              </div>
              {/* Connecting line (vertical) */}
              {!isLast && (
                <div style={{ position: 'relative', width: 4, height: 50, margin: '4px 0' }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: COLORS.pending, borderRadius: 2,
                  }} />
                  {isCompleted && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0,
                      backgroundColor: COLORS.completed, borderRadius: 2,
                      transition: `height ${strokeDuration}ms ease`,
                      height: animIndex >= index ? '100%' : '0%',
                    }} />
                  )}
                </div>
              )}
            </div>
            {/* Item content to the right */}
            <div className="otl-v-content" style={{ flex: 1, paddingLeft: 16, paddingBottom: isLast ? 0 : 16 }}>
              {renderItem && renderItem({ item, index })}
            </div>
          </div>
        );
      })}
    </div>
  );
}