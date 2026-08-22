"use client";

import { useEffect, useRef, useState } from "react";
import { howItWorks } from "./data";

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const totalSteps = howItWorks.length;
  const currentStep = howItWorks[activeStep];

  useEffect(() => {
    const observer = new IntersectionObserver(
      () => {
        const readingLine = window.innerHeight * 0.42;
        const closestStep = stepRefs.current
          .map((element, index) => {
            if (!element) return null;

            const rect = element.getBoundingClientRect();
            const isInReadingArea = rect.bottom > window.innerHeight * 0.28 && rect.top < window.innerHeight * 0.62;

            return isInReadingArea
              ? { index, distance: Math.abs(rect.top + rect.height / 2 - readingLine) }
              : null;
          })
          .filter((step): step is { index: number; distance: number } => step !== null)
          .sort((a, b) => a.distance - b.distance)[0];

        if (closestStep) setActiveStep(closestStep.index);
      },
      { rootMargin: "-28% 0px -38% 0px", threshold: 0 },
    );

    stepRefs.current.forEach((step) => step && observer.observe(step));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="section how-section" id="how-it-works" aria-labelledby="how-title">
      <div className="how-intro"><span className="eyebrow">The operating sequence</span><h2 id="how-title">A decision trail<br />you can follow.</h2></div>
      <div className="how-layout">
        <aside className="how-sticky" aria-label={`Workflow progress: current step ${currentStep.number} of ${totalSteps}`}>
          <p>Every request moves through a single, legible chain: rules first, proof second, settlement last.</p>
          <div className="how-sticky__dial"><span>06</span><small>steps to a<br />final decision</small></div>
          <div className="how-sticky__current"><span>Current step</span><strong>{currentStep.number} / {String(totalSteps).padStart(2, "0")}</strong></div>
          <div className="how-sticky__line" aria-hidden="true"><i style={{ transform: `scaleY(${(activeStep + 1) / totalSteps})` }} /></div>
        </aside>
        <div className="how-steps">
          {howItWorks.map((step, index) => {
            const status = index === activeStep ? "active" : index < activeStep ? "complete" : "upcoming";

            return (
            <article
              className={`how-step how-step--${status}`}
              key={step.number}
              ref={(element) => { stepRefs.current[index] = element; }}
              aria-current={status === "active" ? "step" : undefined}
            >
              <span className="how-step__number">{step.number}</span>
              <div><h3>{step.title}</h3><p>{step.description}</p></div>
              <span className="how-step__progress" aria-hidden="true"><i>{status === "complete" ? "✓" : ""}</i></span>
              <span className="how-step__status">{status === "active" ? "Current step" : status === "complete" ? "Completed step" : "Upcoming step"}</span>
            </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
