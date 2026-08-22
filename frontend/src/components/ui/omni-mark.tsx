import Link from "next/link";

type OmniMarkProps = {
  href?: string;
  inverse?: boolean;
  compact?: boolean;
};

export function OmniMark({ href = "/", inverse = false, compact = false }: OmniMarkProps) {
  const content = (
    <>
      <span className={`omni-symbol${inverse ? " omni-symbol--inverse" : ""}`} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {!compact && <span className="omni-wordmark">OmniMandate</span>}
    </>
  );

  return (
    <Link className={`omni-mark${inverse ? " omni-mark--inverse" : ""}`} href={href} aria-label="OmniMandate home">
      {content}
    </Link>
  );
}
